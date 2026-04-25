# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Astro + Preact children's minigame app targeting 5-year-olds. Mobile-first (phones & tablets) with large touch targets and stress-free gameplay — no penalties, no game-over, wrong answers just shake/boing and let the child retry.

Seven games ship today, grouped by skill:

- **Letters**: Balloon Pop (tap the target letter balloon), Animal Match (pick the starting letter of an animal).
- **Numbers / sequencing**: Number Train (fill the missing number).
- **Counting**: Feed the Monster (count cookies up to a target).
- **Math (addition, sum ≤ 10)**: Apple Adder (pick the sum), Sum Bubbles (pop the correct number), Cookie Bake (drag cookies into an oven).

Full per-game reference: `docs/games.md`.

## Commands

- `npm run dev` — start dev server at localhost:4321
- `npm run build` — static build to dist/
- `npm run preview` — preview the production build locally

## Architecture

**Two patterns for interactive games:**

1. **Astro component + inline `<script>`** — for games that don't need reactive state (BalloonPop, SumBubbles). The component has markup + CSS import; a `<script>` tag runs vanilla TS on the client. Import sounds via ESM (`import { playPop } from '../utils/sounds.js'`).
2. **Preact island (.tsx)** — for games needing state management or drag-and-drop (NumberTrain, MonsterFeed, AppleAdder, CookieBake). The page wrapper uses `<Component client:load />` to hydrate. Use `class` (not `className`) in Preact JSX. Preact hooks only — no external stores.

**Shared layout:** `src/layouts/GameLayout.astro` wraps every game page with a nav bar (HOME button + title). It sets `<body class="game-page">`, which activates the global flex lock (below).

**Scroll lock (important):** Games must never scroll. In `global.css`:

```css
body.game-page { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }
body.game-page main { flex: 1; min-height: 0; overflow: hidden; }
```

Every game container then just uses `height: 100%; overflow: hidden` — *never* `calc(100dvh - 56px)`. This is the robust way to account for the top-bar's variable height on notched iPhones (safe-area padding-top). The home page (`index.astro`) does not use GameLayout, so it scrolls normally.

**Sound system:** `src/utils/sounds.js` provides Web Audio API synthesized tones and `SpeechSynthesis` for voice prompts. AudioContext is lazy-initialized on first user gesture.

- `playPop()`, `playCheer()`, `playBoing()`, `playDing()`, `playSparkle()`, `playWhoosh()`
- `playCrunch(pitch = 1)` — optional pitch multiplier so repeated crunches can climb in pitch
- `speakLetter(letter)`, `speakPhrase(text)` — TTS

**Styling:** Vanilla CSS with custom properties in `src/styles/global.css`. Mobile-first with a 768px breakpoint. No CSS framework or preprocessor. Game styles live in per-game files imported from the component. Key tokens: `--color-bg` (#FFF8E7), `--color-primary`, `--color-secondary`, `--color-accent`, `--color-success`, `--color-purple`, `--color-nav-bg`, `--touch-min` (64px), `--radius` (16px), `--radius-full` (9999px). Font is Nunito.

**Drag-and-drop pattern (Preact):** Used in NumberTrain, MonsterFeed, CookieBake. Store `dragging: id | null` + `dragPos: {x, y} | null` in state. On `pointerdown`, preventDefault and set both. In a `useEffect` keyed on `dragging`, attach document-level `pointermove` / `pointerup` / `pointercancel`. Render a fixed-position "ghost" element at `dragPos`. On pointerup, hit-test against a target's `ref.current.getBoundingClientRect()`.

**Math-game helper:** Addition games enforce sum ≤ 10 with:

```js
const a = 1 + Math.floor(Math.random() * 8);        // 1..8
const b = 1 + Math.floor(Math.random() * (10 - a)); // 1..(10-a)
```

Distractor options should be within ±2 of the sum and clamped to 1..10.

**Adding a new game:** Create `src/components/<Name>.(astro|tsx)`, `src/pages/<name>.astro`, `src/styles/<name>.css`. Add a card to the grid in `src/pages/index.astro` plus a `.card-<name>` gradient rule. Use `height: 100%` + `overflow: hidden` on the root container. For Preact islands, the page wrapper passes `client:load`; for Astro-only components, no directive is needed.
