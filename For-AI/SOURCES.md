# Source and dependency inventory

## Artist content

Source: user-supplied `assets/Beyond_the_Line_Rabia_Saleemi.pptx`.
SHA-256: `a4b812278c3508f33d24af29bb6d8f1fa7974f053d968b2a680a985fce37990c`.

Slide 4 identifies Rabia Saleemi as a multidisciplinary artist, educator and facilitator, with MA Art Practice & Education; Creative Lead — Rosa Festival; Former Creative Director — Brink Art Studio CIC. Its practice statement says her practice moves between research, intuition, making and collaboration. This is the basis of the biography, not external biographical research.

The archive contains 17 slides: 16 flattened slide backgrounds, one native PowerPoint budget slide at position 16 and three MP4 overlays on slides 5, 6 and 9. PowerPoint media timing is click-to-start (indefinite start delay), with volume 0.8. Embedded video durations: approximately 12.12s, 30.36s and 38.13s. The browser version preserves the images/media geometry and click playback, and uses `assets/beyond-the-line/slide-16-budget.png`, exported directly from PowerPoint, for the one native-shape slide. The raster slide text cannot be independently refitted without reconstructing the artwork; Pretext governs website and player UI text, not baked-in pixels.

## Runtime libraries and documentation

- Pretext / Cheng Lou: https://github.com/chenglou/pretext — `@chenglou/pretext@0.0.9`, MIT. Actual APIs: prepareWithSegments, measureLineStats, measureNaturalWidth. Do not invent a built-in auto-font-size function; the site's bounded fitting loop is application code.
- VDO.Ninja SDK: https://github.com/steveseguin/ninjasdk — `@vdoninja/sdk@1.5.5`, MPL-2.0. Data-only announce/view with bidirectional sendData and UUID-bound receipt. SDK/service dependency is required for live cross-device pairing; no camera/microphone requested.
- fflate: https://github.com/101arrowz/fflate — `fflate@0.8.2`, MIT. Only for local/imported PPTX ZIP extraction.
- QR generator: https://github.com/kazuhikoarase/qrcode-generator — `qrcode-generator@1.4.4`, MIT. Local QR generation keeps session URLs away from a QR-image service.
- Pairing inspiration requested by owner: https://ec-games.space/ and https://github.com/GeorgeFejer91/ECGaming. This is inspiration, not a claim that its code was copied or its infrastructure is owned by this site.
- Fullscreen: https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
- Audible playback: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

P2P pairing needs reachable VDO.Ninja signaling and usable WebRTC network traversal. Restricted networks, disabled WebRTC, sleeping phones and unavailable signaling must surface as failures, not a false Connected status. Do not promise the signaling service cannot observe connection metadata.
