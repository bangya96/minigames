# Games Reference

Per-game reference for future contributors. Read this alongside `CLAUDE.md` (architecture) before editing or adding a game.

## Audience & Design Rules

- **Target age**: 5 years old. Mobile-only (touch-first). Assume one finger, large target zones.
- **Stress-free**: no timer-based fail state, no lives, no game-over screen. Score only goes up.
- **Wrong answer feedback**: a wobble/shake + `playBoing`. Never hide the UI or punish.
- **Right answer feedback**: `playDing` or `playPop`, then `playCheer`, optional `speakPhrase` to reinforce the concept, then a NEXT! button.
- **No scroll**: every game container uses `height: 100%; overflow: hidden`. The page-level scroll lock lives in `body.game-page` (set by `GameLayout.astro`, see `src/styles/global.css`).
- **Large touch targets**: minimum 48px, prefer 64px+ (`--touch-min`). Add `touch-action: manipulation` (or `touch-action: none` for drag surfaces) to avoid the iOS 300ms tap delay and to prevent page-pan during drag.

## Directory Layout

```
src/
  layouts/GameLayout.astro      # nav + body.game-page wrapper
  pages/
    index.astro                 # home, game cards grid (no GameLayout)
    <game>.astro                # one per game, imports GameLayout
  components/
    <Game>.astro | <Game>.tsx   # game UI + logic
  styles/
    global.css                  # tokens + scroll lock
    <game>.css                  # per-game styles
  utils/sounds.js               # Web Audio + SpeechSynthesis
public/                         # static assets (favicon, etc.)
docs/games.md                   # this file
```

## Shared Sounds (`src/utils/sounds.js`)

| Function                | Use for                                                |
| ----------------------- | ------------------------------------------------------ |
| `playPop()`             | tap / pop feedback                                     |
| `playCheer()`           | round win (4-note ascending)                           |
| `playBoing()`           | wrong answer                                           |
| `playDing()`            | correct answer chime                                   |
| `playCrunch(pitch = 1)` | eating / consuming; pass `1 + n*0.1` to climb in pitch |
| `playSparkle()`         | catch / collect (stars)                                |
| `playWhoosh()`          | transition / reveal                                    |
| `speakLetter(letter)`   | "Find the letter X!"                                   |
| `speakPhrase(text)`     | arbitrary TTS (rate 0.85, pitch 1.2)                   |

AudioContext is lazy — no sound plays until the user taps something. Don't try to initialize audio on page load.

## CSS Tokens (`src/styles/global.css`)

- Colors: `--color-bg` `#FFF8E7`, `--color-primary` `#FF6B6B`, `--color-secondary` `#4ECDC4`, `--color-accent` `#FFD93D`, `--color-success` `#6BCB77`, `--color-purple` `#9B59B6`, `--color-text` `#2C3E50`, `--color-nav-bg` `#FF8E53`.
- Spacing: `--space-sm` `0.5rem`, `--space-md` `1rem`, `--space-lg` `2rem`.
- Interaction: `--touch-min` `64px`, `--radius` `16px`, `--radius-full` `9999px`.
- Font: Nunito 600/800/900 via Google Fonts.

Breakpoint: mobile-first, scale up at `@media (min-width: 768px)`.

---

## Game-by-Game Reference

### 1. Alphabet Balloon Pop 🎈 — `/balloon-pop`

**Pattern**: Astro + inline `<script>` (`src/components/BalloonPop.astro`).
**Goal**: tap the balloon whose letter matches the target.
**Mechanics**: 7 balloons spawn, each floating up with a random delay/drift/duration. Round ends on first correct pop (confetti + NEXT). Wrong pop wobbles the balloon and plays a boing; round continues.
**Key CSS**: `.balloon-field` is `position: relative; overflow: hidden`. Balloons use `@keyframes float-up` from `bottom: -120px` to `bottom: 100%`.
**Gotchas**: balloons are absolutely positioned — don't let their `bottom` keyframe exceed 100% or they leak under the top-bar on resize.

### 2. Missing Number Train 🚂 — `/number-train`

**Pattern**: Preact island (`src/components/NumberTrain.tsx`).
**Goal**: fill the empty carriage with the number that completes the sequence.
**Mechanics**: sequence of 4–6 consecutive numbers, one replaced with `?`. Three option buttons below. Tap to select, then tap the empty carriage — or drag an option onto the carriage.
**State shape**: `{ sequence, missingIndex, answer, options, selectedOption, solved, score, wrongCarriage }`.
**Refs**: `carriageRef` points at the empty carriage for drop hit-test.
**Gotcha (important)**: the `sequence.map` must use a **keyed wrapper** (`<div class="carriage-cell" key={`cell-${i}`}>`), not a bare `<>` fragment. Without a key, Preact can mis-reconcile when the sequence length changes between rounds and the ref points at the wrong DOM node — causing taps/drops to register on a neighbor.

