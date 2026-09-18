#!/usr/bin/env python3
"""Offline browser regression for viewer-first presentation behavior.
Runs production player/controller/view code with in-memory transport and fitting doubles.
This is NOT a VDO.Ninja network, physical QR/phone or real Pretext integration test.
Requires Playwright, Pillow, a Chromium executable and converted assets/beyond-the-line/deck.json.
"""
from pathlib import Path
import argparse, base64, io, json, re, shutil
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
FIT = "const fitAll=()=>Promise.resolve();const setFitText=(box,text)=>{box.firstElementChild.textContent=text;};"
TRANSPORT = """
const randomId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const browserInvite=()=>parent.__invite;
const readInvite=()=>window.__role==='host'?null:parent.__invite;
const rememberInvite=()=>{};
const inviteURL=()=> 'about:blank#viewer';
const displayURL=()=> 'about:blank#host=1';
const drawQR=()=>Promise.resolve();
const loadPublishedDeck=()=>Promise.resolve(structuredClone(parent.__deck));
const importPowerPoint=()=>Promise.reject(new Error('Not part of offline fixture'));
async function connect(invite,role,receive,connected){
 const uuid=randomId(),peers=parent.__peers,entry={uuid,role,receive,connected};peers[uuid]=entry;window.__peer=entry;
 for(const other of Object.values(peers))if(other.uuid!==uuid&&(other.role==='host'||role==='host'))setTimeout(()=>{connected('open',other.uuid);other.connected('open',uuid);},0);
 return {send(data,target){entry.last=data;for(const other of Object.values(peers)){if(other.uuid===uuid)continue;if(target?other.uuid===target:(role==='host'||other.role==='host'))setTimeout(()=>other.receive(structuredClone(data),uuid),0);}},async close(){delete peers[uuid];for(const other of Object.values(peers))other.connected('closed',uuid);}};
}
"""

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--executable', default=shutil.which('chromium') or shutil.which('chrome'))
    parser.add_argument('--offline', action='store_true', help='Compatibility flag: this test is always explicitly offline.')
    args = parser.parse_args()
    manifest = ROOT / 'assets/beyond-the-line/deck.json'
    if not manifest.exists():
        raise SystemExit('Convert the supplied PPTX with For-AI/scripts/import_presentation.py before running the media test. No PASS recorded.')
    deck = json.loads(manifest.read_text()); deck['source'] = 'published'
    assets = {}
    for slide in deck['slides']:
        for layer in slide['layers']:
            for key in ['src', 'poster']:
                path = layer[key]
                if path not in assets:
                    data = (ROOT / path.lstrip('/')).read_bytes()
                    if path.endswith('.png'):
                        image = Image.open(io.BytesIO(data)).convert('RGB'); image.thumbnail((1100, 650))
                        buffer = io.BytesIO(); image.save(buffer, format='JPEG', quality=80)
                        data, mime = buffer.getvalue(), 'image/jpeg'
                    else:
                        mime = 'video/mp4'
                    assets[path] = 'data:' + mime + ';base64,' + base64.b64encode(data).decode()
                layer[key] = assets[path]
    css = (ROOT / 'styles.css').read_text() + '\n' + (ROOT / 'presentations/player.css').read_text()
    renderer = (ROOT / 'presentations/view.js').read_text().replace('export function', 'function')
    def html(path):
        value = (ROOT / path).read_text()
        value = re.sub(r'<script\b[^>]*>.*?</script>', '', value, flags=re.S)
        value = re.sub(r'<link\b[^>]*>', '', value)
        return value.replace('</head>', '<style>' + css + '</style></head>')
    results, errors = [], []
    output = ROOT / 'For-AI/verification'; output.mkdir(exist_ok=True)
    with sync_playwright() as p:
        launch = {'headless': True}
        if args.executable: launch['executable_path'] = args.executable
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={'width': 1440, 'height': 950})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content('<body style="margin:0"><iframe name="host" allowfullscreen style="border:0;width:1440px;height:900px"></iframe><iframe name="phone" allowfullscreen style="width:390px;height:844px"></iframe><iframe name="audience" allowfullscreen style="width:1024px;height:768px"></iframe></body>')
        page.evaluate('(deck)=>{window.__deck=deck;window.__peers={};window.__invite={room:"fixture",stream:"fixture",session:"a".repeat(32)};}', deck)
        def setup(name, path, js):
            frame = page.frame(name=name); frame.set_content(html(path))
            frame.evaluate('(role)=>window.__role=role', name)
            script = re.sub(r'^import .*?;\n', '', (ROOT / js).read_text(), flags=re.M)
            frame.add_script_tag(content=FIT + '\n' + renderer + '\n' + TRANSPORT + '\n' + script)
            return frame
        host = setup('host', 'presentations/beyond-the-line/index.html', 'presentations/player.js')
        host.wait_for_function("document.querySelector('#counter').textContent==='1 / 16'")
        assert host.locator('#pair svg').count() == 1
        assert not host.locator('#local-controls').is_visible()
        assert not host.locator('#show-controls').is_checked()
        host.evaluate("document.querySelector('#next').dispatchEvent(new Event('click'))")
        page.wait_for_timeout(100); assert host.locator('#counter').inner_text() == '1 / 16'
        host.locator('#show-controls').check(); host.locator('#slide-select').select_option('4')
        host.locator('#play').click()
        host.wait_for_function("[...document.querySelectorAll('video')].some(v=>!v.paused&&v.currentTime>.1)")
        host.locator('#play').click(); host.locator('#slide-select').select_option('1')
        phone = setup('phone', 'presentations/controller/index.html', 'presentations/controller.js')
        audience = setup('audience', 'presentations/controller/index.html', 'presentations/controller.js')
        for frame in [phone, audience]:
            frame.wait_for_function("document.querySelector('#remote-counter').textContent==='2 / 16'")
            assert not frame.locator('#control-panel').is_visible()
            assert not frame.locator('#show-controls').is_checked()
        results.append('Display and two synchronized viewer documents start with controls off')
        host.locator('#fullscreen').click(); page.wait_for_timeout(150)
        assert host.evaluate("Boolean(document.fullscreenElement)||document.querySelector('#player').classList.contains('cinema')")
        assert not host.locator('#local-controls').is_visible()
        phone.evaluate("()=>{document.querySelector('#show-controls').checked=true;document.querySelector('#show-controls').dispatchEvent(new Event('change'));document.querySelector('#name').value='Ra';document.querySelector('#join-form').dispatchEvent(new Event('submit',{cancelable:true}));}")
        page.wait_for_timeout(150); assert not host.locator('#approve-dialog').is_visible()
        host.evaluate("async()=>{if(document.fullscreenElement)await document.exitFullscreen();else{document.querySelector('#player').classList.remove('cinema');document.dispatchEvent(new Event('fullscreenchange'));}}")
        host.wait_for_function("document.querySelector('#approve-dialog').open"); host.locator('#approve').click()
        phone.wait_for_function("document.querySelector('#role').textContent==='Presenter'")
        assert host.locator('#show-controls').is_disabled()
        assert not host.locator('#local-controls').is_visible()
        audience.evaluate("()=>{document.querySelector('#show-controls').checked=true;document.querySelector('#show-controls').dispatchEvent(new Event('change'));}")
        assert audience.locator('[data-command=next]').is_disabled()
        results.append('Fullscreen is clean; approval is deferred; approved phone locks other controls')
        audience.evaluate("()=>{const h=Object.values(parent.__peers).find(p=>p.role==='host');h.receive({type:'command',action:'last',seq:100,grant:'invalid'},window.__peer.uuid);}")
        host.evaluate("document.querySelector('#next').dispatchEvent(new Event('click'))")
        page.wait_for_timeout(100); assert host.locator('#counter').inner_text() == '2 / 16'
        phone.evaluate("document.querySelector('[data-command=next]').click()")
        for frame, selector in [(host, 'counter'), (phone, 'remote-counter'), (audience, 'remote-counter')]:
            frame.wait_for_function(f"document.querySelector('#{selector}').textContent==='3 / 16'")
        phone.evaluate("()=>{const h=Object.values(parent.__peers).find(p=>p.role==='host');h.receive(window.__peer.last,window.__peer.uuid);}")
        page.wait_for_timeout(100); assert host.locator('#counter').inner_text() == '3 / 16'
        results.append('Only approved controller advances every view; replay/unapproved/local commands rejected')
        for value in [4, 5]:
            phone.evaluate("document.querySelector('[data-command=next]').click()")
            phone.wait_for_function(f"document.querySelector('#remote-counter').textContent==='{value} / 16'")
        phone.evaluate("document.querySelector('#remote-play').click()")
        for frame in [host, audience]:
            frame.wait_for_function("[...document.querySelectorAll('video')].some(v=>!v.paused&&v.currentTime>.1)")
        phone.evaluate("document.querySelector('#remote-play').click()")
        host.wait_for_function("[...document.querySelectorAll('video')].every(v=>v.paused)")
        results.append('Embedded MP4 playback follows controller state')
        host.locator('#fullscreen').click(); page.wait_for_timeout(200)
        assert not host.locator('#local-controls').is_visible()
        page.screenshot(path=str(output / 'fullscreen-viewer-only.png'))
        phone.evaluate("document.querySelector('[data-command=fullscreen]').click()")
        host.wait_for_function('!document.fullscreenElement')
        for expected in [True, False]:
            phone.evaluate("document.querySelector('[data-command=blackout]').click()")
            for frame, selector in [(host, 'blank-screen'), (phone, 'viewer-blackout'), (audience, 'viewer-blackout')]:
                frame.wait_for_function(f"document.querySelector('#{selector}').hidden==={str(not expected).lower()}")
        phone.evaluate("document.querySelector('#leave').click()")
        phone.wait_for_function("document.querySelector('#role').textContent==='Viewer'")
        assert not host.locator('#show-controls').is_checked()
        assert not host.locator('#show-controls').is_disabled()
        assert not phone.locator('#control-panel').is_visible()
        results.append('Fullscreen exit, shared blackout and release-to-viewer pass')
        assert not errors, errors
        browser.close()
    report = {'status': 'passed', 'mode': 'offline application test with transport/fitting doubles', 'checks': results, 'pageErrors': errors, 'notVerified': ['VDO.Ninja signaling', 'physical phones/QR scan', 'public PPTX upload', 'real Pretext CDN', 'network-context copied-link ownership']}
    (output / 'offline-viewer-report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

if __name__ == '__main__': main()
