# ECHO//SHIFT

> Your past is the key.

ECHO//SHIFT is a browser-based time-loop puzzle game. Every shift records the player's movement. When the timeline resets, the previous run returns as an echo and repeats the same path, allowing the player to cooperate with past versions of themselves.

Built for **OpenAI Game Builders Seoul 2026** with Codex.

**Play:** https://g7pnmzxpwd-bot.github.io/echo-shift/

## 36-round campaign

The playable campaign contains **six chapters of six rounds**:

1. **Calibration** — one echo and one gate.
2. **Dual Signal** — two simultaneous plate holds.
3. **Cross Current** — horizontal barriers and side channels.
4. **Phase Array** — three echoes and staged gate requirements.
5. **Time Compression** — two-gate zigzag routes.
6. **Full Chorus** — four-echo finale rooms.

Completing a round unlocks the next one. Progress is stored locally, and the campaign matrix shows all 36 locked, available, complete, and current states.

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
npm run test:playthrough
npm run test:campaign
```

The browser suite completes round 1, loads representative rounds from every chapter, validates the 36-card campaign selector, solves real two-, three-, and four-echo rounds, and runs the mobile touch flow in Chromium and WebKit.

## Technical design

- Phaser 3.90 + TypeScript + Vite
- 50 ms fixed gameplay tick
- Pure, tested `EchoTimeline` model separated from rendering
- Position snapshots guarantee deterministic echo playback
- Responsive 16:10 canvas with keyboard and touch controls
- No server, account, or API required to play

## Design documents

- [`docs/CAMPAIGN.md`](docs/CAMPAIGN.md) — 36-round structure, progression, validation, and QA evidence
- [`docs/MVP_SPEC.md`](docs/MVP_SPEC.md) — original six-level vertical-slice design that informed the campaign
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — accepted replay architecture and guardrails
- [`docs/CODEX_LOG.md`](docs/CODEX_LOG.md) — human decisions and Codex-assisted implementation record
- [`docs/SUBMISSION.md`](docs/SUBMISSION.md) — judging alignment and scope guard

## Scope toward submission

- [x] Core record/replay mechanic
- [x] 36 data-driven rounds in six chapters
- [x] One- to four-echo plate and staged-gate progression
- [x] Tutorial, win state, advance, restart, and persisted unlocks
- [x] Keyboard and touch controls
- [x] Campaign matrix and direct round QA links
- [x] Static geometry validation and automated browser playthroughs
- [x] Procedural Web Audio cues with persistent mute control
- [x] Representative difficulty and synchronization balance pass
- [x] Production deployment and sub-3-minute submission video
- [ ] Full 36-round human playtest and physical-device Safari QA

## Credits

Game concept and design direction: Jaejun Yu / StackFlow Studio  
Implementation partner: OpenAI Codex
