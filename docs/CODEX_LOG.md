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
