# Verification / definition of done

## Current baseline

The canonical `assets/Beyond_the_Line_Rabia_Saleemi.pptx` is now published successfully through V.2 and is the primary browser source. Verification must confirm that each viewer downloads/renders that deck locally; VDO.Ninja must carry control/state only and never image/video payloads.

Run checks against the actual deployed URL as well as local code. Record observed results; do not relabel a mock test as a physical-phone test.

## Styling

At 320, 390, 768 and 1440px viewport widths, and 200% zoom: black background/white primary type; no horizontal overflow; fixed text box geometry unchanged by long labels; actual Pretext import ready; all data-fit boxes have fitted=pretext; readable font floors; Instagram opens the exact account in a new tab; keyboard focus remains visible. Rendering a page when the CDN is blocked only verifies the CSS fallback.

## Presentation

Original supplied file yields 17 slides and exactly three HTML video elements on slides 5, 6, 9. Slide 16 is the native PowerPoint budget slide and must use its SHA-bound PowerPoint-exported raster fallback; the other 16 slides keep their original embedded images. Compare original media hashes and coordinates, not just slide count. All slides navigable; click-to-play, pause, seeking, mute, first/last, black screen and keyboard shortcuts work. Videos pause on slide change. The website chrome is monochrome but slide artwork retains original colour. Do not claim a general editable-text conversion.

## Presenter handshake

### VDO.Ninja media boundary

Treat this as a required architectural invariant: VDO.Ninja synchronizes **behaviour and controls**, not media. Inspect messages and implementation for accidental media transport. Normal messages may contain compact state such as slide number, play/pause, media time, seek target, blackout, finish and heartbeat. They must not contain image/frame blobs, screenshots, base64 presentation images, audio samples, video streams, camera tracks, microphone tracks or equivalent media payloads unless the user explicitly requested transmission of audio or visual information. A synchronization issue is not permission to switch to media streaming.


Use one smartphone controller and at least two ordinary browsers on `/presentations/`. With no controller, both browsers show the original first-slide preview, concise project metadata and the controller QR. Scanning the QR on the phone must claim the fixed controller stream without a name or approval step; a second phone must fail while that stream remains live. Inspect data messages: they may contain only compact control/state values and must never contain base64 images, screenshots, video frames or presentation media. Each ordinary browser must load the canonical published PPTX itself and automatically become an edge-to-edge synchronized presentation. Verify slide changes, tapping embedded media on the phone, Play/Pause, seek, volume, full-screen on/off and blackout all produce matching local actions in both browsers, including one opened after control starts. Viewer volume must follow the phone's state; the phone preview itself remains muted. Verify native fullscreen is attempted, exits when the phone sends full-screen off, and exposes the local `Enter full screen` recovery button when browser gesture policy refuses entry. Verify finish/disconnect return. No camera/microphone prompts.

Test the three real videos and phone hotspot controls. Native fullscreen can require a local click. Audible playback can require local activation; test blocked play and the visible recovery button instead of claiming arbitrary remote activation works. Test actual iOS Safari / Android Chrome before claiming those platforms verified.

On a Windows or macOS computer with an extended second display/projector, use a current Chromium browser over HTTPS. Confirm `Open connected displays` appears, permission is requested once, one mirror opens and is placed on each other display, and every mirror follows the same slide/media/fullscreen/blackout state without carrying presentation media through VDO.Ninja. Connect and disconnect a display and verify `screenschange` repositions existing mirrors or presents the recovery button if a new popup is blocked. Also test permission denial, popup blocking and a browser without Window Management API support. Do not report this as changing the operating system's Duplicate/Extend setting; a website cannot control that setting.

## Publication

Source files in For-AI are repository metadata, not visitor navigation. robots.txt discourages indexing For-AI and the controller; this is not access control. Never include secrets. The tracked visitor HTML allowlist is exactly `index.html`, `cv/index.html`, `presentations/index.html`, `presentations/controller/index.html` and the platform `404.html`; the controller is the only intentionally unlinked route. Publish exact paths, read back remote SHA, and verify `/`, `/cv/`, `/presentations/`, the controller, JS modules, CSS, source media and actual content, not only HTTP 200.

## Status of this implementation

The published canonical PowerPoint is loaded directly by every viewer. Public media availability must be recorded separately from presentation code availability.

`For-AI/tests/verify.py` validates extracted source structure and source-code contracts. Browser/physical-device checks and live asset availability are separate evidence; this script does not claim to verify WebRTC signaling.

## Budget-slide update — 2026-09-20

