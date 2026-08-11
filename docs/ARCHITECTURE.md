# ADR 001 — Authoritative Echo Recording

**Status:** Accepted for competition MVP  
**Date:** 2026-08-12

## Context

Two reliable replay architectures were considered:

1. Record normalized input and run every echo through the deterministic simulation.
2. Sample the live actor's transform at 20 Hz and replay ghosts as kinematic actors.

Input replay is compact and can expose simulation regressions, but it couples every saved echo to collision ordering, gameplay constants, and level revision. It also creates more implementation and migration work before the submission deadline.

Transform replay gives exact visible choreography, keeps ghosts non-solid, and is already proven in the automated vertical-slice playthrough. Pressure plates read the displayed ghost position, so interaction semantics remain explicit.

## Decision

Use **20 Hz transform snapshots as the authoritative competition-MVP recording**.

- The current player uses fixed-tick kinematic movement and collision.
- Echoes replay immutable `{x, y, facing, action}` frames.
- After an early shift, an echo holds its final frame.
- Console interactions will be recorded as explicit timestamped events rather than inferred from transform proximity.
- Echoes remain non-solid and do not trigger hazards or finish exits.

## Guardrails

- Gameplay time is simulation-tick based, never wall-clock based.
- Pause simulation when the document is hidden before mobile release.
- Level definitions will carry a revision when replay sharing is introduced.
- Add replay tests for early-shift hold, event timing, reset determinism, and long-run drift.
- Reconsider input replay only if runtime collision-dependent echoes become a deliberate mechanic.

## Consequences

This prioritizes judge-facing reliability and shipping speed over compact replay payloads. It avoids a speculative rewrite while leaving a clear path for later diagnostics and replay sharing.
