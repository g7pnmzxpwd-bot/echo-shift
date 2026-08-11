import Phaser from 'phaser';

import { EchoTimeline, type Facing } from './loop/EchoTimeline';

const WIDTH = 960;
const HEIGHT = 600;
const FIXED_MS = 50;
const LOOP_SECONDS = 14;
const MAX_TICKS = (LOOP_SECONDS * 1000) / FIXED_MS;
const PLAYER_SPEED_PER_TICK = 9;
const PLAYER_SIZE = 24;

type Rect = { x: number; y: number; width: number; height: number };
type ActorView = { root: Phaser.GameObjects.Container; glow: Phaser.GameObjects.Arc };

const colors = {
  void: 0x070914,
  floor: 0x10172a,
  grid: 0x1b2d49,
  wall: 0x263855,
  wallEdge: 0x4f6f95,
  cyan: 0x55f6ff,
  amber: 0xffb45a,
  rose: 0xff4f82,
  lime: 0x8dff8a,
};

const walls: Rect[] = [
  { x: 30, y: 72, width: 900, height: 20 },
  { x: 30, y: 558, width: 900, height: 20 },
  { x: 30, y: 72, width: 20, height: 506 },
  { x: 910, y: 72, width: 20, height: 506 },
  { x: 500, y: 72, width: 28, height: 330 },
  { x: 500, y: 482, width: 28, height: 96 },
  { x: 170, y: 300, width: 190, height: 24 },
  { x: 650, y: 215, width: 180, height: 24 },
];

const door: Rect = { x: 500, y: 402, width: 28, height: 80 };
const switchPoint = { x: 292, y: 170 };
const spawnPoint = { x: 118, y: 478 };
const exitPoint = { x: 854, y: 438 };

export class GameScene extends Phaser.Scene {
  private timeline = new EchoTimeline(MAX_TICKS);
  private player!: ActorView;
  private ghosts: ActorView[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'w' | 'a' | 's' | 'd' | 'shift' | 'reset', Phaser.Input.Keyboard.Key>;
  private tick = 0;
  private accumulator = 0;
  private facing: Facing = 'right';
  private won = false;
  private started = false;
  private doorOpen = false;
  private doorVisual!: Phaser.GameObjects.Rectangle;
  private switchVisual!: Phaser.GameObjects.Arc;
  private timerText!: Phaser.GameObjects.Text;
  private echoText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Container;
  private winOverlay: Phaser.GameObjects.Container | null = null;
  private winOverlayTimer: Phaser.Time.TimerEvent | null = null;
  private virtual = { up: false, down: false, left: false, right: false };

  constructor() {
    super('echo-shift');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.void);
    this.drawWorld();
    this.player = this.createActor(spawnPoint.x, spawnPoint.y, colors.amber, 1);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      w: this.input.keyboard!.addKey('W'),
      a: this.input.keyboard!.addKey('A'),
      s: this.input.keyboard!.addKey('S'),
      d: this.input.keyboard!.addKey('D'),
      shift: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      reset: this.input.keyboard!.addKey('R'),
    };

