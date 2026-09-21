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
    def test_cv_view_and_download(self):
        home = (ROOT/'index.html').read_text(encoding='utf-8')
        page = (ROOT/'cv/index.html').read_text(encoding='utf-8')
        css = (ROOT/'styles.css').read_text(encoding='utf-8')
        pdf = ROOT/'assets/rabia-saleemi-artist-cv-2026.pdf'
        self.assertEqual(len(re.findall(r'<a\s+href=', home.split('<nav class="profile-links"', 1)[1].split('</nav>', 1)[0])), 4)
        self.assertIn('href="/cv/"', home)
        self.assertEqual(page.count('class="cv-page-image"'), 2)
        self.assertIn('src="/assets/cv/page-1.png?v=header2"', page)
        self.assertIn('src="/assets/cv/page-2.png?v=header2"', page)
        self.assertIn('href="/assets/rabia-saleemi-artist-cv-2026.pdf?v=header2" download="Rabia_Saleemi_Artist_CV_2026.pdf"', page)
        self.assertIn('filter:invert(1) hue-rotate(180deg)', css)
        self.assertTrue((ROOT/'assets/cv/page-1.png').read_bytes().startswith(b'\x89PNG'))
        self.assertTrue((ROOT/'assets/cv/page-2.png').read_bytes().startswith(b'\x89PNG'))
        self.assertTrue(pdf.read_bytes().startswith(b'%PDF-'))
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
        controller=(ROOT/'presentations/controller.js').read_text()
        for phrase in ['connectController',"type:'state'","type:'ended'",'outputVolume',"$('finish-presentation').onclick"]:
            self.assertIn(phrase,controller)
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
