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
        code=(ROOT/'presentations/player.js').read_text()
        self.assertIn('uuid !== controller?.uuid',code)
        self.assertIn('data.seq <= peer.seq',code)
        self.assertIn("$('approve').onclick",code)
        self.assertIn('Date.now() - peer.lastSeen > 15000',code)
        self.assertIn("$('show-controls').disabled = Boolean(controller)",code)
        self.assertIn('for (const [uuid, peer] of peers)',code)
        self.assertIn('showPendingRequest',code)
        self.assertIn('ra:display-owner:',code)
        controller=(ROOT/'presentations/controller.js').read_text()
        self.assertIn("const invite = readInvite();",controller)
        self.assertIn("$('control-panel').hidden = !show",controller)
        html=(ROOT/'presentations/beyond-the-line/index.html').read_text()
        self.assertIn('class="phone-button"><svg',html)
        self.assertIn('MAIN_PPTX',(ROOT/'presentations/deck.js').read_text())
        self.assertIn('getRandomValues',(ROOT/'presentations/transport.js').read_text())
    def test_converted_assets_when_available(self):
        path=ROOT/'assets/beyond-the-line/deck.json'
        if not path.exists():
            self.skipTest('Source media not imported; presentation assets not verified.')
        deck=json.loads(path.read_text())
        self.assertEqual(len(deck['slides']),16)
        clips=[]
        for i,slide in enumerate(deck['slides']):
            self.assertTrue(slide['layers'])
            for layer in slide['layers']:
                self.assertEqual(len(layer['box']),4)
                self.assertTrue((ROOT/layer['src'].lstrip('/')).is_file())
                if layer['kind']=='video': clips.append(i+1)
        self.assertEqual(clips,[5,6,9])
        self.assertAlmostEqual(deck['width']/deck['height'],16/9,places=3)

if __name__=='__main__': unittest.main(verbosity=2)