    this.createHud();
    this.createIntro();
    this.bindVirtualControls();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unbindVirtualControls());
  }

  update(_time: number, delta: number): void {
    if (!this.started) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.reset)) {
      this.restartLevel();
      return;
    }
    if (this.won) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) this.commitLoop();

    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= FIXED_MS) {
      this.fixedUpdate();
      this.accumulator -= FIXED_MS;
    }
  }

  private fixedUpdate(): void {
    this.updateGhosts();
    this.doorOpen = this.isSwitchPressed();
    this.updateDoor();
    this.movePlayer();

    this.timeline.record({
      x: this.player.root.x,
      y: this.player.root.y,
      facing: this.facing,
      action: false,
    });

    this.tick += 1;
    const remaining = Math.max(0, LOOP_SECONDS - (this.tick * FIXED_MS) / 1000);
    this.timerText.setText(remaining.toFixed(1));
    this.player.glow.setAlpha(0.22 + Math.sin(this.tick * 0.28) * 0.07);

    if (this.reachedExit()) this.completeLevel();
    else if (this.tick >= MAX_TICKS) this.commitLoop();
  }

  private movePlayer(): void {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.a.isDown || this.virtual.left) dx -= 1;
    if (this.cursors.right.isDown || this.keys.d.isDown || this.virtual.right) dx += 1;
    if (this.cursors.up.isDown || this.keys.w.isDown || this.virtual.up) dy -= 1;
    if (this.cursors.down.isDown || this.keys.s.isDown || this.virtual.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';

    this.tryMove(dx * PLAYER_SPEED_PER_TICK, 0);
    this.tryMove(0, dy * PLAYER_SPEED_PER_TICK);
  }

  private tryMove(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const nextX = this.player.root.x + dx;
    const nextY = this.player.root.y + dy;
    const colliders = this.doorOpen ? walls : [...walls, door];
    if (!colliders.some((rect) => this.circleHitsRect(nextX, nextY, PLAYER_SIZE / 2, rect))) {
      this.player.root.setPosition(nextX, nextY);
    }
  }

  private updateGhosts(): void {
    for (let index = 0; index < this.ghosts.length; index += 1) {
      const frame = this.timeline.echoFrame(index, this.tick);
      if (!frame) continue;
      this.ghosts[index].root.setPosition(frame.x, frame.y);
      this.ghosts[index].root.setAlpha(0.42 + Math.sin((this.tick + index * 7) * 0.18) * 0.1);
    }
  }

  private isSwitchPressed(): boolean {
    const actors = [this.player.root, ...this.ghosts.map((ghost) => ghost.root)];
    return actors.some(
      (actor) => Phaser.Math.Distance.Between(actor.x, actor.y, switchPoint.x, switchPoint.y) < 31,
    );
  }

  private commitLoop(): void {
    if (!this.started || this.won || this.timeline.currentLength < 2) return;
    this.timeline.commit();
    const ghost = this.createActor(spawnPoint.x, spawnPoint.y, colors.cyan, 0.52);
    this.ghosts.push(ghost);
    this.player.root.setPosition(spawnPoint.x, spawnPoint.y);
    this.tick = 0;
    this.accumulator = 0;
    this.echoText.setText(String(this.timeline.echoCount).padStart(2, '0'));
    this.statusText.setText('ECHO LOCKED · NEW SHIFT');
    this.time.delayedCall(900, () => {
      if (!this.won) this.statusText.setText('REACH THE EXIT');
    });
    this.flash(colors.cyan, 140);
  }

  private restartLevel(): void {
    this.winOverlayTimer?.remove(false);
    this.winOverlayTimer = null;
    this.winOverlay?.destroy();
    this.winOverlay = null;
    this.timeline.clear();
    this.ghosts.forEach((ghost) => ghost.root.destroy());
    this.ghosts = [];
    this.player.root.setPosition(spawnPoint.x, spawnPoint.y);
    this.tick = 0;
    this.accumulator = 0;
    this.won = false;
    this.doorOpen = false;
    this.updateDoor();
    this.timerText.setText(LOOP_SECONDS.toFixed(1));
    this.echoText.setText('00');
    this.objectiveText.setText('STAND ON PLATE → SHIFT → REACH EXIT');
    this.statusText.setText('TIMELINE CLEARED');
  }

  private reachedExit(): boolean {
    return Phaser.Math.Distance.Between(
      this.player.root.x,
      this.player.root.y,
      exitPoint.x,
      exitPoint.y,
    ) < 34;
  }

  private completeLevel(): void {
    this.won = true;
    this.statusText.setText('PARADOX RESOLVED');
    this.objectiveText.setText(`COMPLETE · ${this.timeline.echoCount} ECHO${this.timeline.echoCount === 1 ? '' : 'ES'}`);
    this.flash(colors.lime, 400);
    this.tweens.add({ targets: this.player.root, scale: 1.35, duration: 180, yoyo: true, repeat: 2 });
    this.winOverlayTimer = this.time.delayedCall(700, () => {
      this.winOverlayTimer = null;
      const stableText = this.add
        .text(WIDTH / 2, HEIGHT / 2, 'TIMELINE STABLE', {
          fontFamily: '"Space Mono", monospace',
          fontSize: '42px',
          color: '#8dff8a',
          stroke: '#07120d',
          strokeThickness: 8,
        })
        .setOrigin(0.5);
      const retryText = this.add
        .text(WIDTH / 2, HEIGHT / 2 + 54, 'R  ·  RUN THE EXPERIMENT AGAIN', {
          fontFamily: '"Space Mono", monospace',
          fontSize: '14px',
          color: '#a9bdd1',
        })
        .setOrigin(0.5);
      this.winOverlay = this.add.container(0, 0, [stableText, retryText]).setDepth(50);
    });
  }

  private drawWorld(): void {
    this.add.rectangle(WIDTH / 2, 325, 900, 486, colors.floor).setStrokeStyle(2, colors.grid);
    const grid = this.add.graphics().setAlpha(0.35);
    grid.lineStyle(1, colors.grid);
    for (let x = 50; x < 910; x += 32) grid.lineBetween(x, 92, x, 558);
    for (let y = 92; y < 558; y += 32) grid.lineBetween(50, y, 910, y);

    walls.forEach((wall) => {
      this.add
        .rectangle(wall.x + wall.width / 2, wall.y + wall.height / 2, wall.width, wall.height, colors.wall)
        .setStrokeStyle(2, colors.wallEdge);
    });

    this.doorVisual = this.add
      .rectangle(door.x + door.width / 2, door.y + door.height / 2, door.width, door.height, colors.rose)
      .setStrokeStyle(2, 0xff9bb8)
      .setDepth(5);

    this.switchVisual = this.add.circle(switchPoint.x, switchPoint.y, 27, 0x132c38).setStrokeStyle(3, colors.cyan);
    this.add.circle(switchPoint.x, switchPoint.y, 10, colors.cyan, 0.55);
    this.add
      .text(switchPoint.x, switchPoint.y - 46, 'ECHO PLATE', {
        fontFamily: '"Space Mono", monospace',
        fontSize: '11px',
        color: '#55f6ff',
      })
      .setOrigin(0.5);

    this.add.rectangle(exitPoint.x, exitPoint.y, 54, 70, 0x15382a, 0.75).setStrokeStyle(3, colors.lime);
    this.add
      .text(exitPoint.x, exitPoint.y - 50, 'EXIT', {
        fontFamily: '"Space Mono", monospace',
        fontSize: '12px',
        color: '#8dff8a',
      })
      .setOrigin(0.5);
  }

  private createActor(x: number, y: number, color: number, alpha: number): ActorView {
    const glow = this.add.circle(0, 0, 24, color, 0.2);
    const core = this.add.rectangle(0, 0, 22, 22, color, 0.92).setRotation(Math.PI / 4);
    const eye = this.add.rectangle(5, -5, 5, 5, 0xffffff, 0.9);
    const root = this.add.container(x, y, [glow, core, eye]).setAlpha(alpha).setDepth(10);
    return { root, glow };
  }

  private createHud(): void {
    const mono = '"Space Mono", monospace';
    this.add.text(48, 24, 'ECHO//SHIFT', { fontFamily: mono, fontSize: '22px', color: '#f1f5ff' });
    this.statusText = this.add
      .text(480, 31, 'AWAITING SYNC', { fontFamily: mono, fontSize: '12px', color: '#55f6ff' })
      .setOrigin(0.5);
    this.add.text(740, 20, 'TIME', { fontFamily: mono, fontSize: '10px', color: '#7187a4' });
    this.timerText = this.add.text(740, 33, LOOP_SECONDS.toFixed(1), {
      fontFamily: mono,
      fontSize: '21px',
      color: '#ffb45a',
    });
    this.add.text(840, 20, 'ECHOES', { fontFamily: mono, fontSize: '10px', color: '#7187a4' });
    this.echoText = this.add.text(840, 33, '00', { fontFamily: mono, fontSize: '21px', color: '#55f6ff' });
    this.objectiveText = this.add.text(52, 535, 'STAND ON PLATE → SHIFT → REACH EXIT', {
      fontFamily: mono,
      fontSize: '12px',
      color: '#a9bdd1',
    });
    this.add
      .text(908, 535, 'SPACE  SHIFT   ·   R  RESET', { fontFamily: mono, fontSize: '11px', color: '#7187a4' })
      .setOrigin(1, 0);
  }

  private createIntro(): void {
    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x05070f, 0.88);
    const title = this.add
      .text(WIDTH / 2, 208, 'YOUR PAST IS THE KEY', {
        fontFamily: '"Space Mono", monospace',
        fontSize: '38px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        WIDTH / 2,
        294,
        '1  Move onto the ECHO PLATE\n2  Press SPACE to lock your timeline\n3  Your echo holds the plate. Reach the EXIT.',
        {
          fontFamily: '"Space Mono", monospace',
          fontSize: '16px',
          color: '#a9bdd1',
          align: 'left',
          lineSpacing: 12,
        },
      )
      .setOrigin(0.5);
    const start = this.add
      .text(WIDTH / 2, 410, '[ CLICK OR PRESS ENTER TO SYNC ]', {
        fontFamily: '"Space Mono", monospace',
        fontSize: '15px',
        color: '#55f6ff',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    this.intro = this.add.container(0, 0, [shade, title, body, start]).setDepth(100);
    const begin = () => {
      if (this.started) return;
      this.started = true;
      this.intro.destroy();
      this.statusText.setText('REACH THE EXIT');
    };
    this.input.once('pointerdown', begin);
    this.input.keyboard!.once('keydown-ENTER', begin);
  }

  private updateDoor(): void {
    this.doorVisual.setFillStyle(this.doorOpen ? colors.cyan : colors.rose, this.doorOpen ? 0.12 : 0.92);
    this.doorVisual.setStrokeStyle(2, this.doorOpen ? colors.cyan : 0xff9bb8, this.doorOpen ? 0.45 : 1);
    this.switchVisual.setFillStyle(this.doorOpen ? 0x1c574e : 0x132c38, 1);
  }

  private circleHitsRect(cx: number, cy: number, radius: number, rect: Rect): boolean {
    const nearestX = Phaser.Math.Clamp(cx, rect.x, rect.x + rect.width);
    const nearestY = Phaser.Math.Clamp(cy, rect.y, rect.y + rect.height);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy < radius * radius;
  }

  private flash(color: number, duration: number): void {
    this.cameras.main.flash(duration, (color >> 16) & 255, (color >> 8) & 255, color & 255, false);
  }

  private onControlDown = (event: Event): void => {
    const control = (event as CustomEvent<string>).detail;
    if (control in this.virtual) this.virtual[control as keyof typeof this.virtual] = true;
    if (control === 'shift') this.commitLoop();
    if (control === 'reset') this.restartLevel();
  };

  private onControlUp = (event: Event): void => {
    const control = (event as CustomEvent<string>).detail;
    if (control in this.virtual) this.virtual[control as keyof typeof this.virtual] = false;
  };

  private bindVirtualControls(): void {
    window.addEventListener('echo-control-down', this.onControlDown);
    window.addEventListener('echo-control-up', this.onControlUp);
  }

  private unbindVirtualControls(): void {
    window.removeEventListener('echo-control-down', this.onControlDown);
    window.removeEventListener('echo-control-up', this.onControlUp);
  }
}
