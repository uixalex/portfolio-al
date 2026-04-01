# AL Portfolio — UI/UX Designer

## Overview

Minimalist, dark-theme portfolio for UI/UX designer Aleksandra Lazarević (AL).
Visual language is intentionally restrained and technical — IBM Plex Mono for body text,
Barlow Condensed for headlines, black background, white elements, glitch aesthetic.
The site is meant to feel precise and creative simultaneously.

Navigation is single-page: Home / Work / About / Contact — pages switch without reload,
all markup lives in one HTML file.

---

## Pages

### Home
Central interactive animation: 4 puzzle pieces float around the screen and assemble
when the user moves the mouse toward the center. After assembly — shockwave effect
(expanding rings + white flash), followed by an explosion into 40 mini puzzle pieces
that scatter across the screen and continue floating forever.
`[ THIS WAY ]` label appears 1.5s after explosion, types out character by character,
and links to the Work page.

Headline types out via typewriter effect:
- COMPLEX PROBLEMS.
- CLEAR DESIGN.
- MEMORABLE RESULTS.

### Work
Project list with puzzle-shaped preview image appearing beside each project title on hover.
SVG clipPath gives each project a unique puzzle piece shape.

Projects:
- Quackables — brand identity & product design (2024)
- NBA Ultimate 5 — AI-driven fan engagement platform (2022)
- Creator Sports Network — scalable creator-driven sports broadcasting (2024)
- Nike Cryptokicks — NFT sneaker drop experience (2022)

### About
Canvas animation with profile photo that reacts to hover (glitch effect with RGB channel shift).
Designer bio, interests, and background text.

### Contact
Email link + social networks.

---

## Home Animation — Technical Details

Everything is drawn on `<canvas id="ripple-canvas">` inside `#page-home`.

### Animation Phases
1. **Intro** — 4 puzzle pieces fade in with staggered delays
2. **Float** — each piece floats independently (sin/cos oscillation, own phase/speed/amplitude)
3. **Assembly** — mouse moves toward center → pieces lerp toward assembled target positions
4. **Shockwave** — `assembled > 0.97` → 3 expanding ring waves + white flash
5. **Explosion** — 700ms after shockwave → 40 mini pieces (10 per original piece) spawn near each of the 4 assembled piece positions and scatter outward radially
6. **Perpetual float** — mini pieces slow via drag and continue drifting forever with gentle sin/cos oscillation on top of remaining velocity
7. **`[ THIS WAY ]` label** — appears 1.5s after explosion, types out character by character, click navigates to Work page

### Mini Pieces Behavior
- 40 pieces total (10 per original puzzle piece)
- Spawn near each original piece's assembled position (`tx ± w*1.4`)
- Spread angle is radial from center ± 1.4 rad randomness
- Speed: `2 + Math.random() * 3.5`
- Drag: `0.982 + Math.random() * 0.008` (gentle deceleration)
- Float oscillation: `floatAmp: 6–14px`, applied continuously on top of velocity
- No settled/clamping logic — pieces drift wherever physics takes them
- Mouse repulsion: pieces within 120px of cursor are gently pushed away
- Colors: yellow, red, cyan-green, cream-white (semi-transparent)

### Performance Decisions
- Removed `getImageData/putImageData` from `drawPieceGlitch()` (tear effect) and `drawBg()` — caused severe slowdown (~280 GPU→CPU readbacks per frame)
- Mini pieces use `drawMiniPieceGlitch()` — flat fill only, no getImageData at all
- 40 mini pieces instead of original 100
- Background glitch lines use only `fillRect` (cheap) — expensive scanline shift removed

### Z-Index Architecture
- `header` — `position: fixed; z-index: 500; background: transparent`
- `.status-bar` (footer) — `position: fixed; z-index: 500; background: #040404`
- `.page` — `position: fixed; z-index: 1`
- `#ripple-canvas` — `position: absolute; z-index: 2` (inside .page)
- `.menu-overlay` — `position: fixed; z-index: 300`
- `.center-label` — `position: absolute; z-index: 10` (inside .page)

Canvas height is constrained to `calc(100vh - var(--bar-h) - var(--sb-h))` —
does not extend behind header or footer. Header and footer cover anything that drifts behind them.

---

## Mobile (≤768px)

