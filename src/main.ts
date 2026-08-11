import Phaser from 'phaser';

import './style.css';
import { GameScene } from './game/GameScene';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <header class="masthead">
      <div class="brand"><span class="brand-mark"></span>ECHO//SHIFT</div>
      <div class="signal"><span></span>TIMELINE LINK ACTIVE</div>
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

    <footer>
      <p>MOVE <b>WASD / ARROWS</b></p>
      <p>LOCK TIMELINE <b>SPACE</b></p>
      <p>RESTART <b>R</b></p>
      <p class="build">BUILD 00.01 // CODEX PROTOCOL</p>
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

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-control]')) {
  const control = button.dataset.control!;
  const down = (event: Event) => {
    event.preventDefault();
    button.setPointerCapture?.((event as PointerEvent).pointerId);
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
