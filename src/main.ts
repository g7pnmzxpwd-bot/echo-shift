import Phaser from 'phaser';

import './style.css';
import { AudioEngine, type AudioCue } from './audio/AudioEngine';
import { GameScene } from './game/GameScene';
import { LEVELS } from './game/levels/levels';
import { readProgress, type ProgressState } from './game/progression/ProgressStore';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <header class="masthead">
      <div class="brand"><span class="brand-mark"></span>ECHO//SHIFT</div>
      <div class="masthead-actions">
        <button id="sound-button" class="sound-button" type="button" aria-pressed="false">SOUND ON</button>
        <button id="rounds-button" class="rounds-button" type="button">ROUNDS <b>01/36</b></button>
        <div class="signal"><span></span>TIMELINE LINK ACTIVE</div>
      </div>
    </header>

    <section class="game-frame" aria-label="Echo Shift game">
      <div id="game"></div>
      <div class="frame-corner corner-tl"></div>
      <div class="frame-corner corner-tr"></div>
      <div class="frame-corner corner-bl"></div>
      <div class="frame-corner corner-br"></div>
    </section>

    <section class="touch-controls" aria-label="Touch controls">
      <div class="dpad">
        <button data-control="up" class="up" aria-label="Move up">▲</button>
        <button data-control="left" class="left" aria-label="Move left">◀</button>
        <button data-control="down" class="down" aria-label="Move down">▼</button>
        <button data-control="right" class="right" aria-label="Move right">▶</button>
      </div>
      <div class="actions">
        <button data-control="reset" class="reset">RESET</button>
        <button data-control="shift" class="shift">SHIFT</button>
      </div>
    </section>

    <section id="round-panel" class="round-panel" aria-label="Round select" hidden>
      <div class="round-panel__header">
        <div>
          <span>CAMPAIGN MATRIX</span>
          <h2>SELECT TIMELINE</h2>
        </div>
        <button id="round-panel-close" type="button" aria-label="Close round select">CLOSE ×</button>
      </div>
      <div id="round-grid" class="round-grid"></div>
      <p class="round-panel__hint">Complete a timeline to unlock the next round. Progress is stored on this device.</p>
    </section>

    <footer>
      <p>MOVE <b>WASD / ARROWS</b></p>
      <p>LOCK TIMELINE <b>SPACE</b></p>
      <p>RESTART <b>R</b></p>
      <p class="build">BUILD 00.03 // 36 TIMELINES</p>
    </footer>
  </main>
`;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  backgroundColor: '#070914',
  scene: [GameScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
};

new Phaser.Game(config);

const audio = new AudioEngine(localStorage);
const soundButton = document.querySelector<HTMLButtonElement>('#sound-button')!;
const renderSoundState = (): void => {
  soundButton.textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON';
  soundButton.setAttribute('aria-pressed', String(audio.muted));
};
renderSoundState();
const unlockAudio = () => { void audio.unlock(); };
window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
window.addEventListener('keydown', unlockAudio, { once: true, capture: true });
soundButton.addEventListener('click', () => {
  void audio.unlock();
  audio.toggleMuted();
  renderSoundState();
});
window.addEventListener('echo-audio-cue', (event) => {
  void audio.unlock().then(() => audio.cue((event as CustomEvent<AudioCue>).detail));
});

const roundPanel = document.querySelector<HTMLElement>('#round-panel')!;
const roundGrid = document.querySelector<HTMLElement>('#round-grid')!;
const roundsButton = document.querySelector<HTMLButtonElement>('#rounds-button')!;
const launchParams = new URLSearchParams(location.search);
const qaMode = launchParams.get('qa') === '1';
const requestedRound = Math.max(1, Math.min(LEVELS.length, Number(launchParams.get('round')) || 1));
let progress = readProgress(localStorage, LEVELS.length);
let currentRound = qaMode ? requestedRound : Math.min(requestedRound, progress.unlocked);

const setRoundPanelOpen = (open: boolean): void => {
  roundPanel.hidden = !open;
  window.dispatchEvent(new CustomEvent('echo-menu-state', { detail: open }));
};

const renderRoundGrid = (): void => {
  roundsButton.innerHTML = `ROUNDS <b>${String(currentRound).padStart(2, '0')}/36</b>`;
  roundGrid.innerHTML = Array.from({ length: 6 }, (_, chapterIndex) => {
    const chapterLevels = LEVELS.slice(chapterIndex * 6, chapterIndex * 6 + 6);
    const cards = chapterLevels.map((level) => {
      const locked = level.number > progress.unlocked;
      const complete = progress.completed.includes(level.number);
      const state = locked ? 'locked' : complete ? 'complete' : 'available';
      return `<button class="round-card ${state}${currentRound === level.number ? ' current' : ''}"
        data-round="${level.number}" ${locked ? 'disabled' : ''}>
        <span>${String(level.number).padStart(2, '0')}</span>
        <b>${level.name}</b>
        <small>${locked ? 'LOCKED' : complete ? 'STABLE' : `${level.parEchoes} ECHO PAR`}</small>
      </button>`;
    }).join('');
    return `<div class="chapter-block">
      <header><span>CH ${String(chapterIndex + 1).padStart(2, '0')}</span><b>${chapterLevels[0].chapterName}</b></header>
      <div>${cards}</div>
    </div>`;
  }).join('');

  for (const card of roundGrid.querySelectorAll<HTMLButtonElement>('[data-round]:not([disabled])')) {
    card.addEventListener('click', () => {
      const round = Number(card.dataset.round);
      currentRound = round;
      renderRoundGrid();
      setRoundPanelOpen(false);
      window.dispatchEvent(new CustomEvent('echo-select-round', { detail: round }));
    });
  }
};

renderRoundGrid();
roundsButton.addEventListener('click', () => {
  setRoundPanelOpen(roundPanel.hasAttribute('hidden'));
});
document.querySelector<HTMLButtonElement>('#round-panel-close')!.addEventListener('click', () => {
  setRoundPanelOpen(false);
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setRoundPanelOpen(false);
});
window.addEventListener('echo-progress', (event) => {
  progress = (event as CustomEvent<ProgressState>).detail;
  renderRoundGrid();
});
window.addEventListener('echo-round-changed', (event) => {
  currentRound = Number((event as CustomEvent<number>).detail);
  renderRoundGrid();
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-control]')) {
  const control = button.dataset.control!;
  const down = (event: Event) => {
    event.preventDefault();
    try {
      button.setPointerCapture?.((event as PointerEvent).pointerId);
    } catch {
      // Pointer capture is optional; synthetic and some mobile pointers may reject it.
    }
    window.dispatchEvent(new CustomEvent('echo-control-down', { detail: control }));
  };
  const up = (event: Event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('echo-control-up', { detail: control }));
  };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}