- Mouse-based assembly replaced with automatic animation
- After all pieces complete their intro fade-in, waits ~1 second, then ramps `targetAssembled` from 0 to 1 over 2 seconds (~120 frames)
- Touch drag supported — `touchmove` updates mouse position, allowing manual assembly by touch
- Puzzle pieces scaled to `Math.min(W,H) * 0.18` instead of `0.21`
- Background glitch intensity reduced (fewer lines, lower opacity)
- Headline typewriter (`COMPLEX PROBLEMS...`) hidden on mobile
- Shockwave, explosion, and `[ THIS WAY ]` label all work normally on mobile

---

## Navigation & Menu

- Single-page app — `goTo(page)` switches active page class, no reload
- Logo click calls `goTo('home')` + `closeMenu()` — returns to home and closes menu if open
- `goTo` checks if target page is already active — if so, skips reset and typewriter restart (prevents accidental re-trigger when clicking logo while already on home)
- Menu: MENU button in header → full-screen overlay
- Close button (✕) is in the header, absolutely positioned over the MENU button
- MENU hidden via CSS when overlay is open; ✕ shown; swap back on close
- Home link removed from menu (logo serves this purpose)
- Menu nav items: Work, About, Contact

### Social Links (all pages)
- LinkedIn: https://www.linkedin.com/in/alexlazarevic/
- Dribbble: https://dribbble.com/aleksandralazarevic
- Instagram: https://www.instagram.com/hipspace.studio/

---

## Menu Hover Effect

Nav items in menu have a chromatic aberration glitch on hover:
- Color transitions to white (`transition: color 0.3s ease`)
- Slight slide right (`transform: translateX(24px)`, `transition: 0.4s cubic-bezier`)
- One-shot glitch animation on hover entry: RGB split (`text-shadow` red/cyan offsets) plays out over 0.6s and settles

---

## Bug Fixes (development history)

| Bug | Cause | Fix |
|-----|-------|-----|
| Double spawn — new mini pieces appeared on top of old ones | `triggered` was reset by `setTimeout` after 3.2s while `assembled` stayed high, re-triggering `fireShockwave` | Removed the `setTimeout` that reset `triggered`; now only reset inside `_resetPuzzle` |
| Explosion looked like a uniform circle | All pieces started from canvas center in a uniform 360° spread | Each group of 10 pieces now starts from that piece's assembled position (`srcPiece.tx/ty`) |
| Pieces appeared dark/purple | `assembled=0` made `drawPiece` fill transparent; only RGB glitch screen-blend channels showed | Added white semi-transparent fill in `drawMiniPieceGlitch`; used cream-white as one of 4 colors |
| Performance — animation dropped frames badly | `getImageData` called ~280 times per frame for glitch tear and scanline effects | Removed all `getImageData/putImageData` from the main animation path |
| Pieces drawing over footer/header | Canvas z-index lower than footer, but pieces drawn outside canvas bounds | Header/footer cover canvas naturally; `#ripple-canvas` z-index raised to 2; JS draw clip for header zone |
| Flash on returning to Home | `_resetPuzzle` set `introProgress=1` (fully visible), then `_syncPuzzleIntro` reset it 50ms later — brief flash | `_resetPuzzle` now sets `introProgress=0; introDelay=9999` — pieces invisible until `_syncPuzzleIntro` sets actual delays |
| All animations restarted on logo click | `goTo('home')` always called reset + typewriter, even if already on home | Added `alreadyHere` check — animations only restart when navigating FROM another page |
| Mini pieces popped/respawned at footer | `triggered` reset via `setTimeout` while `exploded` was still true → new spawn triggered | Removed automatic `triggered` reset entirely; only resets in `_resetPuzzle` |
| Menu close button (✕) not working | Button was inside `menu-overlay` which has `pointer-events: none`; header (z-index 500) also blocked clicks | Moved ✕ button into header HTML; show/hide via CSS `:has()` selector |
| MENU text still visible when menu open | Header z-index 500 kept MENU button above overlay (z-index 300) | `body:has(.menu-overlay.open) .menu-btn` sets `opacity: 0; pointer-events: none` |
| Nav bar layout broken by ✕ button | ✕ inside header flex container was pushing items right | Changed `.menu-close` to `position: absolute` — taken out of flex flow |

---

## File Structure

```
portfolio_AL/
  index.html          — all markup, single-page app
  css/styles.css      — all styles
  js/main.js          — all JavaScript (navigation, home animation, work puzzle previews, about canvas glitch)
  images/
    quckables.png     — Quackables project
    nba.png           — NBA Ultimate 5
    csn.png           — Creator Sports Network
    nike.png          — Nike Cryptokicks
    profile.png       — profile photo (About page)
```

## Running Locally

Open `index.html` with Live Server in VS Code.
To set preferred browser:
`liveServer.settings.CustomBrowser: "chrome"`
