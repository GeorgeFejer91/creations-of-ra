# Start here: Creations of Ra

## Common control-plane contract

- **Boundary:** Product source, shipped assets, user documentation, and final deliverables stay outside this folder. This folder owns agent routing, durable context, verification policy, and decision pointers.
- **Authority:** Direct instructions and the nearest `AGENTS.md` win. Existing project documents remain authoritative for their named subjects; link instead of copying.
- **Skills:** Use `$ponytail` for every implementation, fix, refactor, code review, and technical design when available. Load other skills only for matching tasks; do not create speculative skill infrastructure.
- **Workflow:** Define one bounded outcome and its checks, reuse what exists, and make the smallest coherent diff.
- **Verification:** A task is ready only after focused checks, applicable full checks, diff review, and instruction synchronization. Report unrun checks and never overclaim evidence.
- **Self-update:** Update durable goals, constraints, decisions, routes, and gates in the same change that alters them. Do not keep chat logs, daily diaries, duplicate ledgers, generated evidence, or speculative backlogs.
- **Git:** Inspect status before and after work; stage only intended paths; use coherent, itemized commits; push validated completed work when branch policy permits. Never force-push, bypass protection, publish secrets, or absorb unrelated changes.
- **YAGNI:** Add a file here only when it has a distinct current owner and consumer. Prefer one section or link over a new document, script, dependency, or abstraction.


This is the first file every agent must read. Then read `VERIFICATION.md`. This directory owns global context, constraints, decisions, source inventory, test evidence and every AI/build/test orchestration script. Root AGENTS.md and CLAUDE.md are pointers only. All other application files are public website assets; `.github/workflows/` may contain only thin platform-required launchers. Never put tokens, pairing URLs, names from live sessions or MCP credentials in source or evidence.

## Product and source of truth

A black-and-white, minimalist link hub and presentation site for **Ra / Rabia Saleemi**. Public site: https://creations-of-ra.com/. Repository: https://github.com/GeorgeFejer91/creations-of-ra. The visible homepage contains only `Ra.` plus Presentations, Instagram, Behance and CV links. The CV page visually inverts high-resolution page renders from the canonical PDF while its direct download remains the original white document. Do not add biography, journal, placeholder copy or extra navigation unless explicitly requested.

Beyond the Line is the supplied 17-slide Manchester Museum Partition Project presentation. Its PowerPoint has 16 raster slide images, three embedded H.264/AAC MP4 videos and one native PowerPoint budget slide. Preserve image layers, original artwork colours, native slide aspect ratio, coordinates, slide order and embedded media. The browser uses a PowerPoint export for the native budget slide and renders the other original image/video elements with slideshow controls. Do not claim a general PowerPoint engine or invent animations. See SOURCES.md.

## Non-negotiable design logic: geometry first, text second