### 3. Animal Letter Match 🦁 — `/animal-match`

**Pattern**: Astro + inline `<script>`.
**Goal**: pick the starting letter of the animal shown.
**Mechanics**: big emoji + name + three letter tiles. Tile glows on correct, shakes on wrong.

### 5. Feed the Monster 👾 — `/monster-feed`

**Pattern**: Preact island (`src/components/MonsterFeed.tsx`).
**Goal**: feed the monster exactly `target` cookies (target climbs with score).
**Mechanics**: drag cookies into the monster OR tap them (fallback). Mouth opens while a cookie hovers over the monster; closes and wiggles on drop. Crunch pitch rises with each cookie via `playCrunch(1 + (eaten - 1) * 0.12)`.
**Refs**: `monsterRef` is the hit-test target. Drag state lives in `dragging` + `dragPos`.
**State**: `{ target, eaten, cookies, celebrating, score }`.

### 7. Apple Adder 🍎 — `/apple-adder` *(math)*

**Pattern**: Preact island (`src/components/AppleAdder.tsx`).
**Goal**: pick the correct sum of two apple baskets. Addition only, sum ≤ 10.
**Mechanics**: shows `a` apples + `b` apples, equation bar, three number options. Tap correct → solved + NEXT. Tap wrong → shake.
**Operand rules**: `a = 1..8`, `b = 1..(10 - a)` — both addends ≥ 1, sum never exceeds 10. Distractors are sum ± {1, 2} clamped to 1..10, de-duplicated.

### 8. Sum Bubbles 🫧 — `/sum-bubbles` *(math)*

**Pattern**: Astro + inline `<script>` (mirrors balloon-pop).
**Goal**: pop the bubble whose number equals `a + b`.
**Mechanics**: numbered bubbles float up (same `float-up` idea as balloons but in sky-blue). Spawn interval ~1.1s, cap 6 onscreen. Heuristic bias: if the correct answer isn't currently on screen, ~40% chance the next spawn is the correct number, otherwise random 1..10.
**Why that bias**: guarantees the round is always winnable without waiting too long, which matters for 5yo attention spans.

### 9. Cookie Bake 🍪 — `/cookie-bake` *(math)*

**Pattern**: Preact island with drag (`src/components/CookieBake.tsx`).
**Goal**: drag every cookie from two plates into an oven; the oven shows the running total as you go.
**Mechanics**: `a` cookies on plate A (red-rimmed), `b` on plate B (orange-rimmed). Each drag into `ovenRef`'s bounding rect increments the counter and plays a rising-pitch crunch. When `inOven === sum`, the oven glows green and NEXT appears.
**Why drag-only (no wrong answer)**: matches the "stress-free" rule — the learning is the tactile counting act itself. Tap-to-bake is also supported as a fallback for kids who can't drag.

---

## Adding a New Game — Checklist

1. **Pick a pattern.** Static content / animations only → Astro + `<script>`. Need drag, complex state, or list diffing → Preact `.tsx`.
2. **Create files:**
   - `src/components/<Name>.(astro|tsx)`
   - `src/pages/<name>.astro` (imports `GameLayout` + the component; Preact needs `client:load`)
   - `src/styles/<name>.css`
3. **Lock the viewport.** Root container: `height: 100%; overflow: hidden`. Do not use `calc(100dvh - 56px)` — it under-measures on notched iPhones.
4. **Use `--touch-min` (64px)** for anything tappable. Add `touch-action: manipulation` (or `touch-action: none` for drag surfaces).
5. **Sound map:** `playDing` + `playCheer` on correct, `playBoing` on wrong, `speakPhrase` on round start and on reveal to reinforce learning.
6. **Register on the home page:** add an `<a class="game-card card-<name>">` in `src/pages/index.astro` and a `.card-<name>` gradient + `.card-<name> .play-btn { color: ... }` rule.
7. **Build test.** `npm run build` — confirms no TS/import errors and that the route is emitted (`dist/<name>/index.html`).

## Common Mistakes to Avoid

- **Scrollable games.** Any `min-height: 100dvh` or `calc(100dvh - 56px)` on a game container will scroll on notched iPhones. Use `height: 100%` + the body flex lock.
- **Bare `<>` fragments inside a `.map()` with refs.** Preact can't reconcile them stably across length changes. Always use a keyed wrapper.
- **Document-level drag listeners.** On mobile Safari, touch tracking silently breaks when the finger leaves the original element. Use `setPointerCapture` + listeners on the element itself (vanilla), or document listeners wrapped in a `useEffect` keyed on `dragging` (Preact — works because the ghost lifts the finger from a button-that-disappears state).
- **Wrong answer punishes.** Never hide the UI, reset score, or block retries. Wobble + boing, keep going.
- **Math with sums > 10 or 0 operands.** Use the helper form `a = 1..8, b = 1..(10 - a)`.
- **Forgetting a card on the home page.** Add the card + gradient + play-btn color at the same time as the route.
