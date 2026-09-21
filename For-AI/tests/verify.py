#!/usr/bin/env python3
"""Structural checks. Does not pretend to verify a real WebRTC or mobile session."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]

class WebsiteTests(unittest.TestCase):
    def test_agent_entry_points(self):
        for name in ['AGENTS.md', 'CLAUDE.md']:
            self.assertIn('For-AI/README.md', (ROOT/name).read_text())
    def test_instagram(self):
        html = (ROOT/'index.html').read_text()
        self.assertIn('https://www.instagram.com/creations_of_ra_/', html)
        self.assertRegex(html, r'href="https://www.instagram.com/creations_of_ra_/" target="_blank" rel="noopener noreferrer"')
    def test_pretext_is_real_primary_import(self):
        code = (ROOT/'assets/js/fit.js').read_text()
        for phrase in ['@chenglou/pretext@0.0.9','prepareWithSegments','measureLineStats','measureNaturalWidth','ResizeObserver']:
            self.assertIn(phrase, code)
    def test_css_geometry_and_monochrome(self):
        css=(ROOT/'styles.css').read_text()
        self.assertIn('--paper:#000', css)
        self.assertIn('--ink:#fff', css)
        self.assertIn('.title-box{height:300px', css)
        self.assertIn('.bio-box{height:265px', css)
    def test_phone_guardrails(self):
        code=(ROOT/'presentations/landing.js').read_text()
        self.assertIn('controller&&uuid!==controller',code)
        self.assertIn('data.version>lastVersion',code)
        self.assertIn("data.type==='ended'",code)
        self.assertIn('Date.now()-lastSeen>15000',code)
        self.assertIn('view?.apply',code)
        for phrase in ['requestFullscreen','document.exitFullscreen','data.fullscreen!==false','getScreenDetails','screen.isExtended','screenschange','window.open',"url.searchParams.set('mirror','1')"]:
            self.assertIn(phrase,code)
        controller=(ROOT/'presentations/controller.js').read_text()
        for phrase in ['connectController',"type:'state'","type:'ended'",'outputVolume','fullscreen',"action==='fullscreen-on'","action==='fullscreen-off'","$('finish-presentation').onclick"]:
            self.assertIn(phrase,controller)
        controller_html=(ROOT/'presentations/controller/index.html').read_text(encoding='utf-8')
        self.assertIn('data-action="fullscreen-on"',controller_html)
        self.assertIn('data-action="fullscreen-off"',controller_html)
        transport=(ROOT/'presentations/transport.js').read_text()
        self.assertIn("sdk.announce({streamID:STREAM})",transport)
        self.assertIn("sdk.view(STREAM,{audio:false,video:false})",transport)
        self.assertIn('MAIN_PPTX',(ROOT/'presentations/deck.js').read_text())
    def test_converted_assets_when_available(self):
        path=ROOT/'assets/beyond-the-line/deck.json'
        if not path.exists():
            self.skipTest('Source media not imported; presentation assets not verified.')
        deck=json.loads(path.read_text())
        self.assertEqual(len(deck['slides']),17)
        clips=[]
        for i,slide in enumerate(deck['slides']):
            self.assertTrue(slide['layers'])
            for layer in slide['layers']:
                self.assertEqual(len(layer['box']),4)
                self.assertTrue((ROOT/layer['src'].lstrip('/')).is_file())
                if layer['kind']=='video': clips.append(i+1)
        self.assertEqual(clips,[5,6,9])
        self.assertEqual(deck['slides'][15]['title'],'Budget')
        self.assertAlmostEqual(deck['width']/deck['height'],16/9,places=3)

if __name__=='__main__': unittest.main(verbosity=2)
