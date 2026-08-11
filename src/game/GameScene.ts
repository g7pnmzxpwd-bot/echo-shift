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
  private doorSegments: Phaser.GameObjects.Rectangle[] = [];
  private powerWire!: Phaser.GameObjects.Graphics;
  private wirePulse!: Phaser.GameObjects.Arc;
  private switchVisual!: Phaser.GameObjects.Arc;
  private exitCore!: Phaser.GameObjects.Rectangle;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private playerTrail: { x: number; y: number }[] = [];
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
    this.updatePlayerTrail();
    this.updateWirePulse();

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
    this.playerTrail = [];
    this.trailGraphics.clear();
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
    this.playerTrail = [];
    this.trailGraphics.clear();
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

    // Separate the room into readable functional bays without adding asset weight.
    this.add.rectangle(275, 325, 430, 432, 0x0b1425, 0.42).setStrokeStyle(1, 0x1b3550, 0.45);
    this.add.rectangle(695, 325, 332, 432, 0x0d1627, 0.38).setStrokeStyle(1, 0x1b3550, 0.45);
    this.add.text(66, 110, 'ANCHOR BAY // A-01', {
      fontFamily: '"Space Mono", monospace', fontSize: '9px', color: '#36516f',
    });
    this.add.text(788, 110, 'RELAY // EXIT', {
      fontFamily: '"Space Mono", monospace', fontSize: '9px', color: '#36516f',
    });

    const grid = this.add.graphics().setAlpha(0.32);
    grid.lineStyle(1, colors.grid);
    for (let x = 50; x < 910; x += 32) grid.lineBetween(x, 92, x, 558);
    for (let y = 92; y < 558; y += 32) grid.lineBetween(50, y, 910, y);

    const floorDetail = this.add.graphics().setAlpha(0.5);
    floorDetail.lineStyle(1, 0x29415d, 0.7);
    for (let x = 82; x < 900; x += 96) {
      floorDetail.lineBetween(x, 548, x + 18, 548);
      floorDetail.lineBetween(x, 548, x, 540);
    }
    for (let index = 0; index < 24; index += 1) {
      const x = 66 + ((index * 137) % 820);
      const y = 112 + ((index * 83) % 416);
      this.add.circle(x, y, index % 3 === 0 ? 1.5 : 1, 0x6c91b4, 0.18);
    }

    this.powerWire = this.add.graphics().setDepth(2);
    this.drawPowerWire(false);
    this.wirePulse = this.add.circle(switchPoint.x, switchPoint.y, 4, colors.cyan, 0.95).setDepth(3).setVisible(false);

    walls.forEach((wall) => {
      this.add
        .rectangle(wall.x + wall.width / 2, wall.y + wall.height / 2, wall.width, wall.height, colors.wall)
        .setStrokeStyle(2, colors.wallEdge)
        .setDepth(3);
      this.add.circle(wall.x + 7, wall.y + 7, 2, 0x8ba4bd, 0.45).setDepth(4);
      this.add.circle(wall.x + wall.width - 7, wall.y + wall.height - 7, 2, 0x8ba4bd, 0.35).setDepth(4);
    });

    this.add.rectangle(493, door.y + door.height / 2, 8, door.height + 20, 0x18263b).setStrokeStyle(1, 0x557395).setDepth(4);
    this.add.rectangle(535, door.y + door.height / 2, 8, door.height + 20, 0x18263b).setStrokeStyle(1, 0x557395).setDepth(4);
    this.doorVisual = this.add
      .rectangle(door.x + door.width / 2, door.y + door.height / 2, door.width, door.height, colors.rose)
      .setStrokeStyle(2, 0xff9bb8)
      .setDepth(5);
    this.doorSegments = Array.from({ length: 4 }, (_, index) =>
      this.add
        .rectangle(door.x + door.width / 2, door.y + 11 + index * 19, 22, 15, colors.rose, 0.95)
        .setStrokeStyle(1, 0xffa5be, 0.8)
        .setDepth(6),
    );
    this.add.text(514, 389, 'T-GATE', {
      fontFamily: '"Space Mono", monospace', fontSize: '8px', color: '#6f87a1',
    }).setOrigin(0.5).setDepth(5);

    this.add.circle(switchPoint.x, switchPoint.y, 34, 0x07121d, 0.9).setStrokeStyle(1, 0x315a70, 0.8).setDepth(4);
    this.switchVisual = this.add.circle(switchPoint.x, switchPoint.y, 27, 0x132c38).setStrokeStyle(3, colors.cyan).setDepth(5);
    this.add.circle(switchPoint.x, switchPoint.y, 18, 0x0c2430, 0.9).setStrokeStyle(1, colors.cyan, 0.45).setDepth(5);
    this.add.circle(switchPoint.x, switchPoint.y, 9, colors.cyan, 0.6).setDepth(6);
    const plateTicks = this.add.graphics().setDepth(5);
    plateTicks.lineStyle(2, colors.cyan, 0.55);
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      plateTicks.lineBetween(
        switchPoint.x + Math.cos(angle) * 30,
        switchPoint.y + Math.sin(angle) * 30,
        switchPoint.x + Math.cos(angle) * 34,
        switchPoint.y + Math.sin(angle) * 34,
      );
    }
    this.add
      .text(switchPoint.x, switchPoint.y - 46, 'ECHO PLATE', {
        fontFamily: '"Space Mono", monospace',
        fontSize: '11px',
        color: '#55f6ff',
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.add.rectangle(exitPoint.x, exitPoint.y, 68, 86, 0x07180f, 0.7).setStrokeStyle(1, 0x3f7555, 0.55).setDepth(4);
    this.add.rectangle(exitPoint.x, exitPoint.y, 58, 76, 0x102c20, 0.72).setStrokeStyle(2, colors.lime, 0.8).setDepth(5);
    this.exitCore = this.add.rectangle(exitPoint.x, exitPoint.y, 42, 58, 0x1c5d3b, 0.28).setStrokeStyle(1, 0xc1ffc2, 0.55).setDepth(5);
    this.add.line(exitPoint.x - 40, exitPoint.y, 0, -34, 0, 34, colors.lime, 0.35).setLineWidth(2).setDepth(5);
    this.add.line(exitPoint.x + 40, exitPoint.y, 0, -34, 0, 34, colors.lime, 0.35).setLineWidth(2).setDepth(5);
    this.tweens.add({ targets: this.exitCore, alpha: 0.65, duration: 800, yoyo: true, repeat: -1 });
    this.add
      .text(exitPoint.x, exitPoint.y - 50, 'EXIT', {
        fontFamily: '"Space Mono", monospace',
        fontSize: '12px',
        color: '#8dff8a',
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.trailGraphics = this.add.graphics().setDepth(9);
  }

  private createActor(x: number, y: number, color: number, alpha: number): ActorView {
    const glow = this.add.circle(0, 0, 27, color, 0.14);
    const orbit = this.add.circle(0, 0, 19, 0x000000, 0).setStrokeStyle(1, color, 0.42);
    const core = this.add.rectangle(0, 0, 22, 22, color, 0.94).setRotation(Math.PI / 4);
    const inset = this.add.rectangle(0, 0, 10, 10, 0x0a1420, 0.3).setRotation(Math.PI / 4);
    const eye = this.add.rectangle(5, -5, 5, 5, 0xffffff, 0.95);
    const marker = this.add.rectangle(-14, 0, 4, 10, color, 0.7);
    const root = this.add.container(x, y, [glow, orbit, core, inset, eye, marker]).setAlpha(alpha).setDepth(10);
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
    this.doorVisual.setFillStyle(this.doorOpen ? colors.cyan : colors.rose, this.doorOpen ? 0.05 : 0.32);
    this.doorVisual.setStrokeStyle(2, this.doorOpen ? colors.cyan : 0xff9bb8, this.doorOpen ? 0.4 : 0.85);
    this.doorSegments.forEach((segment, index) => {
      segment.x = this.doorOpen ? (index % 2 === 0 ? 489 : 539) : door.x + door.width / 2;
      segment.setFillStyle(this.doorOpen ? colors.cyan : colors.rose, this.doorOpen ? 0.18 : 0.95);
      segment.setStrokeStyle(1, this.doorOpen ? colors.cyan : 0xffa5be, this.doorOpen ? 0.35 : 0.8);
    });
    this.switchVisual.setFillStyle(this.doorOpen ? 0x1c574e : 0x132c38, 1);
    this.drawPowerWire(this.doorOpen);
  }

  private drawPowerWire(active: boolean): void {
    const points = [
      new Phaser.Math.Vector2(switchPoint.x, switchPoint.y),
      new Phaser.Math.Vector2(430, switchPoint.y),
      new Phaser.Math.Vector2(430, door.y + door.height / 2),
      new Phaser.Math.Vector2(door.x, door.y + door.height / 2),
    ];
    this.powerWire.clear();
    this.powerWire.lineStyle(7, active ? colors.cyan : 0x162b40, active ? 0.1 : 0.32);
    this.powerWire.strokePoints(points, false, false);
    this.powerWire.lineStyle(2, active ? colors.cyan : 0x34516c, active ? 0.85 : 0.42);
    this.powerWire.strokePoints(points, false, false);
    for (const point of points.slice(1, -1)) {
      this.powerWire.fillStyle(active ? colors.cyan : 0x45627d, active ? 0.75 : 0.45);
      this.powerWire.fillCircle(point.x, point.y, 4);
      this.powerWire.lineStyle(1, active ? 0xbaffff : 0x6b86a0, 0.6);
      this.powerWire.strokeCircle(point.x, point.y, 7);
    }
  }

  private updateWirePulse(): void {
    this.wirePulse.setVisible(this.doorOpen);
    if (!this.doorOpen) return;

    const first = 430 - switchPoint.x;
    const second = door.y + door.height / 2 - switchPoint.y;
    const third = door.x - 430;
    const total = first + second + third;
    let distance = (this.tick * 7) % total;

    if (distance <= first) {
      this.wirePulse.setPosition(switchPoint.x + distance, switchPoint.y);
      return;
    }
    distance -= first;
    if (distance <= second) {
      this.wirePulse.setPosition(430, switchPoint.y + distance);
      return;
    }
    distance -= second;
    this.wirePulse.setPosition(430 + Math.min(distance, third), door.y + door.height / 2);
  }

  private updatePlayerTrail(): void {
    this.playerTrail.push({ x: this.player.root.x, y: this.player.root.y });
    if (this.playerTrail.length > 10) this.playerTrail.shift();

    this.trailGraphics.clear();
    this.playerTrail.forEach((point, index) => {
      const progress = (index + 1) / this.playerTrail.length;
      this.trailGraphics.fillStyle(colors.amber, 0.03 + progress * 0.08);
      this.trailGraphics.fillCircle(point.x, point.y, 3 + progress * 4);
    });
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
