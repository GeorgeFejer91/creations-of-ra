# Verification / definition of done

## Viewer-first update — 2026-09-18

V.2 writes were applied to the actual CreationsOfRa workspace. Browser checks used SHA-matched copies of player.js, controller.js, view.js, their HTML and CSS. In-memory browser documents with test transport/measurement and locally supplied original media passed: viewer default; opt-in controls; fullscreen without application chrome; deferred approval; exclusive phone control; local/unapproved/replayed command refusal; synchronized embedded MP4 play/pause; blackout; and release back to viewing. No page JavaScript errors were observed. Screenshot: fullscreen-viewer-only.png in the authoring verification output.

These are application-behavior checks, NOT live VDO.Ninja signaling, physical QR scans, physical iOS/Android tests, or real Pretext-CDN integration. Network browser navigation in the authoring container returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`, so those tests could not run here. Cross-device copied-link ownership should also be exercised in a network-enabled browser.

The canonical `assets/Beyond_the_Line_Rabia_Saleemi.pptx` is now published successfully through V.2 and is the primary browser source. Verification must confirm that each viewer downloads/renders that deck locally; VDO.Ninja must carry control/state only and never image/video payloads.

Run checks against the actual deployed URL as well as local code. Record observed results; do not relabel a mock test as a physical-phone test.

## Styling

At 320, 390, 768 and 1440px viewport widths, and 200% zoom: black background/white primary type; no horizontal overflow; fixed text box geometry unchanged by long labels; actual Pretext import ready; all data-fit boxes have fitted=pretext; no essential biography text truncated; readable font floors; Instagram opens the exact account in a new tab; keyboard focus remains visible. Rendering a page when the CDN is blocked only verifies the CSS fallback.

## Presentation

Original supplied file yields 17 slides and exactly three HTML video elements on slides 5, 6, 9. Slide 16 is the native PowerPoint budget slide and must use its SHA-bound PowerPoint-exported raster fallback; the other 16 slides keep their original embedded images. Compare original media hashes and coordinates, not just slide count. All slides navigable; click-to-play, pause, seeking, mute, first/last, black screen and keyboard shortcuts work. Videos pause on slide change. The website chrome is monochrome but slide artwork retains original colour. Do not claim a general editable-text conversion.

## Presenter handshake

### VDO.Ninja media boundary

Treat this as a required architectural invariant: VDO.Ninja synchronizes **behaviour and controls**, not media. Inspect messages and implementation for accidental media transport. Normal messages may contain compact state such as slide number, play/pause, media time, seek target, blackout, finish and heartbeat. They must not contain image/frame blobs, screenshots, base64 presentation images, audio samples, video streams, camera tracks, microphone tracks or equivalent media payloads unless the user explicitly requested transmission of audio or visual information. A synchronization issue is not permission to switch to media streaming.


Use one smartphone controller and at least two ordinary browsers on `/presentations/`. With no controller, both browsers show the original first-slide preview, concise project metadata and the controller QR. Scanning the QR on the phone must claim the fixed controller stream without a name or approval step; a second phone must fail while that stream remains live. Inspect data messages: they may contain only compact control/state values and must never contain base64 images, screenshots, video frames or presentation media. Each ordinary browser must load the canonical published PPTX itself and automatically become an edge-to-edge synchronized presentation. Verify slide changes, tapping embedded media on the phone, Play/Pause, seek, volume, full-screen on/off and blackout all produce matching local actions in both browsers, including one opened after control starts. Viewer volume must follow the phone's state; the phone preview itself remains muted. Verify native fullscreen is attempted, exits when the phone sends full-screen off, and exposes the local `Enter full screen` recovery button when browser gesture policy refuses entry. Verify finish/disconnect return. No camera/microphone prompts.

Test the three real videos and phone hotspot controls. Native fullscreen can require a local click. Audible playback can require local activation; test blocked play and the visible recovery button instead of claiming arbitrary remote activation works. Test actual iOS Safari / Android Chrome before claiming those platforms verified.

On a Windows or macOS computer with an extended second display/projector, use a current Chromium browser over HTTPS. Confirm `Open connected displays` appears, permission is requested once, one mirror opens and is placed on each other display, and every mirror follows the same slide/media/fullscreen/blackout state without carrying presentation media through VDO.Ninja. Connect and disconnect a display and verify `screenschange` repositions existing mirrors or presents the recovery button if a new popup is blocked. Also test permission denial, popup blocking and a browser without Window Management API support. Do not report this as changing the operating system's Duplicate/Extend setting; a website cannot control that setting.

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
- The 41,815,513-byte canonical PPTX was published at `/assets/Beyond_the_Line_Rabia_Saleemi.pptx` and was the normal viewer/controller source for these checks.

## Budget-slide update — 2026-09-20

The 41,818,545-byte source has 17 slides. Local conversion found three videos on slides 5, 6 and 9. Headless Chromium loaded both `/presentations/` and `/presentations/controller/` with 17 slide elements, the PowerPoint-exported Budget fallback at slide 16, the original final slide at 17 and no page errors. Live deployment must be checked separately after publication.

## Framed presentation layout — panels9

Applied and checked SHA-identical copies of `presentations/index.html`, `player.css` and `landing.js`. Offline Chromium checks at 320, 390, 768, 1024, 1100, 1440 and 1920px passed: no horizontal overflow; no truncated/overflowing current labels; equal panel top/bottom edges on desktop; stacked panels at narrower widths; QR SVG inversion; decoded first-slide preview; live/idle transition still hides/restores the panels. No page JavaScript errors were observed.

Scope: real HTML/CSS and the existing fit.js **DOM fallback**, with a local original slide image and explicit deck/transport/QR fixtures. Browser network navigation returned ERR_BLOCKED_BY_ADMINISTRATOR. The actual Pretext CDN engine, production PPTX download, VDO.Ninja connection, and physical inverted-QR scanning were NOT verified by this check. Pretext remains the production primary fitting engine, not the test fixture. The supplied deck and active control/data-channel code were not changed.

Run the focused layout check with `python For-AI/tests/verify_presentation_panels.py --cover PATH_TO_EXTRACTED_FIRST_SLIDE_PNG`. It uses Playwright and Python qrcode for isolated fixtures, not live device testing.

## Fullscreen and connected-display update — control10 / panels11

On 2026-09-21, two local in-app Chromium tabs loaded the production viewer and controller modules plus the canonical PPTX (17 slides, three videos) and connected through the configured VDO.Ninja data channel. Full-screen off removed the viewer recovery control; full-screen on attempted native fullscreen and exposed `Enter full screen` after browser gesture refusal; selecting that local recovery entered fullscreen; the phone-side full-screen off command then exited it. Next advanced both tabs to slide 2. No presentation media was sent through the control channel.

The connected-display path is covered by source-contract checks for `screen.isExtended`, `getScreenDetails()`, `screenschange`, positioned `window.open()` mirror URLs and mirror recursion prevention. A physical second monitor/projector and its permission prompt were not available in this check, so multi-display placement still requires qualification on the projection computer before an event.

## CV integration — 2026-09-21

The homepage now has four links, with CV opening `/cv/`. The page displays two high-resolution renders from the canonical PDF and applies CSS inversion only to those online pages; the download link targets the unchanged white PDF. Structural verification passed 7 tests, including the four-link count, both page renders, PDF magic bytes, the download path and the inversion rule. Native embedded PDF painting was rejected after live browser verification showed a blank plugin surface; static page renders avoid that browser-dependent failure.
