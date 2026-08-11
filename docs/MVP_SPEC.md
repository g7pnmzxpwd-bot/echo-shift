# ECHO SHIFT — Competition MVP Spec

> **Implementation note (2026-08-12):** The verified vertical slice currently uses a 14-second safety budget and 20 Hz transform snapshots. The six-level target below uses 8-second loops. We will reduce the budget only after direct human play confirms movement readability; no replay rewrite is required.

**One-line pitch:** Record eight seconds of yourself, rewind, then cooperate with your past selves to escape a room built like a clock.

**Target:** A no-login, desktop-browser puzzle-action game that delivers its first “I understand—and that is clever” moment in under 25 seconds and a polished full run in **2:30–3:00**.

**Build target:** Phaser 3 + TypeScript + Vite, 960×540 internal resolution, responsive letterbox, keyboard-first, Chrome/Edge/Safari.

## 1. Design pillars

1. **Become the mechanism.** The player does not command clones; they perform a run, lock it, and then work beside its exact replay.
2. **Readable choreography.** A room, timeline, ghost paths, switches, and hazards must be understandable at a glance.
3. **Fast experimentation.** Rewinding is progress, death costs under one second, and there is no hard game over.
4. **One polished idea.** Six authored rooms remix movement, position, and timed interaction; no extra systems dilute the hook.

## 2. Core loop

Each level is a single-screen room with an **8-second loop**.

1. Start at the room’s anchor with no echoes.
2. Move through the room, stand on pressure plates, and press nearby consoles.
3. Tap **Shift/R** to lock the current run as an echo and rewind the room to `t=0`.
4. The echo repeats its path and interactions on the next attempt. If the player rewound early, it holds its final position for the rest of the loop—this is intentional and makes pressure-plate solutions legible.
5. Layer up to the room’s echo cap, then use their synchronized actions to reach the open exit.
6. Clear the room, receive a 1–3 star result, and auto-advance after a 1.2-second celebration.

**Key rule:** The world resets every loop; recordings do not. Echoes can activate plates and consoles, but are non-solid, ignore hazards, cannot block the player, and cannot enter the exit. Only the current player can finish.

### Controls

| Input | Action |
|---|---|
| WASD / Arrow keys | Move in 8 directions |
| Space | Activate nearest outlined console |
| Shift or R | Lock the current run as an echo and rewind |
| Q | Clear all echoes and restart the room |
| Esc | Pause; show Resume, Restart Room, Mute, Quit |
| M | Toggle audio |

Prevent browser scrolling/default behavior for gameplay keys. Show only controls currently needed. Controller and touch input are post-MVP.

## 3. Mechanical contract

### Interactables

- **Pressure plate:** active while player/one or more echoes overlap it. Usually powers a door or disables a laser. Plate, wire, and target share a color.
- **Console:** current player activates it with Space; an echo replays that exact console event at the recorded timestamp. Consoles open a linked gate for a fixed window (default 2.0 seconds).
- **Laser/scanner:** damages only the current player. Red telegraph appears 250 ms before danger. Echoes pass through unchanged.
- **Exit:** opens when its Boolean condition is true; touching an open exit clears the level. A bright wire and ascending tone confirm open state.

### Recording/playback implementation

Favor reliability over simulation purity:

- Use scene loop time, not wall-clock time.
- Sample player `{t, x, y, facing}` at **20 Hz**; interpolate echo transforms between samples.
- Record console events as `{t, consoleId}` only after a valid player interaction. Playback invokes that console ID directly at `t`, avoiding proximity/physics drift.
- Echoes are kinematic sprites. Plate occupancy is evaluated from their interpolated positions; they do not run player collision physics.
- Reset all doors, timers, hazards, and console state at `t=0`, then begin every echo and the current attempt on the same frame.
- Rewind transition lasts 300 ms: freeze, chromatic split, right-to-left scan, reset.
- Each level defines `loopMs`, `echoCap`, `parEchoes`, exit condition, entities, and tutorial triggers in data/JSON rather than scene code.