The 41,818,545-byte source has 17 slides. Local conversion found three videos on slides 5, 6 and 9. Headless Chromium loaded both `/presentations/` and `/presentations/controller/` with 17 slide elements, the PowerPoint-exported Budget fallback at slide 16, the original final slide at 17 and no page errors. Live deployment must be checked separately after publication.

## Framed presentation layout — panels9

Applied and checked SHA-identical copies of `presentations/index.html`, `player.css` and `landing.js`. Offline Chromium checks at 320, 390, 768, 1024, 1100, 1440 and 1920px passed: no horizontal overflow; no truncated/overflowing current labels; equal panel top/bottom edges on desktop; stacked panels at narrower widths; dark-on-white QR rendering; decoded first-slide preview; live/idle transition still hides/restores the panels. No page JavaScript errors were observed.

Scope: real HTML/CSS and the existing fit.js **DOM fallback**, with a local original slide image and explicit deck/transport/QR fixtures. The actual Pretext CDN engine, production PPTX download, VDO.Ninja connection, and physical phone scanning were not verified by that isolated check. Pretext remains the production primary fitting engine, not the test fixture.

Run the focused layout check with `python For-AI/tests/verify_presentation_panels.py --cover PATH_TO_EXTRACTED_FIRST_SLIDE_PNG`. It uses Playwright and Python qrcode for isolated fixtures, not live device testing.

## Fullscreen and connected-display update — control10 / panels11

On 2026-09-21, two local in-app Chromium tabs loaded the production viewer and controller modules plus the canonical PPTX (17 slides, three videos) and connected through the configured VDO.Ninja data channel. Full-screen off removed the viewer recovery control; full-screen on attempted native fullscreen and exposed `Enter full screen` after browser gesture refusal; selecting that local recovery entered fullscreen; the phone-side full-screen off command then exited it. Next advanced both tabs to slide 2. No presentation media was sent through the control channel.

On 2026-09-21, the hardened controller/session protocol was exercised against the actual VDO.Ninja service from a local HTTP origin. One controller drove three presentation tabs: 12 rapid Next commands converged on slide 13; a late tab joined directly on slide 13; fullscreen on/off and blackout reached every tab; and a second controller claim was rejected, redirected to `/presentations/?controller=busy`, then joined as a viewer with the current slide, blackout and fullscreen intent. The controller reported all three applied-state acknowledgements. On slide 5, browser autoplay rejection fell back to uninterrupted muted video plus `Enable presentation sound`; after that one local activation, phone-controlled restart and pause worked unmuted. Reloading the viewer during the session restored slide 5 and the paused media timestamp. No browser console errors were observed. A physical phone camera scan, cross-engine browser run and real projector/window-management permission remain device tests rather than claims from this run.

The deployed commit `1c86619` completed GitHub Pages run `35590840105`. SHA-256 comparison found the seven public presentation HTML, JavaScript and CSS files byte-identical to the committed files. A live HTTPS run then synchronized three public presentation tabs on slide 5; a late join inherited slide and fullscreen-off state, a duplicate controller redirected to viewer mode, the controller received three screen acknowledgements, remote video started locally in all three tabs with the documented muted-autoplay recovery, fullscreen-on reached all three, and Finish returned all three to idle. No browser console errors were observed.

The connected-display path is covered by source-contract checks for `screen.isExtended`, `getScreenDetails()`, `screenschange`, positioned `window.open()` mirror URLs and mirror recursion prevention. A physical second monitor/projector and its permission prompt were not available in this check, so multi-display placement still requires qualification on the projection computer before an event.

## CV integration — 2026-09-21

The homepage now has four links, with CV opening `/cv/`. The page displays two high-resolution renders from the canonical PDF and applies CSS inversion only to those online pages; the download link targets the unchanged white PDF. Structural verification passed 7 tests, including the four-link count, both page renders, PDF magic bytes, the download path and the inversion rule. Native embedded PDF painting was rejected after live browser verification showed a blank plugin surface; static page renders avoid that browser-dependent failure.

## Public route cleanup — 2026-09-21

The tracked visitor documents are now exactly `/`, `/cv/`, `/presentations/`, the QR-linked hidden `/presentations/controller/`, and GitHub Pages `404.html`. The orphan journal post, RSS feed, obsolete presentation redirect, unreferenced legacy player and their retired browser-test doubles were removed. The shared stylesheet retained only rules used by those surviving documents. Structural verification completed 8 checks: 7 passed, including the exact HTML allowlist and controller-only hidden-route rule, and the optional converted-asset fixture was skipped because no generated deck manifest is present. Local Chromium loaded the landing, CV, presentation, controller and 404 documents without horizontal overflow or console errors. Commit `071192b` completed Pages run `35593824762`; the four intended live routes returned 200 and the removed post, feed, redirect and player paths returned 404.
