"""Offline layout check; original cover fixture and real fit.js DOM fallback.
Run: python For-AI/tests/verify_presentation_panels.py --cover FIRST_SLIDE.png
Requires Playwright, a Chromium installation, and Python qrcode.
Does not certify live Pretext, VDO.Ninja or physical phone scanning.
"""
import argparse
import base64
import io
import json
import re
from pathlib import Path
import qrcode
import qrcode.image.svg
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--cover', type=Path, required=True)
parser.add_argument('--executable', help='Optional Chromium executable path')
args = parser.parse_args()
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4)
qr.add_data('https://creations-of-ra.com/presentations/controller/')
qr.make(fit=True)
buffer = io.BytesIO()
qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(buffer)
svg = buffer.getvalue().decode().replace('<path ', '<rect width="100%" height="100%" fill="white"/><path ', 1)
transport = '''
export const controllerURL=()=>'/presentations/controller/';
export async function drawQR(el){el.innerHTML=SVG;}
export async function connectViewer(fn){window.__deliver=fn;return{close:async()=>{},send:()=>{}};}
'''.replace('SVG', json.dumps(svg))
image = 'data:image/png;base64,' + base64.b64encode(args.cover.read_bytes()).decode()
deck = "export const loadPublishedDeck=async()=>({width:1600,height:900,slides:[{layers:[{kind:'image',src:" + json.dumps(image) + "}]}]});"
view = "export function createView(){return{show(){},setInteractive(){},currentMedia(){return[]},apply(){}};}"

def module_url(source):
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode()).decode()

fit = (ROOT/'assets/js/fit.js').read_text(encoding='utf-8').replace(
    'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.9/dist/layout.js',
    'data:text/javascript,throw new Error("Offline test: Pretext CDN unavailable")')
script = (ROOT/'presentations/landing.js').read_text(encoding='utf-8')
for path, source in [('/assets/js/fit.js', fit), ('./deck.js?v=control9', deck),
                     ('./view.js?v=control8', view), ('./transport.js?v=min6', transport)]:
    script = script.replace("'" + path + "'", json.dumps(module_url(source)))
html = (ROOT/'presentations/index.html').read_text(encoding='utf-8')
html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S)
html = re.sub(r'<link[^>]*rel="stylesheet"[^>]*>', '', html)
css = (ROOT/'styles.css').read_text(encoding='utf-8') + '\n' + (ROOT/'presentations/player.css').read_text(encoding='utf-8')
html = html.replace('</head>', '<style>' + css + '</style></head>')
errors, checks = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, **({'executable_path': args.executable} if args.executable else {}))
    for width in [320, 390, 768, 1024, 1100, 1440, 1920]:
        page = browser.new_page(viewport={'width': width, 'height': 950})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(html)
        page.add_script_tag(type='module', content=script)
        page.wait_for_function("document.querySelector('#cover').naturalWidth>0 && !document.querySelector('#cover').hidden && !!document.querySelector('[data-fit]').dataset.fitted")
        page.wait_for_timeout(200)
        result = page.evaluate('''() => {
          const left=document.querySelector('.presentation-preview').getBoundingClientRect();
          const right=document.querySelector('.controller-qr').getBoundingClientRect();
          return {width:innerWidth, overflow:document.documentElement.scrollWidth>innerWidth,
            aligned:Math.abs(left.y-right.y)<1 && Math.abs(left.height-right.height)<1,
            stacked:right.y>left.bottom, inverted:getComputedStyle(document.querySelector('#controller-qr svg')).filter==='invert(1)',
            text:[...document.querySelectorAll('[data-fit]')].every(e=>e.dataset.fitted==='dom-fallback' && e.dataset.truncated==='false' && e.firstElementChild.scrollHeight<=e.clientHeight+1 && e.firstElementChild.scrollWidth<=e.clientWidth+1)};
        }''')
        assert not result['overflow'] and result['inverted'] and result['text'], result
        assert result['aligned'] if width >= 1040 else result['stacked'], result
        page.evaluate("window.__deliver({type:'state',version:1,index:0,media:[],fullscreen:false,sentAt:Date.now()},'fixture')")
        assert page.locator('#idle').is_hidden() and page.locator('#live').is_visible()
        assert page.locator('#live button:visible').count() == 0
        page.evaluate("window.__deliver({type:'ended'},'fixture')")
        assert page.locator('#idle').is_visible() and page.locator('#live').is_hidden()
        checks.append(result)
        page.close()
    assert not errors, errors
    browser.close()
print(json.dumps({'mode':'offline fixtures, production DOM fallback', 'checks':checks, 'pageErrors':errors}, indent=2))
