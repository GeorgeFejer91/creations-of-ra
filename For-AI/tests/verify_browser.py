#!/usr/bin/env python3
"""Run Chromium rendering and presenter application tests. --offline uses explicit doubles."""
import argparse
import functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--offline',action='store_true');p.add_argument('--executable');p.add_argument('--screenshots',type=Path,default=ROOT/'For-AI/verification');args=p.parse_args();args.screenshots.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
report={'mode':'offline application doubles' if args.offline else 'live dependencies','checks':[],'not_verified':['physical iOS/Android phones','real-network QR scan and WebRTC'] if args.offline else ['physical iOS/Android phones']}
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,**({'executable_path':args.executable} if args.executable else {}))
    context=browser.new_context()
    if args.offline:
        def route(r):
            url=r.request.url
            if '@chenglou/pretext' in url:r.fulfill(path=str(ROOT/'For-AI/tests/pretext-double.js'),content_type='text/javascript')
            elif '@vdoninja/sdk' in url:r.fulfill(path=str(ROOT/'For-AI/tests/transport-double.js'),content_type='text/javascript')
            elif 'qrcode-generator' in url:r.fulfill(body="window.qrcode=()=>({addData(){},make(){},createSvgTag(){return '<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"><text x=\"4\" y=\"50\" fill=\"black\">TEST QR DOUBLE</text></svg>';}});",content_type='text/javascript')
            else:r.abort()
        context.route('https://cdn.jsdelivr.net/**',route)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':1000});page.goto(base,wait_until='networkidle');page.wait_for_function("document.documentElement.dataset.pretext==='ready'")
        result=page.evaluate("""() => ({horizontal:document.documentElement.scrollWidth>innerWidth,bg:getComputedStyle(document.body).backgroundColor,boxes:[...document.querySelectorAll('[data-fit]')].filter(e=>e.clientWidth).map(e=>({overflow:e.firstElementChild.scrollHeight>e.clientHeight+2||e.firstElementChild.scrollWidth>e.clientWidth+2,truncated:e.dataset.truncated==='true'}))})""")
        assert not result['horizontal'],(width,result)
        assert result['bg']=='rgb(0, 0, 0)'
        assert all(not x['overflow'] for x in result['boxes']),(width,result)
        assert not page.locator('.bio-box').get_attribute('data-truncated')=='true'
        if width in [390,1440]:page.screenshot(path=str(args.screenshots/f'ra-black-{width}.png'),full_page=True)
        report['checks'].append(f'{width}px: black theme; fixed-box fitting; complete biography; no horizontal overflow')
    assert page.locator('.instagram').get_attribute('target')=='_blank'
    page.goto(base+'/presentations/beyond-the-line/',wait_until='networkidle');page.wait_for_function("document.querySelectorAll('.slide').length===16")
    assert page.locator('video').count()==3
    page.locator('#next').click();assert page.locator('#counter').inner_text()=='2 / 16'
    page.locator('#slide-select').select_option('4');page.locator('#play').click();page.wait_for_function("[...document.querySelectorAll('video')].find(v=>v.dataset.slide==='4').currentTime>0.1")
    page.locator('#play').click();page.screenshot(path=str(args.screenshots/'presentation-video.png'))
    page.locator('#pair').click();page.wait_for_function("document.querySelector('#invite-link').value.includes('#')")
    link=page.locator('#invite-link').input_value();phone=context.new_page();phone.set_viewport_size({'width':390,'height':844});phone.goto(link,wait_until='networkidle');phone.locator('#name').fill('Ra');phone.locator('#join').click();page.wait_for_function("document.querySelector('#approve-dialog').open")
    assert not phone.locator('#remote-panel').is_visible()
    page.locator('#deny').click();phone.wait_for_function("!document.querySelector('#join').disabled");page.wait_for_timeout(3500);assert not page.locator('#approve-dialog').is_visible()
    phone.locator('#join').click();page.wait_for_function("document.querySelector('#approve-dialog').open");page.locator('#approve').click();phone.wait_for_function("!document.querySelector('#remote-panel').hidden")
    phone.locator('[data-command=next]').click();page.wait_for_function("document.querySelector('#counter').textContent==='6 / 16'")
    phone.wait_for_function("document.querySelector('#preview-image').src.startsWith('data:image/jpeg')")
    phone.locator('[data-command=blackout]').click();page.wait_for_function("!document.querySelector('#blank-screen').hidden")
    phone.locator('[data-command=blackout]').click();page.wait_for_function("document.querySelector('#blank-screen').hidden")
    phone.screenshot(path=str(args.screenshots/'presenter-phone.png'),full_page=True)
    page.locator('#revoke').click();phone.wait_for_function("!document.querySelector('#join-form').hidden")
    assert phone.locator('[data-command=next]').is_disabled()
    report['checks']+=['16 original slides and 3 media overlays render','Local slide navigation and embedded video playback','Name request and denial; no repeated request after denial','Host approval enables phone navigation and exact slide preview','Phone black-screen command and host revoke disable controls']
    assert not errors,errors
    report['pageErrors']=errors
    browser.close()
server.shutdown()
(args.screenshots/'browser-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
