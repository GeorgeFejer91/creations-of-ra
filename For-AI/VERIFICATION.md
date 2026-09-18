# Verification / definition of done

## Viewer-first update — 2026-09-18

V.2 writes were applied to the actual CreationsOfRa workspace. Browser checks used SHA-matched copies of player.js, controller.js, view.js, their HTML and CSS. In-memory browser documents with test transport/measurement and locally supplied original media passed: viewer default; opt-in controls; fullscreen without application chrome; deferred approval; exclusive phone control; local/unapproved/replayed command refusal; synchronized embedded MP4 play/pause; blackout; and release back to viewing. No page JavaScript errors were observed. Screenshot: fullscreen-viewer-only.png in the authoring verification output.

These are application-behavior checks, NOT live VDO.Ninja signaling, physical QR scans, physical iOS/Android tests, or real Pretext-CDN integration. Network browser navigation in the authoring container returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`, so those tests could not run here. Cross-device copied-link ownership should also be exercised in a network-enabled browser.

Canonical preload upload was attempted through V.2 and failed exactly with:
`{"error":{"code":"file_too_large","message":"'assets/Beyond_the_Line_Rabia_Saleemi.pptx' exceeds the configured per-file limit.","path":"direct"}}`

The code automatically requests that path; public media preload remains incomplete until an authorized upload succeeds. Do not mark the full presentation product PASS solely because Pages deploys the text files.

Run checks against the actual deployed URL as well as local code. Record observed results; do not relabel a mock test as a physical-phone test.

## Styling

At 320, 390, 768 and 1440px viewport widths, and 200% zoom: black background/white primary type; no horizontal overflow; fixed text box geometry unchanged by long labels; actual Pretext import ready; all data-fit boxes have fitted=pretext; no essential biography text truncated; readable font floors; Instagram opens the exact account in a new tab; keyboard focus remains visible. Rendering a page when the CDN is blocked only verifies the CSS fallback.

## Presentation

Original supplied file yields 16 slides and exactly three HTML video elements on slides 5, 6, 9. Compare original media hashes and coordinates, not just slide count. All slides navigable; click-to-play, pause, seeking, mute, first/last, black screen and keyboard shortcuts work. Videos pause on slide change. The website chrome is monochrome but slide artwork retains original colour. No invented editable-text conversion: original slide text is rasterised in the uploaded file.

## Presenter handshake

Use a display, a phone/controller, and at least one additional audience browser. Joining the QR is viewer-first, immediately synchronized and needs no name. Controls appear only when Show controls is checked; sending commands still requires display approval. Verify that approval disables display controls and all other viewers' controls. Check late joining, denied/revoked/stale/repeated commands, copied display URLs, slide navigation, media position and blackout. Fullscreen must contain only the presentation; requests received in fullscreen wait until exit. Release returns to viewing without automatically enabling local control. A restarted owner has a new command epoch and does not inherit a prior phone grant. No camera/microphone prompts.

Test the three real videos and phone hotspot controls. Native fullscreen can require a local click. Audible playback can require local activation; test blocked play and the visible recovery button instead of claiming arbitrary remote activation works. Test actual iOS Safari / Android Chrome before claiming those platforms verified.

## Publication

Source files in For-AI are repository metadata, not visitor navigation. robots.txt discourages indexing For-AI and the controller; this is not access control. Never include secrets. Publish exact paths with V.2, read back remote SHA, then call github_direct_pages_status with expectedCommit and a new exact homepage phrase. Verify /presentations/, the player, JS modules, CSS, source/converted media and actual content, not only HTTP200.

## Status of this implementation

An actual attachment-to-PC binary upload action is not exposed by the current MCP. The website includes a browser-local PowerPoint opener and a standard-library converter so the presentation can be used without pretending the media was uploaded. Public media availability must be recorded separately from player code availability.

`For-AI/tests/verify.py` validates extracted source structure and source-code contracts. Browser/physical-device checks and live asset availability are separate evidence; this script does not claim to verify WebRTC signaling.

## Observed authoring checks (2026-09-18)

- Structural tests: 6 passed, including 16 slides / media on 5, 6 and 9. Original PNG/MP4 bytes extracted unchanged; source digest in SOURCES.md.
- Chromium offline rendering: 320/390/768/1440px, complete biography and no horizontal/text overflow. Original embedded video played and paused.
- Presenter application logic: name request, deny without repeated prompt, approve, next, black screen, miniature preview, unapproved-sender refusal and revoke passed with explicit transport/measurement test doubles.
- This authoring container blocks browser network navigation; actual CDN/Pretext integration, VDO.Ninja signaling, physical QR scanning and physical iOS/Android devices were NOT verified here. Do not label these checks as a live phone test.
- The source PPTX is now present in the PC workspace, but direct MCP publication returned file_too_large for its 41,815,513 bytes. Converted media must be published through an authorized upload path. A browser-local PowerPoint import is not a public asset upload.
