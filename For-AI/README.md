# Start here: Creations of Ra

This is the first file every agent must read. Then read `VERIFICATION.md`. This directory owns global context, constraints, decisions, source inventory, test evidence and every AI/build/test orchestration script. Root AGENTS.md and CLAUDE.md are pointers only. All other application files are public website assets; `.github/workflows/` may contain only thin platform-required launchers. Never put tokens, pairing URLs, names from live sessions or MCP credentials in source or evidence.

## Product and source of truth

A black-and-white, minimalist biography and presentation site for **Ra / Rabia Saleemi**. Public site: https://creations-of-ra.com/. Repository: https://github.com/GeorgeFejer91/creations-of-ra. Instagram: https://www.instagram.com/creations_of_ra_/ (dedicated button, new tab, `noopener noreferrer`). Biography statements come only from the supplied Beyond the Line deck. Do not invent biography, dates, exhibitions or artworks.

Beyond the Line is the supplied 16-slide Manchester Museum Partition Project presentation. Its PowerPoint has raster slide images and three embedded H.264/AAC MP4 videos, not editable text/shapes. Preserve image layers, original artwork colours, native slide aspect ratio, coordinates, slide order and embedded media. Render actual HTML image/video elements with slideshow controls. Do not claim a general PowerPoint engine or invent animations. See SOURCES.md.

## Non-negotiable design logic: geometry first, text second