Suggested states: `Boot → Title → LevelIntro → Playing ↔ Rewinding → LevelClear → Results`. Pause is an overlay, not a separate world reset.

## 4. Six-level progression

All rooms fit one screen. Expected first-play clear time totals roughly **125–155 seconds**, leaving room for title/results inside a three-minute judging slot.

| # / Name | Layout and required solution | New lesson | Loop / cap / par | Target time |
|---|---|---|---|---|
| **1. First Echo** | Spawn left, plate in center, exit behind a door on right. Run onto plate and rewind; echo holds it while current self walks through. | A past run can occupy space for you. | 8s / 1 / 1 | 15–20s |
| **2. Duet** | Two short side alcoves contain blue and gold plates; both power the central exit. Lock one echo on each, then take the direct center path. | Multiple recordings layer; colors/numbers identify them. | 8s / 2 / 2 | 20–25s |
| **3. On the Beat** | A safe side lane leads to a console. The direct lane is blocked by a gate. Record pressing the console around `t=3.0`; next run, arrive at the gate as the echo opens its 2.0s window. | Space interaction and timeline timing. | 8s / 1 / 1 | 18–25s |
| **4. Red Shift** | Plate disables a laser wall; a horizontal scanner sweeps the final lane with a clear red warning. Lock an echo on the plate, then cross while dodging the scanner. | Hazards affect only “now”; death is a cheap retry. | 8s / 1 / 1 | 20–25s |
| **5. Canon** | Final corridor has Gate A then Gate B. Two safe rehearsal lanes lead to consoles A and B. Record A at about `t=2.0`, B at about `t=4.8`; final run follows two opening windows in sequence. Timeline markers preview both events. | Plan a sequence, not just simultaneous occupancy. | 8s / 2 / 2 | 25–30s |
| **6. Full Chorus** | One side plate powers the exit, console A drops the center barrier at `t≈2`, console B drops the final barrier at `t≈5`; one telegraphed scanner patrols between them. Record plate, A, and B, then execute the center run as all three echoes perform. Generous 2.25s gate windows. | Mastery remix and audiovisual payoff. | 8s / 3 / 3 | 30–40s |

### Level-authoring constraints

- Critical routes should be at most 5.5 seconds, leaving recovery margin.
- Console windows must have at least 0.75 seconds of tolerance on either side of the intended crossing.
- Never require pixel-perfect plate placement; interaction zones extend 8–12 px beyond art.
- Never hide a dependency: colored floor wires connect every source to its target.
- Every room must have an obvious safe “rehearsal route” so a player can create required recordings before attempting the exit.
- Playtest each room with keyboard repeat variance and at 30 FPS throttling.

## 5. Fail, rewind, and win states

### Rewind / non-fail

- Manual Shift/R or timer expiry commits the current run if an echo slot remains.
- When at echo cap, timer expiry restarts only the current attempt; it does not overwrite a useful echo.
- Trying to commit at cap gives a short “ECHO LIMIT — Q TO CLEAR” message and restarts the attempt without changing echoes.
- Q clears echoes after a 250 ms hold, preventing accidental resets.

### Fail

- Laser/scanner contact: 120 ms hit-stop, current self fragments, then restart at `t=0` after 450 ms.
- A death **does not record** the failed attempt and preserves existing echoes.
- There is no life count or game-over screen.
- After three deaths in one room, increase hazard telegraph by 150 ms and show one contextual hint; do not alter the puzzle solution.

### Win

- Current player touches an open exit.
- Freeze all performers in silhouette, draw their completed paths for 500 ms, then pull them into the exit on the beat.
- Show room score/stars for 1.2 seconds. Space/Enter advances immediately.
- Level 6 ends on a 4-second results tableau with all echo colors, total stars, completion time, Replay, and “More shifts are coming.”

## 6. Tutorialization

