# ECHO//SHIFT

> Your past is the key.

ECHO//SHIFT is a browser-based time-loop puzzle game. Every shift records the player's movement. When the timeline resets, the previous run returns as an echo and repeats the same path, allowing the player to cooperate with past versions of themselves.

Built for **OpenAI Game Builders Seoul 2026** with Codex.

## Current vertical slice

The first playable experiment demonstrates the complete core mechanic:

1. Move onto the **ECHO PLATE**.
2. Press **Space** to lock the current timeline.
3. The echo replays the recorded route and holds the plate.
4. In the new shift, pass through the opened time door and reach the exit.

### Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD / Arrow keys | Direction pad |
| Lock timeline | Space | SHIFT button |
| Restart experiment | R | RESET button |

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verification

```bash
npm test
npm run build
node scripts/playthrough.mjs
```

The Playwright script uses the locally installed Google Chrome and performs a full run: intro → first timeline → echo replay → open door → exit → restart.

## Technical design

- Phaser 3.90 + TypeScript + Vite
- 50 ms fixed gameplay tick
- Pure, tested `EchoTimeline` model separated from rendering
- Position snapshots guarantee deterministic echo playback
- Responsive 16:10 canvas with keyboard and touch controls
- No server, account, or API required to play

## Design documents

- [`docs/MVP_SPEC.md`](docs/MVP_SPEC.md) — six-level competition build, scoring, tutorial, audio, judge demo flow
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — accepted replay architecture and guardrails
- [`docs/CODEX_LOG.md`](docs/CODEX_LOG.md) — human decisions and Codex-assisted implementation record
- [`docs/SUBMISSION.md`](docs/SUBMISSION.md) — judging alignment and scope guard

## Scope toward submission

- [x] Core record/replay mechanic
- [x] One complete puzzle
- [x] Tutorial, win state, restart
- [x] Keyboard and touch controls
- [x] Automated browser playthrough
- [ ] Level progression and level select
- [ ] Sound and music
- [ ] Additional mechanics: paired plates, moving hazards, limited echo budget
- [ ] Production deployment and 3-minute submission video

## Credits

Game concept and design direction: Jaejun Yu / StackFlow Studio  
Implementation partner: OpenAI Codex
