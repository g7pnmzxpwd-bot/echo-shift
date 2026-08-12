import Phaser from 'phaser';

import { LEVELS, levelByNumber } from './levels/levels';
import type { GateDefinition, LevelDefinition, PlateDefinition, Rect } from './levels/types';
import { EchoTimeline, type Facing } from './loop/EchoTimeline';

const WIDTH = 960;
const HEIGHT = 600;
const FIXED_MS = 50;
const PLAYER_SPEED_PER_TICK = 9;
const PLAYER_SIZE = 24;
const PROGRESS_KEY = 'echo-shift-progress-v1';

const boundaryWalls: Rect[] = [
  { x: 30, y: 72, width: 900, height: 20 },
  { x: 30, y: 558, width: 900, height: 20 },
  { x: 30, y: 72, width: 20, height: 506 },
  { x: 910, y: 72, width: 20, height: 506 },
];

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

const platePalette = [0x55f6ff, 0xc68cff, 0xffc45a, 0x76f7a0];
const echoPalette = [0x55f6ff, 0xc68cff, 0xffd36a, 0x76f7a0];

type ActorView = { root: Phaser.GameObjects.Container; glow: Phaser.GameObjects.Arc };
type PlateView = {
  definition: PlateDefinition;
  outer: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  color: number;
};
type GateView = {
  definition: GateDefinition;
  outline: Phaser.GameObjects.Rectangle;
  segments: Phaser.GameObjects.Rectangle[];
  wire: Phaser.GameObjects.Graphics;
};
type ProgressState = { unlocked: number; completed: number[] };

