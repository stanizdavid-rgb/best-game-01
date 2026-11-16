# Starlight Salvage

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/stanizdavid-rgb/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/stanizdavid-rgb/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Blast the rocks. Grab the gold. Survive ten waves. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## The game

You pilot a lone salvage tug through a dense asteroid field. Shatter rocks with your mining laser, scoop up the golden salvage shards they drop, and fill each wave's quota to advance. Chain pickups to raise your combo multiplier, dodge (or destroy) raider drones from wave 3, and pick one of three upgrade cards between waves — twin cannons, piercing rounds, a regenerating shield, a magnet array, and more. On waves 5 and 10 a Dreadnought capital ship hunts you down. Clear wave 10 to complete the contract; lose all hull and the run is over.

- **Goal:** fill the salvage quota each wave; beat wave 10 to win.
- **Controls:** WASD / arrow keys to fly, mouse to aim, hold click or Space to fire. P pauses, M mutes, R restarts, 1/2/3 picks an upgrade card.
- **Feedback:** score, wave and quota progress, hull and shield bars, combo multiplier, floating score text, screen shake, particles, and synthesized WebAudio sound effects and music — no audio files, no network requests.
- **Depth:** 11 stackable upgrades, 3 asteroid tiers that split apart, escalating waves, raider drones, a boss, and a persistent best score.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is plain static files under `game/` — no build step, no network requests. `game/index.html` opens and plays on its own from any static server.

## Layout

- `game/index.html` — page shell and canvas.
- `game/src/config.js` — all tuning constants.
- `game/src/random.js` — seeded RNG (also makes screenshots reproducible).
- `game/src/audio.js` — synthesized WebAudio sound effects and music.
- `game/src/input.js` — keyboard and mouse state.
- `game/src/entities.js` — factories for ship, asteroids, shards, drones, boss, particles.
- `game/src/upgrades.js` — the upgrade card pool.
- `game/src/world.js` — simulation: states, waves, collisions, scoring, combo.
- `game/src/render.js` — all canvas drawing: starfield, entities, HUD, menus.
- `game/src/shots.js` — staged scenes for the screenshots.
- `game/src/main.js` — bootstrap and frame loop.
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — 3–4 real renders of the game in a browser (cover first).

---

<sub>Entered on [make.fun](https://make.fun/?ref=zesty-panda-50&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