Use play-space callouts, animation, and one-line text—never modal instruction cards.

1. **Title:** pulsing `PRESS ANY KEY TO BEGIN`; WASD/arrow icons drift toward a tiny exit.
2. **Level 1 start:** `MOVE` above player; fade after first movement.
3. **First plate:** room wire lights but the distant door makes leaving the plate visibly impossible. Show `SHIFT / R — LOCK THIS RUN` only while standing on it.
4. **First rewind:** camera briefly tracks the new numbered echo; show `YOUR ECHO REPEATS. REACH THE EXIT.`
5. **Level 2:** echo pips `① ②` appear beside the loop clock; no new text unless idle for five seconds.
6. **Level 3:** console pulses with a Space glyph. Its first activation plants a matching event diamond on the top timeline.
7. **Level 4 first death:** `ONLY THE PRESENT CAN BREAK.` and instant restart.
8. **Idle hint:** after five seconds without meaningful progress, pulse the next relevant object/wire. After three full resets, display a short specific hint such as `LEAVE AN ECHO ON BLUE.`

All prompts disappear permanently once learned, stored in localStorage. Include a Reset Tutorial option in pause/settings.

## 7. Scoring and replayability

Scoring should celebrate solving, not discourage experiments.

### Per-level score

`1000 clear + floor(loopTimeRemainingMs / 10) − 100 × deaths − 50 × roomClears`, clamped to a minimum of 100. Extra echoes beyond par are impossible in the authored MVP caps; speed is a secondary tiebreaker.

### Stars

- **★** Clear the room.
- **★** Use no more than `parEchoes`.
- **★** Clear with no deaths and no Q reset.

Show par before each room (`PAR: 2 ECHOES`) and explain stars only on the first result card. Store best score, stars, and time locally. Results also show a compact choreography strip—the colored console-event markers and plate holds from the winning solution—which reinforces the game’s distinctive identity.

Post-MVP replay hook: daily rooms and shareable replay codes. The recording format already makes a small deterministic replay payload, but sharing/backend work is explicitly not in the competition build.

## 8. Visual direction

**Style:** dark stage + luminous temporal diagram; sharp vector geometry instead of an asset-heavy pixel-art pipeline.

- Background: near-black navy (`#080B18`) with a faint grid and restrained scanlines.
- Current self: solid white core with cyan edge (`#62F5FF`).
- Echoes: magenta, violet, and gold in creation order; 55–70% opacity, soft trail, persistent number badge.
- Interactive wiring: same color from plate/console to door. Inactive is dim but visible; active emits moving packets toward the target.
- Hazards: red-orange only (`#FF3B57`), never reused for friendly interactions.
- Exit: white-green aperture, visibly hollow when locked and filled when open.
- UI: loop clock/timeline across top, echo slots at upper-left, par at upper-right. Keep center free of HUD.
- Rewind signature: one-frame white contour, chromatic offset, reverse trail collapse, then the new ghost remains. This is the trailer/GIF moment.

Use simple circles/capsules, rectangles, lines, additive particles, and one display font plus one readable UI font. Respect reduced-motion mode by disabling shake/chromatic offset. Never rely on color alone: pair colors with shapes/icons/labels.

## 9. Audio direction

Generate compact audio locally or with WebAudio; ship no remote dependencies.

- A quiet 120 BPM two-bar pulse maps exactly to the 8-second loop.
- Each committed echo adds one musical stem/timbre, so solving the room literally builds a chorus.
- Timeline quarters get subtle ticks; the final second gains an urgent high pulse.
- Plate: sustained note while held. Console: per-color pluck. Gate: short mechanical exhale. Hazard: dry distorted snap. Rewind: reversed breath/whoosh. Win: all active echo notes resolve into one chord.
- Music resets sample-accurately at each rewind; interaction sounds remain readable over it.
- Audio starts only after user input, includes M toggle, defaults to a conservative level, and the game remains fully legible muted.

