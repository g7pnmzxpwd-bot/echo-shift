# ECHO//SHIFT — 36-Round Campaign

The campaign is organized as six chapters of six rounds. Every round is defined as data and rendered by the same deterministic simulation scene.

## Progression

| Chapter | Rounds | Name | Required echoes | Spatial lesson |
| --- | ---: | --- | ---: | --- |
| 1 | 01–06 | Calibration | 1 | Learn one plate, one gate, and route variation |
| 2 | 07–12 | Dual Signal | 2 | Hold two distant plates simultaneously |
| 3 | 13–18 | Cross Current | 2 | Cross horizontal barriers through side channels |
| 4 | 19–24 | Phase Array | 3 | Satisfy staged requirements across two gates |
| 5 | 25–30 | Time Compression | 3 | Navigate a two-gate zigzag under a longer route budget |
| 6 | 31–36 | Full Chorus | 4 | Coordinate four color-coded echoes through a two-stage finale |

Each round varies plate locations, gate openings, path orientation, loop time, and dependency graph. Later gates may require more plates than earlier gates, so the room visibly opens in stages.

## Level contract

A `LevelDefinition` declares:

- stable round and chapter identity,
- title and HUD copy,
- loop duration,
- echo cap and par,
- spawn and exit points,
- wall rectangles,
- pressure plates,
- vertical or horizontal gates,
- plate IDs required by each gate.

The scene has no round-specific coordinates. It creates walls, circuits, plate colors, segmented gate animation, collision, HUD counters, intro copy, and completion behavior from the definition.

## Progress and selection

- Completing a round unlocks the next round.
- Completion and highest unlocked round are stored in `localStorage` under `echo-shift-progress-v1`.
- The campaign matrix shows six chapter blocks and all 36 rounds.
- Cards distinguish locked, available, complete, and current states.
- `?round=N&qa=1` directly loads a round for deterministic QA and review captures without writing completion to the campaign save.
- A normal `?round=N` URL is clamped to the highest sequentially unlocked round.
- Invalid, manipulated, or non-contiguous saves are normalized back to the contiguous completion prefix.

## Automated guarantees

`src/game/levels/levels.test.ts` checks:

- exactly 36 unique sequential IDs,
- exactly six rounds in each chapter,
- valid plate and gate references,
- echo cap and par consistency,
- all geometry inside the playfield,
- no plate/wall overlap,
- every required plate is reachable from spawn while gates are closed,
- the exit is reachable from spawn when gates are open.

The reachability checks use a player-radius-aware grid BFS. This proves static geometry and reference validity, not puzzle quality.

Browser tests add runtime evidence:

- `campaign-smoke.mjs` loads rounds 1, 7, 13, 19, 25, 31, and 36 in isolated QA mode, validates the 36-card selector, and proves that a fresh normal `?round=36` request remains locked to round 1.
- `multi-echo-playthrough.mjs` solves rounds 7, 19, and 36 with real keyboard input, proving two-, three-, and four-echo gate coordination plus completion-state emission without mutating the save.
- `mobile-smoke.mjs` completes round 1 through the DOM touch controls at 390×844 and validates the mobile 36-card selector.
- `playthrough.mjs` solves round 1 and verifies victory restart.

Human balance and enjoyment still require direct play; those cannot be proven by BFS or scripted movement.
