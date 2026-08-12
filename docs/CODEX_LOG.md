# Codex Development Log

This log separates human creative decisions from Codex-assisted implementation for the OpenAI Game Builders Seoul submission.

## 2026-08-12 — Vertical slice 00.01

### Human-directed decisions

- Enter the competition with a small, polished browser game rather than a large-scope project.
- Use a time-loop cooperation mechanic instead of making the game itself an LLM wrapper.
- Optimize the first three minutes for immediate comprehension and judge playability.
- Select the title **ECHO//SHIFT** and the premise **“Your past is the key.”**
- Require public browser play, no login, keyboard and mobile controls.
- Use a restrained sci-fi diagnostic visual language: dark navy field, cyan echoes, amber player, magenta locked doors, green exits.

### Codex-assisted work

- Scaffolded Vite, TypeScript, Phaser, and Vitest.
- Implemented the fixed-tick `EchoTimeline` record/replay model using test-driven development.
- Created the first room, collision geometry, pressure plate, time door, exit, HUD, onboarding, and victory state.
- Added responsive touch controls.
- Built an automated Playwright/Chrome playthrough.
- Used rendered screenshots to find and correct:
  - a test automation key-duration issue,
  - a victory restart input bug,
  - a delayed overlay race,
  - stale objective text after restart,
  - a missing favicon request.

### Verification evidence

- Vitest: 4 tests passed.
- TypeScript + Vite production build: succeeded.
- Automated Chrome run: one canvas, zero console/page errors, full level completion and restart.
- Visual checkpoints: start tutorial, echo creation, victory, post-victory reset.

### Human review still required

- Tune movement feel with direct human play.
- Decide whether future levels emphasize precision, planning, or speed.
- Select final sound palette and music direction.
- Approve final level order, trailer cut, and submission copy.

## 2026-08-12 — Environmental detail pass 00.02

- Preserved the dark temporal-lab art direction while increasing environmental specificity.
- Added functional circuit wiring from the echo plate to the time gate; active state carries a moving energy pulse.
- Rebuilt the gate as a segmented mechanical barrier that retracts sideways.
- Added layered plate rings, calibration ticks, wall fasteners, room bay labels, floor particles, and exit aperture framing.
- Added a restrained amber movement trail and more detailed player/echo silhouettes.
- Re-ran unit tests, production build, automated completion/restart, and screenshot QA with zero browser errors.

## 2026-08-12 — Campaign expansion 00.03

### Human-directed decisions

- Expand to 36 rounds rather than pad the game to an arbitrary 40.
- Organize progression as six chapters of six rounds.
- Preserve the proven 20 Hz transform replay instead of rewriting to input replay during the competition window.
- Keep progression local and login-free.

### Codex-assisted work

- Refactored the hardcoded room into a `LevelDefinition`-driven scene.
- Authored six spatial families covering one through four simultaneous echoes, horizontal and vertical barriers, and staged two-gate dependencies.
- Added localStorage unlock/completion state and a 36-card campaign matrix.
- Added player-radius-aware BFS validation for plate and exit reachability.
- Added representative scene-load smoke tests and real keyboard multi-echo solutions.

### Verification evidence

- Vitest: 9 tests passed across timeline and level-pack contracts.
- Level pack: 36 unique rounds, six chapters, valid links and geometry.
- Chrome campaign smoke: rounds 1, 7, 13, 19, 25, 31, and 36 loaded with zero page/console errors.
- Chrome solved rounds 7, 19, and 36 using two, three, and four committed echoes respectively.
- A 390×844 touch context solved round 1 through the visible mobile controls and rendered all 36 selector cards.
- Mobile QA exposed a pointer-capture exception path; capture is now best-effort so touch input is always dispatched.
- Round 1 keyboard completion and restart regression remained green.
- TypeScript and Vite production build succeeded.

### Honest limits

- BFS proves static reachability, not enjoyment or ideal difficulty.
- Three representative multi-echo rounds were solved automatically; the full 36 still require a direct human balance pass.
- Sound, public deployment, and submission video remain outside this milestone.

## 2026-08-12 — Independent review hardening 00.03.1

- Gated direct round loading behind explicit `qa=1`; normal deep links now respect the sequential unlock boundary.
- Prevented QA-mode completions from mutating the real campaign save.
- Replaced duplicated weak progress parsing with a tested `ProgressStore` that derives unlock state from contiguous completion.
- Added DOM phase markers so browser tests wait for intro/play/complete state instead of racing canvas startup.
- Added a fresh-profile regression proving `?round=36` resolves to round 1 with 35 cards locked.
- Cancelled delayed HUD status callbacks during restart and completion.
- Verification after review: 14/14 unit tests, production build, campaign smoke, 2/3/4-echo solutions, keyboard round-1 playthrough, and mobile touch completion all passed.

## 2026-08-12 — Difficulty curve rebalance 00.03.2

- Player feedback correctly identified that later rounds became easier despite more objects: chapter 5 increased loop time to 17 seconds, plates stayed in simple parking rows, and the two gates did not add new reasoning stages.
- Reauthored rounds 13–36 as true staged-access puzzles: two gates from chapter 3, three sequential gates from chapter 4, mixed-orientation three-stage routing in chapter 5, and four cumulative gates in chapter 6.
- Later echoes must now wait for earlier echoes to open access, then cross the opening before turning toward their own plate; simple independent parking no longer solves representative late rounds.
- Added fixed-point staged reachability validation that rejects a gate whose required plate is trapped behind itself.
- Added a difficulty contract test covering average decision steps, gate-stage counts, loop budgets, and shrinking openings.
- Updated real-browser solution certificates for rounds 19 and 36 with synchronized delays and gate-crossing waypoints.
- Structural escalation is automated; subjective enjoyment and exact frustration level still require human full-campaign playtesting.