## 10. Judge-facing polish and presentation

### Three-minute presentation flow

- **0:00–0:10:** “In ECHO SHIFT, every failed run becomes a teammate.” Press start immediately.
- **0:10–0:35:** Level 1 produces the core aha: stand, rewind, walk beside yourself.
- **0:35–1:15:** Levels 2–3 show layering and a precisely timed console event.
- **1:15–1:45:** Level 4 demonstrates action, readable danger, and instant recovery.
- **1:45–2:30:** Jump to or complete Level 6; three ghosts turn the room into a visual and musical performance.
- **2:30–3:00:** Results tableau, one sentence on Codex collaboration, one sentence on release path.

Include a presenter-only URL parameter (`?level=6`) and `?fresh=1` to reset tutorial state. These are demo safeguards, not visible menu features.

### Judging alignment

- **Playability:** one-screen rooms, three controls, generous timing, instant reset, no login/download.
- **Originality:** the solution is a recorded performance; the visible timeline and additive soundtrack make causality into choreography rather than merely cloning the player.
- **Presentation:** first aha under 25 seconds, signature rewind visual, musical crescendo in Level 6, concise results screen.
- **Release potential:** authored level packs first; later daily rooms, replay sharing, touch input, and a lightweight editor reuse the same level data/recording model.
- **Codex collaboration narrative:** keep an honest `docs/codex-devlog.md` with selected prompts, accepted/rejected alternatives, bugs found, and before/after decisions. Frame Codex as a systems pair-programmer used to prototype the replay schema, generate timing/state-machine tests, refactor Phaser scene boundaries, and analyze playtest telemetry; humans own the mechanic, taste, tuning, and final acceptance. Show one replay-system test or architecture diff rather than making vague “AI-built” claims. Do not add an unnecessary runtime chatbot.

## 11. MVP scope and cut list

### Must ship

- Six levels above, deterministic echo playback, plates, consoles, timed gates, one scanner/laser type.
- Title, pause/restart/mute, 1–3 star results, localStorage progress.
- Tutorial prompts, full keyboard support, responsive canvas, audio unlock/fallback.
- No remote assets or services; production build deployable as static files.
- Smoke tests for all level data plus automated replay tests for: early-rewind hold, event timing, cap behavior, death not recording, reset determinism, and exit conditions.

### Cut now—even if attractive

- Combat, enemies, AI/pathfinding, bosses, health, weapons.
- Physics crates, moving platforms, portals, gravity changes, player/ghost collisions.
- Freeform rewind scrubbing, editing a recording, branching or conditional ghosts.
- Procedural generation, level editor, daily challenge, online leaderboard, accounts, cloud saves, replay backend.
- Multiplayer/co-op, mobile/touch/controller support, native packaging.
- Narrative cutscenes, dialogue system, voice acting, multiple characters, inventory.
- More than six rooms, multiple biomes, elaborate sprite pipelines, shaders that threaten compatibility.
- Runtime LLM features. Codex is the development collaborator, not a forced in-game mechanic.

### If time remains, in order

1. Tune input feel, windows, restart speed, and first-run comprehension.
2. Add results choreography and audio stems.
3. Add accessibility toggles (reduced motion, high contrast, hazard speed assist).
4. Capture a 15-second GIF/trailer and deployment smoke-test on a clean machine.
5. Only then add one optional challenge remix using existing entities.

## 12. Definition of done

- A new player can clear Level 1 without verbal help and understands echoes by 25 seconds.
- Median full run is under three minutes; no level exceeds 45 seconds in fresh-player tests.
- Playback stays aligned after 20 consecutive rewinds and under 30 FPS throttling.
- Death-to-control time is under 700 ms; level transition is under 1.5 seconds.
- Build loads from a static URL with no login, network dependency, console error, or broken audio-autoplay flow.
- Three clean-browser playtests complete all six levels; at least two testers can explain the mechanic in one sentence afterward.
