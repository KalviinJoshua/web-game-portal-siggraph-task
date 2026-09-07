# 🚀 Nebula Runner

A browser-based **3D endless space runner** built with [Three.js](https://threejs.org/), HTML5, CSS3 and vanilla JavaScript. Pilot your spacecraft through an endless cosmic corridor — dodge procedurally spawned asteroids, collect energy crystals, grab power-ups and survive the storm for as long as you can.

Built as a portfolio piece for the **ACM SIGGRAPH Game Lab**.

### 🔗 Project Links

**Live Demo:**
[Play Nebula Runner](https://web-game-portal-siggraph-task-fqsf9yxfg-kalviinjoshuas-projects.vercel.app/)

**GitHub Repository:**
[View Source Code](https://github.com/KalviinJoshua/web-game-portal-siggraph-task)

## ✨ Features

- **Real 3D gameplay** — a genuine Three.js WebGL scene (not a 2D fake): procedural ship, asteroids, crystals and power-ups, dynamic lighting, fog and additive particle effects.
- **Endless, procedural corridor** — obstacles and pickups spawn on the fly; no two runs are the same.
- **Three-lane movement + free vertical hover** with smooth, frame-independent motion.
- **Progressive difficulty** — Easy → Medium → Hard → Extreme as you travel further, with rising speed and spawn density.
- **Power-ups**
  - 🛡️ **Shield** — 5s of collision immunity.
  - ⚡ **Energy Boost** — 8s of 2× score.
  - ◷ **Time Dilation** — 4s of slowed obstacles.
- **Full HUD** — score, distance, personal best, hull, speed and power-up status, updated with change-detection so the DOM is only touched when a value changes.
- **Scoring** — distance + crystals (+100) + power-ups (+250), doubled while Energy Boost is active.
- **Energy / survival loop** — energy drains over time; crystals refuel you; running dry costs hull integrity.
- **Game states** — animated hub, loading, start, playing, pause (P / Esc), and game-over with a run summary. Restart is instant — no page reload.
- **Leaderboard** — local by default (works offline, zero config), with an optional global backend (see below).
- **Responsive** — 320px phones to large desktops; the HUD reflows and on-screen touch controls appear on touch devices.
- **Accessible** — semantic HTML, real `<button>`s, keyboard navigation, visible focus states, `prefers-reduced-motion` support and high-contrast text.

---

## 🎮 Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move between lanes | `A` / `D` or `←` / `→` | ◄ ► buttons |
| Hover up / down | `W` / `S` or `↑` / `↓` | ▲ ▼ buttons |
| Use ready power-up | `Space` | **Use** button |
| Pause / resume | `P` or `Esc` | ❚❚ button |

---

## 🛠️ Tech Stack

- **[Three.js](https://threejs.org/)** — WebGL 3D rendering
- **[Vite](https://vitejs.dev/)** — dev server & build tooling
- **Vanilla JavaScript (ES modules)** — no UI framework
- **HTML5 & CSS3** — semantic markup, custom-property design system, glassmorphism UI

---

## 🚀 Getting Started

Requires **Node.js 18+**.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (http://localhost:5173)
npm run dev

# 3. Build for production (outputs to dist/)
npm run build

# 4. Preview the production build locally
npm run preview
```

---

## 🌐 Optional: Global Leaderboard (Supabase)

The game ships with a **local leaderboard** stored in the browser, so it works with zero configuration. To enable a **shared global leaderboard**, connect a free [Supabase](https://supabase.com/) project:

1. Create a table named `nebula_scores` with columns `name` (text), `score` (int8), `distance` (int8).
2. Copy `.env.example` to `.env` and fill in your values:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_LEADERBOARD_TABLE=nebula_scores
   ```

3. Restart the dev server. The leaderboard badge switches from **LOCAL** to **GLOBAL** automatically, and remote failures fall back to local storage so a run is never lost.

> **Security note:** never commit your `.env`. The Supabase _anon_ key is a public client key by design, but real secrets (e.g. service-role keys) must never be placed in client code. `.env` is already git-ignored.

---

## 📁 Project Structure

```
nebula-runner/
├─ index.html              # Hub markup + app root
├─ vite.config.js
├─ .env.example            # Optional Supabase config template
└─ src/
   ├─ main.js              # AppController: hub <-> game navigation & wiring
   ├─ style.css            # Design system + all component styles
   ├─ game/                # Simulation & rendering
   │  ├─ Game.js           #   orchestrator: loop, camera, state machine
   │  ├─ GameState.js      #   states + per-run data
   │  ├─ Constants.js      #   tunable gameplay / render constants
   │  ├─ Player.js         #   spacecraft
   │  ├─ Obstacle.js       #   asteroids
   │  ├─ Collectible.js    #   energy crystals
   │  ├─ PowerUp.js        #   power-up pickups
   │  ├─ SpawnManager.js   #   procedural spawning
   │  ├─ CollisionManager.js
   │  ├─ ObjectPool.js     #   reuse pool (no per-frame allocation)
   │  ├─ World.js          #   corridor, stars, lighting
   │  ├─ Effects.js        #   particle bursts
   │  ├─ Textures.js       #   procedurally-generated textures
   │  └─ InputManager.js   #   keyboard + touch input
   ├─ ui/                  # DOM overlays (framework-free)
   │  ├─ GameHub.js   HUD.js         LoadingScreen.js  StartScreen.js
   │  └─ PauseMenu.js GameOver.js    Leaderboard.js    TouchControls.js
   ├─ services/
   │  └─ LeaderboardService.js   # local / global leaderboard
   └─ utils/
      └─ dom.js  Storage.js  Performance.js  MathUtils.js
```

---

## ⚡ Performance Notes

- **Single `requestAnimationFrame` loop** drives the whole game; all motion uses **delta time** (clamped to avoid tunneling after tab switches).
- **Object pooling** for asteroids, crystals and power-ups — entities are recycled, never allocated mid-run.
- **Shared geometries & materials**, and **`THREE.Points`** for the star field.
- **Capped pixel ratio** (`min(devicePixelRatio, 2)`) for sharp visuals without over-drawing on high-DPI screens.
- **Change-detecting HUD** — the DOM is updated only when a displayed value actually changes.
- **Full teardown on exit** — geometries, materials, textures, the renderer and event listeners are all disposed, so returning to the hub and replaying leaks nothing.

---

## ♿ Accessibility

- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) and real `<button>` elements.
- Full keyboard support with visible `:focus-visible` states.
- Respects `prefers-reduced-motion` (star fields hold still, transitions soften).
- Player callsigns are validated and rendered with `textContent` — never `innerHTML` — so they cannot inject markup.

---

## 📦 Deployment

`npm run build` produces a static `dist/` folder that can be hosted anywhere — GitHub Pages, Netlify, Vercel, itch.io, or any static server. `base: './'` in `vite.config.js` keeps asset paths relative, so it also works from a subpath.

---

## 📄 License

MIT. Built for the **ACM SIGGRAPH Game Lab**.