1. Design the **placement, width, height and relative proportions** of web elements in CSS first. Responsive breakpoints intentionally establish a new geometry; content must not arbitrarily resize it.
2. A constrained text box is the input, not the output. **Fit the text to the box, not the box to the text.** Use actual **Cheng Lou Pretext** measurement as the primary fitting method. `assets/js/fit.js` is the one fitting implementation.
3. Mark fixed text boxes with `data-fit`, `data-fit-min`, `data-fit-max`, optional `data-fit-line` and `data-fit-single`; put the plain text in a child span. ResizeObserver watches the box. Pretext caches prepared text and a bounded binary search chooses the largest fitting type size. Font family, style, weight, letter spacing and line height must match CSS.
4. Define readable lower bounds. If variable names/status labels cannot fit at that bound, use measured grapheme truncation or a compact label, retaining full text in accessible text/title. Do not shrink essential information to illegibility. No guessed character counts, trial-and-error font breakpoints, overflow hidden as the only solution, or text-driven panel expansion.
5. Verify both dimensions in the rendered browser, after font loading and resizing. A missing Pretext import is not proof of fitting. Keep readable CSS as a failure fallback and report the unavailable library rather than claiming it worked.
6. Site chrome is black (#000) with white (#fff) type and restrained neutral secondary text/rules. No gradients, decorative cards, heavy rounding, dashboards or needless animations. Original presentation artwork is exempt from recolouring to preserve fidelity.
7. Use existing elements and one shared stylesheet. Minimum touch targets 44–48px, keyboard access, focus states and reduced-motion support remain required. Ordinary document scrolling is allowed; overflowing text must never force a fixed control to grow or introduce horizontal scrolling.

## Skills and when to use them

| Resource | When and how |
| --- | --- |
| [Ponytail](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md) | **Mandatory for every backend and frontend design, implementation, fix, refactor and review.** Read and apply the installed Ponytail skill before changing code: existing code → native/standard APIs → existing dependencies → minimum new code. Prefer deletion, YAGNI and KISS. |
| [Uncodixfy](https://github.com/cyxzdev/Uncodixfy) | Every visible UI choice. Restrained utility controls, existing visual language, minimal hierarchy. |
| [Pretext](https://github.com/chenglou/pretext) | Runtime text fitted to fixed geometry. This is a library, not an invented skill file. Read its actual README/API and use the pinned package. |
| [VDO.Ninja SDK](https://github.com/steveseguin/ninjasdk) | Phone pairing / WebRTC data channels only. Read its API before modifying the transport. |

## VDO.Ninja transport boundary — mandatory

VDO.Ninja is **strictly a behaviour/control synchronization layer by default**. Use its data channel to synchronize website state and user actions between devices, for example slide index, next/previous, play/pause, seek position, blackout, finish, heartbeat and other compact control/state values.

**Do not use VDO.Ninja to transmit presentation images, screenshots, canvas frames, video frames, audio, microphone input, camera input or other visual/media payloads unless the user explicitly asks to transmit audio or visual information.** Do not invoke VDO.Ninja audio/video/camera/streaming features merely because they could solve a synchronization problem. The normal architecture is: each browser loads/renders the original website assets or published PowerPoint locally, while VDO.Ninja sends only the commands/state that make those local browser instances behave identically.

If a future task can be solved by synchronizing website behaviour, controls or timestamps, that is the required solution. Media transport is opt-in only when the user explicitly requests actual audio/video/image transmission.


Install/load relevant skills using the agent's existing mechanism, or read their actual instructions. Do not create a skill manager or add irrelevant Rust/Tauri dependencies to this static website.

## Small architecture

- `index.html`, `styles.css`: minimal `Ra.` link hub.
- `assets/js/fit.js`: geometry-first Pretext fitting.
- `presentations/index.html`: the only public presentation page. Before control it shows the first-slide preview plus one controller QR; while controlled it becomes a viewport-filling synchronized viewer. Local buttons appear only when the browser requires a one-time fullscreen or connected-display gesture.
- `presentations/controller/`: hidden/noindex smartphone controller reached only through the QR.
- `presentations/deck.js`, `view.js`: every browser independently downloads and renders the canonical published PPTX at original embedded-media quality.
- `presentations/transport.js`: one fixed VDO.Ninja **data-only** publisher stream. It carries only presentation control/state (slide index, media time/play-pause, blackout, finish/heartbeat); never slide images, video frames, screenshots, audio or presentation media. The phone is the publisher/controller; every presentations page is a viewer. Camera/microphone/media transport are forbidden unless the user explicitly requests actual audio/visual transmission.
- No CMS, database, login service, analytics, viewer mode selector, approval dialog or general presentation framework.

The complete visitor-route allowlist is `/`, `/cv/` and `/presentations/`. `/presentations/controller/` is the sole intentionally unlinked/hidden route and is reached through the presentation QR. `404.html` is only the GitHub Pages error document, not a product route. Do not add compatibility redirects, blog/journal pages, feeds, demos, alternate viewers or other public subpages unless the user explicitly adds them to the landing page. Hidden/noindex is discoverability, not access control; never describe the static controller URL as cryptographically secret.

Runtime dependencies are pinned: Pretext 0.0.9 (MIT), fflate 0.8.2 (MIT), qrcode-generator 1.4.4 (MIT), VDO.Ninja SDK 1.5.5 (MPL-2.0). Served by jsDelivr; source links and third-party limitations are in SOURCES.md. Pin upgrades deliberately. No third-party fonts. QR is generated locally, never by an external QR-image service.

## Handshake and command contract

`/presentations/` is always the viewer page. Idle state shows concise project information, the original first-slide image loaded from the published PPTX, and one QR. The QR opens the hidden smartphone controller, which announces one fixed VDO.Ninja data-only stream. The first phone to claim that stream is the sole controller. There is no name form, approval dialog, viewer QR, viewer subpage or controls checkbox. Each viewer has its own local high-definition render of the same published PPTX. VDO.Ninja sends only state/control data: changing slide, starting/pausing/seeking video, fullscreen intent, blackout and finish are applied to each browser's local deck; no image or video pixels are sent from the phone. While the phone is connected, every browser already on `/presentations/` and every browser arriving later becomes a viewport-filling synchronized viewer. `Finish presentation`, controller close, or disconnect returns viewers to the preview plus QR.

The viewer transport starts before the PPTX download and remains receptive while the page is open. A controller page must first claim the fixed publisher stream; duplicate publisher rejection redirects that page to `/presentations/` as a viewer. Each accepted controller generates a fresh session ID and emits ordered, revisioned full-state heartbeats. Viewers send `hello`, accept one valid controller/session, retain the newest state while their local deck loads, apply it after load, and return periodic `applied` acknowledgements. A short transport interruption keeps the last rendered slide while reconnecting; the 15-second state lease returns a stale viewer to idle. This is a singleton transport lease, not secrecy: the controller URL itself is public.

Required controller behavior: previous/next, tap embedded media or use Play/Pause, seek, volume, explicit full-screen on/off, black screen and Finish. These actions synchronize compact state only; media bytes remain local to each browser. When a controller is active, `/presentations/` automatically becomes an edge-to-edge viewport presentation with no website chrome and follows the controller's fullscreen intent. Native fullscreen and audible autoplay remain subject to browser user-gesture policies; when fullscreen is refused the viewer exposes one `Enter full screen` recovery button. Do not claim VDO.Ninja bypasses those restrictions. The phone's own preview stays muted while its volume control specifies the intended volume applied by viewer browsers.

If an audible remote play is refused before any local activation, the viewer immediately continues the video muted and exposes `Enable presentation sound`. That one local click satisfies the browser policy; play, pause, seek and volume remain controller-owned. Do not hide or misrepresent this browser restriction.

On a compatible HTTPS Chromium browser, `screen.isExtended` detects an extended desktop and the Window Management API positions one same-origin `/presentations/` mirror on every other connected display. The projection computer must select `Open connected displays` once to grant window-management/pop-up permission; the preference is retained, existing mirror windows are repositioned automatically, and `screenschange` reacts to later projector changes. Every mirror downloads the PPTX and joins the same data-only state channel independently. Browser security may require another click for a blocked popup or native fullscreen. This is browser window placement, not an attempt to change the operating system's Duplicate/Extend display setting.

## Publishing and asset transfer

Use the V.2 direct publisher for exact changed paths to `GeorgeFejer91/creations-of-ra`, branch main; do not retarget unrelated repositories or publish `.chatgpt/`. Verify remote SHA and the deployed site with the expected text. Keep commits coherent. Read an existing workflow before changing it.

Canonical source: `assets/Beyond_the_Line_Rabia_Saleemi.pptx` (41,818,545 bytes). V.2 publishes this file and it is the canonical preloaded PowerPoint. The native budget slide uses `assets/beyond-the-line/slide-16-budget.png`, exported directly from that exact source file and accepted only when the source SHA-256 matches. The loader also retains the converted-manifest fallback. Do not duplicate presentation sources or reintroduce a manual file-picker workflow as the normal path.

For local conversion: `python For-AI/scripts/import_presentation.py PATH_TO_PPTX`. Output is the exact embedded media plus a geometry manifest; no screenshots are used as a substitute for the embedded videos. Test before publishing. All future orchestration stays in this folder.

## Presentation idle-page geometry

The requested idle layout is two thin-bordered black panels: original first-slide preview on the left, project title/details above the QR on the right. Desktop panels share a 520px height, with a 336px right column and a 24px gap. Below 1040px they stack; the preview keeps its 16:9 aspect ratio. Do not stretch/crop the slide artwork to fill the panel.

The title, project details, QR label and note use the existing `assets/js/fit.js` Pretext implementation with explicit `data-fit` bounds and fixed CSS text boxes. Fit text to geometry, not the reverse. The QR uses conventional dark modules on a white background with a protected quiet zone; never invert either the QR or the slide image. The QR remains a link to the same hidden phone controller, not a viewer join action. Physical iOS and Android camera scanning still requires device testing before claiming universal support.

The first-slide image stays hidden until decoded, with bounded loading/error feedback instead of a broken-image icon. QR generation and text fitting must not delay the independent PPTX download. This layout refinement does not change media/control transport or the phone's volume/tap controls.

## HTML UI skill route

For new or changed text-bearing HTML/CSS interfaces, load the installed `uncodixfy-pretext` skill ([source](https://github.com/GeorgeFejer91/uncodixfy-pretext/blob/main/SKILL.md)) and its Pretext reference. It nests `ponytail` and the original Uncodixfy visual discipline. Preserve this project's established design and stack; implement real `@chenglou/pretext` measurement for bounded text in the touched UI, not a CSS-only or test-only substitute. Design box geometry first, then handle measured no-fit with readable reflow, space, or an accessible full-value route. Verify the rendered target at narrow widths, 320 CSS px reflow, 200% text/zoom, and long or localized strings. This route does not claim existing UI has already been migrated or qualified.