1. Design the **placement, width, height and relative proportions** of web elements in CSS first. Responsive breakpoints intentionally establish a new geometry; content must not arbitrarily resize it.
2. A constrained text box is the input, not the output. **Fit the text to the box, not the box to the text.** Use actual **Cheng Lou Pretext** measurement as the primary fitting method. `assets/js/fit.js` is the one fitting implementation.
3. Mark fixed text boxes with `data-fit`, `data-fit-min`, `data-fit-max`, optional `data-fit-line` and `data-fit-single`; put the plain text in a child span. ResizeObserver watches the box. Pretext caches prepared text and a bounded binary search chooses the largest fitting type size. Font family, style, weight, letter spacing and line height must match CSS.
4. Define readable lower bounds. If variable names/status labels cannot fit at that bound, use measured grapheme truncation or a compact label, retaining full text in accessible text/title. Do not shrink essential information to illegibility. Biography must remain complete at the tested widths. No guessed character counts, trial-and-error font breakpoints, overflow hidden as the only solution, or text-driven panel expansion.
5. Verify both dimensions in the rendered browser, after font loading and resizing. A missing Pretext import is not proof of fitting. Keep readable CSS as a failure fallback and report the unavailable library rather than claiming it worked.
6. Site chrome is black (#000) with white (#fff) type and restrained neutral secondary text/rules. No gradients, decorative cards, heavy rounding, dashboards or needless animations. Original presentation artwork is exempt from recolouring to preserve fidelity.
7. Use existing elements and one shared stylesheet. Minimum touch targets 44–48px, keyboard access, focus states and reduced-motion support remain required. Ordinary document scrolling is allowed; overflowing text must never force a fixed control to grow or introduce horizontal scrolling.

## Skills and when to use them

| Resource | When and how |
| --- | --- |
| [Ponytail](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md) | Every implementation, fix and review: existing code → native/standard APIs → existing dependencies → minimum new code. YAGNI and KISS. |
| [Uncodixfy](https://github.com/cyxzdev/Uncodixfy) | Every visible UI choice. Restrained utility controls, existing visual language, minimal hierarchy. |
| [Pretext](https://github.com/chenglou/pretext) | Runtime text fitted to fixed geometry. This is a library, not an invented skill file. Read its actual README/API and use the pinned package. |
| [VDO.Ninja SDK](https://github.com/steveseguin/ninjasdk) | Phone pairing / WebRTC data channels only. Read its API before modifying the transport. |

Install/load relevant skills using the agent's existing mechanism, or read their actual instructions. Do not create a skill manager or add irrelevant Rust/Tauri dependencies to this static website.

## Small architecture

- `index.html`, `styles.css`: biography, Instagram and presentation entry points.
- `assets/js/fit.js`: geometry-first Pretext fitting.
- `presentations/index.html`: presentation list.
- `presentations/beyond-the-line/`: display/player route.
- `presentations/controller/`: noindex viewer-first join route. QR participants immediately follow the owner display; Show controls is unchecked by default. Checking it reveals a named control request, not an automatic grant. Session identifiers stay in the URL fragment.
- `presentations/deck.js`: load a published manifest, or locally import the supplied image/video PPTX using fflate. It does not execute Office macros, links or embedded programs.
- `presentations/player.js`, `controller.js`, `transport.js`: one authoritative display, one approved presenter, VDO.Ninja data-only connection, no camera/microphone. The phone sees a small composited slide preview and sends commands, not a second unsynchronised playback.
- `assets/beyond-the-line/`: converted slide/media assets and deck.json; generated by `For-AI/scripts/import_presentation.py` from the original PPTX. Browser-local PowerPoint opening is implemented and uploads nothing; actual fflate integration still needs a network-enabled browser check.
- Existing journal URLs and RSS remain available. No CMS, database, login service, analytics or general presentation framework.

Runtime dependencies are pinned: Pretext 0.0.9 (MIT), fflate 0.8.2 (MIT), qrcode-generator 1.4.4 (MIT), VDO.Ninja SDK 1.5.5 (MPL-2.0). Served by jsDelivr; source links and third-party limitations are in SOURCES.md. Pin upgrades deliberately. No third-party fonts. QR is generated locally, never by an external QR-image service.

## Handshake and command contract

Open the presentation from the landing-page preview. That browser tab owns the session; its adjacent viewer QR and Connect phone dialog refer to the same session. QR participants join as passive viewers without entering a name. Show controls is off by default on both display and viewers. A viewer may opt in, enter a name and request control; only an explicitly approved peer can send accepted commands. Approval disables and hides local display controls and leaves every other viewer read-only. The display broadcasts one authoritative slide, blackout and media state to every joined peer, not only the controller. Matching published decks render at full quality with media clock correction; otherwise viewers use the display preview. Audience audio is muted. Release/revoke/heartbeat expiry removes control without automatically enabling someone else. Validate sender, grant, action and increasing sequence. A copied display URL in a new browser becomes a viewer; same-browser duplicate ownership is also guarded by a Web Lock. Unrelated visitors without a session link are not claimed to belong to one global room.

Required commands: previous/next/first/last, play/pause, media hotspots, seeking, sound, black screen and fullscreen request. Fullscreen/cinema is presentation-only: no application controls, dialogs, or loading chrome. The phone can leave native fullscreen or toggle a clean cinema view; entering native fullscreen still needs a local gesture. Control requests arriving during fullscreen wait until the display exits fullscreen, rather than interrupting the projection. Audible playback may need initial activation on the display. Do not claim WebRTC messages bypass browser gesture rules.

## Publishing and asset transfer

Use the V.2 direct publisher for exact changed paths to `GeorgeFejer91/creations-of-ra`, branch main; do not retarget unrelated repositories or publish `.chatgpt/`. Verify remote SHA and the deployed site with the expected text. Keep commits coherent. Read an existing workflow before changing it.

Canonical source on the PC: `assets/Beyond_the_Line_Rabia_Saleemi.pptx` (41,815,513 bytes). The loader automatically tries that exact case-sensitive public URL first, then `assets/beyond-the-line/deck.json`, then the legacy `assets/beyond-the-line.pptx`. Presence on the PC is not public hosting. On 2026-09-18 the V.2 direct publisher returned `file_too_large` for this exact canonical path; the asset was not uploaded by this change. Do not bypass or disguise that limit. Player code and source-media publication have separate completion states. Browser-local opening remains a fallback, not an upload.

For local conversion: `python For-AI/scripts/import_presentation.py PATH_TO_PPTX`. Output is the exact embedded media plus a geometry manifest; no screenshots are used as a substitute for the embedded videos. Test before publishing. All future orchestration stays in this folder.