export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: LevelDefinition;
  private timeline!: EchoTimeline;
  private player!: ActorView;
  private ghosts: ActorView[] = [];
  private plateViews: PlateView[] = [];
  private gateViews: GateView[] = [];
  private gateStates = new Map<string, boolean>();
  private pressedPlateIds = new Set<string>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'w' | 'a' | 's' | 'd' | 'shift' | 'reset' | 'next', Phaser.Input.Keyboard.Key>;
  private tick = 0;
  private accumulator = 0;
  private facing: Facing = 'right';
  private won = false;
  private started = false;
  private menuOpen = false;
  private timerText!: Phaser.GameObjects.Text;
  private echoText!: Phaser.GameObjects.Text;
  private plateText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Container;
  private winOverlay: Phaser.GameObjects.Container | null = null;
  private winOverlayTimer: Phaser.Time.TimerEvent | null = null;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private playerTrail: { x: number; y: number }[] = [];
  private virtual = { up: false, down: false, left: false, right: false };

  constructor() {
    super('echo-shift');
  }

  init(data?: { levelIndex?: number }): void {
    const queryRound = Number(new URLSearchParams(window.location.search).get('round'));
    const requestedIndex = data?.levelIndex ?? (Number.isFinite(queryRound) && queryRound > 0 ? queryRound - 1 : 0);
    this.levelIndex = Phaser.Math.Clamp(Math.floor(requestedIndex), 0, LEVELS.length - 1);
    this.level = levelByNumber(this.levelIndex + 1);
    this.timeline = new EchoTimeline((this.level.loopSeconds * 1000) / FIXED_MS);
    this.ghosts = [];
    this.plateViews = [];
    this.gateViews = [];
    this.gateStates = new Map();
    this.pressedPlateIds = new Set();
    this.tick = 0;
    this.accumulator = 0;
    this.won = false;
    this.started = false;
    this.menuOpen = false;
    this.facing = 'right';
    this.virtual = { up: false, down: false, left: false, right: false };
    this.playerTrail = [];
    this.winOverlay = null;
    this.winOverlayTimer = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.void);
    this.drawWorld();
    this.player = this.createActor(this.level.spawn.x, this.level.spawn.y, colors.amber, 1);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      w: this.input.keyboard!.addKey('W'),
      a: this.input.keyboard!.addKey('A'),
      s: this.input.keyboard!.addKey('S'),
      d: this.input.keyboard!.addKey('D'),
      shift: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      reset: this.input.keyboard!.addKey('R'),
      next: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
    this.createHud();
    this.createIntro();
    this.bindVirtualControls();
    window.dispatchEvent(new CustomEvent('echo-round-changed', { detail: this.level.number }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unbindVirtualControls());
  }

  update(_time: number, delta: number): void {
    if (!this.started || this.menuOpen) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.reset)) {
      this.restartLevel();
      return;
    }
    if (this.won) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.shift) || Phaser.Input.Keyboard.JustDown(this.keys.next)) {
        this.advanceLevel();
      }
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) this.commitLoop();

    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= FIXED_MS) {
      this.fixedUpdate();
      this.accumulator -= FIXED_MS;
    }
  }

  private fixedUpdate(): void {
    this.updateGhosts();
    this.movePlayer();
    this.updateMechanisms();
    this.updatePlayerTrail();

    this.timeline.record({
      x: this.player.root.x,
      y: this.player.root.y,
      facing: this.facing,
      action: false,
    });

    this.tick += 1;
    const remaining = Math.max(0, this.level.loopSeconds - (this.tick * FIXED_MS) / 1000);
    this.timerText.setText(remaining.toFixed(1));
    this.player.glow.setAlpha(0.18 + Math.sin(this.tick * 0.28) * 0.06);

    if (this.reachedExit()) this.completeLevel();
    else if (this.tick >= this.timeline.maxTicks) this.commitLoop();
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
    const closedGates = this.level.gates
      .filter((gate) => !this.gateStates.get(gate.id))
      .map((gate) => gate.rect);
    const colliders = [...boundaryWalls, ...this.level.walls, ...closedGates];
    if (!colliders.some((rect) => this.circleHitsRect(nextX, nextY, PLAYER_SIZE / 2, rect))) {
      this.player.root.setPosition(nextX, nextY);
    }
  }

  private updateGhosts(): void {
    for (let index = 0; index < this.ghosts.length; index += 1) {
      const frame = this.timeline.echoFrame(index, this.tick);
      if (!frame) continue;
      this.ghosts[index].root.setPosition(frame.x, frame.y);
      this.ghosts[index].root.setAlpha(0.44 + Math.sin((this.tick + index * 7) * 0.18) * 0.08);
    }
  }

  private updateMechanisms(): void {
    const actors = [this.player.root, ...this.ghosts.map((ghost) => ghost.root)];
    this.pressedPlateIds = new Set(
      this.level.plates
        .filter((plate) =>
          actors.some((actor) => Phaser.Math.Distance.Between(actor.x, actor.y, plate.x, plate.y) < 31),
        )
        .map((plate) => plate.id),
    );

    for (const view of this.plateViews) {
      const pressed = this.pressedPlateIds.has(view.definition.id);
      view.outer.setFillStyle(pressed ? 0x1a554b : 0x112333, pressed ? 0.95 : 0.85);
      view.outer.setStrokeStyle(3, view.color, pressed ? 1 : 0.72);
      view.core.setFillStyle(view.color, pressed ? 0.95 : 0.5);
      view.core.setScale(pressed ? 1.18 : 1);
    }

    for (const gate of this.level.gates) {
      const open = gate.requiresPlateIds.every((id) => this.pressedPlateIds.has(id));
      this.gateStates.set(gate.id, open);
      const view = this.gateViews.find((item) => item.definition.id === gate.id)!;
      this.updateGateView(view, open);
      this.drawGateWires(view);
    }

    this.plateText.setText(`${String(this.pressedPlateIds.size).padStart(2, '0')}/${String(this.level.plates.length).padStart(2, '0')}`);
  }

  private commitLoop(): void {
    if (!this.started || this.won || this.timeline.currentLength < 2) return;
    if (this.timeline.echoCount >= this.level.echoCap) {
      this.timeline.discardCurrent();
      this.resetCurrentAttempt();
      this.statusText.setText('ECHO LIMIT · ATTEMPT RESET');
      return;
    }

    this.timeline.commit();
    const color = echoPalette[(this.timeline.echoCount - 1) % echoPalette.length];
    this.ghosts.push(this.createActor(this.level.spawn.x, this.level.spawn.y, color, 0.55));
    this.resetCurrentAttempt();
    this.echoText.setText(`${String(this.timeline.echoCount).padStart(2, '0')}/${String(this.level.echoCap).padStart(2, '0')}`);
    this.statusText.setText('ECHO LOCKED · NEW SHIFT');
    this.time.delayedCall(900, () => {
      if (!this.won) this.statusText.setText('STABILIZE ALL PLATES');
    });
    this.flash(colors.cyan, 140);
  }

  private resetCurrentAttempt(): void {
    this.player.root.setPosition(this.level.spawn.x, this.level.spawn.y);
    this.playerTrail = [];
    this.trailGraphics.clear();
    this.tick = 0;
    this.accumulator = 0;
    this.timerText.setText(this.level.loopSeconds.toFixed(1));
  }

  private restartLevel(): void {
    this.winOverlayTimer?.remove(false);
    this.winOverlayTimer = null;
    this.winOverlay?.destroy();
    this.winOverlay = null;
    this.timeline.clear();
    this.ghosts.forEach((ghost) => ghost.root.destroy());
    this.ghosts = [];
    this.won = false;
    this.gateStates.clear();
    this.pressedPlateIds.clear();
    this.resetCurrentAttempt();
    this.echoText.setText(`00/${String(this.level.echoCap).padStart(2, '0')}`);
    this.plateText.setText(`00/${String(this.level.plates.length).padStart(2, '0')}`);
    this.objectiveText.setText('LOCK ECHOES ON EVERY PLATE → REACH EXIT');
    this.statusText.setText('TIMELINE CLEARED');
    this.updateMechanisms();
  }

  private reachedExit(): boolean {
    return Phaser.Math.Distance.Between(
      this.player.root.x,
      this.player.root.y,
      this.level.exit.x,
      this.level.exit.y,
    ) < 34;
  }

  private completeLevel(): void {
    this.won = true;
    this.saveCompletion();
    this.statusText.setText('PARADOX RESOLVED');
    this.objectiveText.setText(`ROUND ${String(this.level.number).padStart(2, '0')} COMPLETE · ${this.timeline.echoCount} ECHOES`);
    this.flash(colors.lime, 400);
    this.tweens.add({ targets: this.player.root, scale: 1.35, duration: 180, yoyo: true, repeat: 2 });
    this.winOverlayTimer = this.time.delayedCall(650, () => {
      this.winOverlayTimer = null;
      const finalRound = this.levelIndex === LEVELS.length - 1;
      const stableText = this.add
        .text(WIDTH / 2, HEIGHT / 2 - 8, finalRound ? 'ALL TIMELINES STABLE' : 'TIMELINE STABLE', {
          fontFamily: '"Space Mono", monospace',
          fontSize: finalRound ? '34px' : '42px',
          color: '#8dff8a',
          stroke: '#07120d',
          strokeThickness: 8,
        })
        .setOrigin(0.5);
      const retryText = this.add
        .text(
          WIDTH / 2,
          HEIGHT / 2 + 48,
          finalRound ? 'ENTER · RETURN TO ROUND 01' : `ENTER · ADVANCE TO ROUND ${String(this.level.number + 1).padStart(2, '0')}`,
          { fontFamily: '"Space Mono", monospace', fontSize: '14px', color: '#a9bdd1' },
        )
        .setOrigin(0.5);
      this.winOverlay = this.add.container(0, 0, [stableText, retryText]).setDepth(50);
    });
  }

  private advanceLevel(): void {
    const nextIndex = this.levelIndex === LEVELS.length - 1 ? 0 : this.levelIndex + 1;
    this.scene.restart({ levelIndex: nextIndex });
  }

  private drawWorld(): void {
    this.add.rectangle(WIDTH / 2, 325, 900, 486, colors.floor).setStrokeStyle(2, colors.grid);
    this.add.rectangle(275, 325, 430, 432, 0x0b1425, 0.4).setStrokeStyle(1, 0x1b3550, 0.4);
    this.add.rectangle(695, 325, 332, 432, 0x0d1627, 0.36).setStrokeStyle(1, 0x1b3550, 0.4);

    const grid = this.add.graphics().setAlpha(0.3);
    grid.lineStyle(1, colors.grid);
    for (let x = 50; x < 910; x += 32) grid.lineBetween(x, 92, x, 558);
    for (let y = 92; y < 558; y += 32) grid.lineBetween(50, y, 910, y);
    for (let index = 0; index < 24; index += 1) {
      const x = 66 + ((index * 137 + this.level.number * 17) % 820);
      const y = 112 + ((index * 83 + this.level.number * 11) % 416);
      this.add.circle(x, y, index % 3 === 0 ? 1.5 : 1, 0x6c91b4, 0.17);
    }

    for (const wall of [...boundaryWalls, ...this.level.walls]) this.drawWall(wall);
    this.drawPlates();
    this.drawGates();
    this.drawExit();
    this.trailGraphics = this.add.graphics().setDepth(9);
  }

  private drawWall(wall: Rect): void {
    this.add
      .rectangle(wall.x + wall.width / 2, wall.y + wall.height / 2, wall.width, wall.height, colors.wall)
      .setStrokeStyle(2, colors.wallEdge)
      .setDepth(3);
    if (wall.width > 18 && wall.height > 18) {
      this.add.circle(wall.x + 7, wall.y + 7, 2, 0x8ba4bd, 0.4).setDepth(4);
      this.add.circle(wall.x + wall.width - 7, wall.y + wall.height - 7, 2, 0x8ba4bd, 0.32).setDepth(4);
    }
  }

  private drawPlates(): void {
    this.plateViews = this.level.plates.map((definition, index) => {
      const color = platePalette[index % platePalette.length];
      this.add.circle(definition.x, definition.y, 34, 0x07121d, 0.9).setStrokeStyle(1, 0x315a70, 0.75).setDepth(4);
      const outer = this.add.circle(definition.x, definition.y, 27, 0x112333).setStrokeStyle(3, color).setDepth(5);
      this.add.circle(definition.x, definition.y, 18, 0x0c2430, 0.9).setStrokeStyle(1, color, 0.45).setDepth(5);
      const core = this.add.circle(definition.x, definition.y, 9, color, 0.55).setDepth(6);
      const ticks = this.add.graphics().setDepth(5);
      ticks.lineStyle(2, color, 0.5);
      for (let tick = 0; tick < 12; tick += 1) {
        const angle = (Math.PI * 2 * tick) / 12;
        ticks.lineBetween(
          definition.x + Math.cos(angle) * 30,
          definition.y + Math.sin(angle) * 30,
          definition.x + Math.cos(angle) * 34,
          definition.y + Math.sin(angle) * 34,
        );
      }
      this.add
        .text(definition.x, definition.y - 46, definition.label, {
          fontFamily: '"Space Mono", monospace', fontSize: '10px', color: Phaser.Display.Color.IntegerToColor(color).rgba,
        })
        .setOrigin(0.5)
        .setDepth(6);
      return { definition, outer, core, color };
    });
  }

  private drawGates(): void {
    this.gateViews = this.level.gates.map((definition) => {
      const centerX = definition.rect.x + definition.rect.width / 2;
      const centerY = definition.rect.y + definition.rect.height / 2;
      const vertical = definition.orientation === 'vertical';
      const outline = this.add
        .rectangle(centerX, centerY, definition.rect.width, definition.rect.height, colors.rose, 0.3)
        .setStrokeStyle(2, 0xff9bb8, 0.85)
        .setDepth(5);
      const count = 4;
      const segments = Array.from({ length: count }, (_, index) => {
        const segmentWidth = vertical ? Math.max(14, definition.rect.width - 6) : Math.max(12, (definition.rect.width - 12) / count);
        const segmentHeight = vertical ? Math.max(12, (definition.rect.height - 12) / count) : Math.max(14, definition.rect.height - 6);
        const x = vertical ? centerX : definition.rect.x + 6 + segmentWidth / 2 + index * segmentWidth;
        const y = vertical ? definition.rect.y + 6 + segmentHeight / 2 + index * segmentHeight : centerY;
        return this.add.rectangle(x, y, segmentWidth - 3, segmentHeight - 3, colors.rose, 0.94)
          .setStrokeStyle(1, 0xffa5be, 0.75)
          .setDepth(6);
      });
      const wire = this.add.graphics().setDepth(2);
      this.add.text(centerX, definition.rect.y - 12, definition.id.toUpperCase(), {
        fontFamily: '"Space Mono", monospace', fontSize: '8px', color: '#6f87a1',
      }).setOrigin(0.5).setDepth(6);
      return { definition, outline, segments, wire };
    });
    for (const view of this.gateViews) this.drawGateWires(view);
  }

  private drawGateWires(view: GateView): void {
    view.wire.clear();
    const gate = view.definition;
    const targetX = gate.rect.x + gate.rect.width / 2;
    const targetY = gate.rect.y + gate.rect.height / 2;
    gate.requiresPlateIds.forEach((plateId, index) => {
      const plate = this.level.plates.find((item) => item.id === plateId)!;
      const color = platePalette[this.level.plates.indexOf(plate) % platePalette.length];
      const active = this.pressedPlateIds.has(plateId);
      const bendX = gate.orientation === 'vertical' ? targetX - 70 - index * 12 : plate.x;
      const bendY = gate.orientation === 'horizontal' ? targetY + 60 + index * 12 : plate.y;
      const points = gate.orientation === 'vertical'
        ? [new Phaser.Math.Vector2(plate.x, plate.y), new Phaser.Math.Vector2(bendX, plate.y), new Phaser.Math.Vector2(bendX, targetY), new Phaser.Math.Vector2(targetX, targetY)]
        : [new Phaser.Math.Vector2(plate.x, plate.y), new Phaser.Math.Vector2(plate.x, bendY), new Phaser.Math.Vector2(targetX, bendY), new Phaser.Math.Vector2(targetX, targetY)];
      view.wire.lineStyle(active ? 3 : 2, active ? color : 0x34516c, active ? 0.85 : 0.35);
      view.wire.strokePoints(points, false, false);
    });
  }

  private updateGateView(view: GateView, open: boolean): void {
    const gate = view.definition;
    const centerX = gate.rect.x + gate.rect.width / 2;
    const centerY = gate.rect.y + gate.rect.height / 2;
    const vertical = gate.orientation === 'vertical';
    view.outline.setFillStyle(open ? colors.cyan : colors.rose, open ? 0.04 : 0.28);
    view.outline.setStrokeStyle(2, open ? colors.cyan : 0xff9bb8, open ? 0.35 : 0.85);
    view.segments.forEach((segment, index) => {
      if (vertical) segment.x = open ? (index % 2 === 0 ? gate.rect.x - 9 : gate.rect.x + gate.rect.width + 9) : centerX;
      else segment.y = open ? (index % 2 === 0 ? gate.rect.y - 9 : gate.rect.y + gate.rect.height + 9) : centerY;
      segment.setFillStyle(open ? colors.cyan : colors.rose, open ? 0.15 : 0.94);
      segment.setStrokeStyle(1, open ? colors.cyan : 0xffa5be, open ? 0.3 : 0.75);
    });
  }

  private drawExit(): void {
    const { x, y } = this.level.exit;
    this.add.rectangle(x, y, 68, 86, 0x07180f, 0.7).setStrokeStyle(1, 0x3f7555, 0.55).setDepth(4);
    this.add.rectangle(x, y, 58, 76, 0x102c20, 0.72).setStrokeStyle(2, colors.lime, 0.8).setDepth(5);
    const core = this.add.rectangle(x, y, 42, 58, 0x1c5d3b, 0.3).setStrokeStyle(1, 0xc1ffc2, 0.55).setDepth(5);
    this.tweens.add({ targets: core, alpha: 0.7, duration: 800, yoyo: true, repeat: -1 });
    this.add.text(x, y - 50, 'EXIT', {
      fontFamily: '"Space Mono", monospace', fontSize: '12px', color: '#8dff8a',
    }).setOrigin(0.5).setDepth(6);
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
    this.add.text(48, 20, `ROUND ${String(this.level.number).padStart(2, '0')} / 36`, {
      fontFamily: mono, fontSize: '10px', color: '#7187a4',
    });
    this.add.text(48, 34, this.level.name, { fontFamily: mono, fontSize: '18px', color: '#f1f5ff' });
    this.statusText = this.add.text(480, 31, this.level.chapterName, {
      fontFamily: mono, fontSize: '11px', color: '#55f6ff',
    }).setOrigin(0.5);
    this.add.text(700, 18, 'TIME', { fontFamily: mono, fontSize: '9px', color: '#7187a4' });
    this.timerText = this.add.text(700, 31, this.level.loopSeconds.toFixed(1), { fontFamily: mono, fontSize: '19px', color: '#ffb45a' });
    this.add.text(775, 18, 'ECHOES', { fontFamily: mono, fontSize: '9px', color: '#7187a4' });
    this.echoText = this.add.text(775, 31, `00/${String(this.level.echoCap).padStart(2, '0')}`, { fontFamily: mono, fontSize: '17px', color: '#55f6ff' });
    this.add.text(865, 18, 'PLATES', { fontFamily: mono, fontSize: '9px', color: '#7187a4' });
    this.plateText = this.add.text(865, 31, `00/${String(this.level.plates.length).padStart(2, '0')}`, { fontFamily: mono, fontSize: '17px', color: '#c68cff' });
    this.objectiveText = this.add.text(52, 535, 'LOCK ECHOES ON EVERY PLATE → REACH EXIT', {
      fontFamily: mono, fontSize: '11px', color: '#a9bdd1',
    });
    this.add.text(908, 535, 'SPACE  SHIFT   ·   R  RESET', {
      fontFamily: mono, fontSize: '10px', color: '#7187a4',
    }).setOrigin(1, 0);
  }

  private createIntro(): void {
    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x05070f, 0.88);
    const title = this.add.text(WIDTH / 2, 194, this.level.number === 1 ? 'YOUR PAST IS THE KEY' : `ROUND ${String(this.level.number).padStart(2, '0')} · ${this.level.name}`, {
      fontFamily: '"Space Mono", monospace', fontSize: this.level.number === 1 ? '38px' : '30px', color: '#ffffff',
    }).setOrigin(0.5);
    const instruction = this.level.number === 1
      ? '1  Move onto the plate\n2  Press SPACE to lock your timeline\n3  Let your echo hold it. Reach the EXIT.'
      : `${this.level.plates.length} PLATES  ·  ${this.level.echoCap} ECHO LIMIT  ·  PAR ${this.level.parEchoes}\n\nLock one echo onto every required plate.`;
    const body = this.add.text(WIDTH / 2, 292, instruction, {
      fontFamily: '"Space Mono", monospace', fontSize: '15px', color: '#a9bdd1', align: 'center', lineSpacing: 11,
    }).setOrigin(0.5);
    const start = this.add.text(WIDTH / 2, 408, '[ CLICK OR PRESS ENTER TO SYNC ]', {
      fontFamily: '"Space Mono", monospace', fontSize: '14px', color: '#55f6ff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    this.intro = this.add.container(0, 0, [shade, title, body, start]).setDepth(100);
    const begin = () => {
      if (this.started) return;
      this.started = true;
      this.intro.destroy();
      this.statusText.setText('STABILIZE ALL PLATES');
    };
    this.input.once('pointerdown', begin);
    this.input.keyboard!.once('keydown-ENTER', begin);
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

  private readProgress(): ProgressState {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null') as ProgressState | null;
      if (parsed && Number.isInteger(parsed.unlocked) && Array.isArray(parsed.completed)) return parsed;
    } catch {
      // Corrupt local progress should never prevent play.
    }
    return { unlocked: 1, completed: [] };
  }

  private saveCompletion(): void {
    const progress = this.readProgress();
    progress.unlocked = Math.min(LEVELS.length, Math.max(progress.unlocked, this.level.number + 1));
    progress.completed = [...new Set([...progress.completed, this.level.number])].sort((a, b) => a - b);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Private browsing or quota failures must not prevent a completed run.
    }
    window.dispatchEvent(new CustomEvent('echo-progress', { detail: progress }));
  }

  private onControlDown = (event: Event): void => {
    const control = (event as CustomEvent<string>).detail;
    if (control in this.virtual) this.virtual[control as keyof typeof this.virtual] = true;
    if (control === 'shift') this.won ? this.advanceLevel() : this.commitLoop();
    if (control === 'reset') this.restartLevel();
  };

  private onControlUp = (event: Event): void => {
    const control = (event as CustomEvent<string>).detail;
    if (control in this.virtual) this.virtual[control as keyof typeof this.virtual] = false;
  };

  private onSelectRound = (event: Event): void => {
    const round = Number((event as CustomEvent<number>).detail);
    if (!Number.isInteger(round) || round < 1 || round > LEVELS.length) return;
    this.scene.restart({ levelIndex: round - 1 });
  };

  private onMenuState = (event: Event): void => {
    this.menuOpen = Boolean((event as CustomEvent<boolean>).detail);
  };

  private bindVirtualControls(): void {
    window.addEventListener('echo-control-down', this.onControlDown);
    window.addEventListener('echo-control-up', this.onControlUp);
    window.addEventListener('echo-select-round', this.onSelectRound);
    window.addEventListener('echo-menu-state', this.onMenuState);
  }

  private unbindVirtualControls(): void {
    window.removeEventListener('echo-control-down', this.onControlDown);
    window.removeEventListener('echo-control-up', this.onControlUp);
    window.removeEventListener('echo-select-round', this.onSelectRound);
    window.removeEventListener('echo-menu-state', this.onMenuState);
  }
}
