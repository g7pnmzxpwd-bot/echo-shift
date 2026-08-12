import type { GateDefinition, LevelDefinition, PlateDefinition, Point, Rect } from './types';
import { PLAY_BOUNDS } from './types';

const TOP = PLAY_BOUNDS.y;
const BOTTOM = PLAY_BOUNDS.y + PLAY_BOUNDS.height;
const LEFT = PLAY_BOUNDS.x;
const RIGHT = PLAY_BOUNDS.x + PLAY_BOUNDS.width;

const chapters = [
  'CALIBRATION',
  'DUAL SIGNAL',
  'CROSS CURRENT',
  'PHASE ARRAY',
  'TIME COMPRESSION',
  'FULL CHORUS',
] as const;

const chapterRoundNames = [
  ['FIRST ECHO', 'OFFSET', 'LONG WAY HOME', 'HIGH FREQUENCY', 'LOW SIGNAL', 'CALIBRATION FINAL'],
  ['TWO VOICES', 'PARALLEL LINES', 'TWIN ANCHORS', 'CROSSTALK', 'DOUBLE HOLD', 'DUAL SIGNAL FINAL'],
  ['RIGHT ANGLE', 'UPSTREAM', 'SIDE CHANNEL', 'CROSSFADE', 'RETURN PATH', 'CROSS CURRENT FINAL'],
  ['FIRST ARRAY', 'STAGGERED', 'THREE POINT LOCK', 'PHASE SPLIT', 'TRIANGULATION', 'PHASE ARRAY FINAL'],
  ['NARROW WINDOW', 'ZIGZAG', 'BACKFLOW', 'FOLDED TIME', 'COMPRESSION', 'TIME COMPRESSION FINAL'],
  ['QUARTET', 'FOUR CORNERS', 'RESONANCE', 'POLYPHONY', 'LAST REHEARSAL', 'FULL CHORUS'],
] as const;

const plate = (id: string, point: Point, index: number): PlateDefinition => ({
  id,
  label: `P-${index + 1}`,
  ...point,
});

const verticalBarrier = (
  id: string,
  x: number,
  openingY: number,
  openingHeight: number,
  requiresPlateIds: string[],
): { walls: Rect[]; gate: GateDefinition } => ({
  walls: [
    { x, y: TOP, width: 28, height: openingY - TOP },
    { x, y: openingY + openingHeight, width: 28, height: BOTTOM - openingY - openingHeight },
  ].filter((wall) => wall.height > 0),
  gate: {
    id,
    rect: { x, y: openingY, width: 28, height: openingHeight },
    requiresPlateIds,
    orientation: 'vertical',
  },
});

const horizontalBarrier = (
  id: string,
  y: number,
  openingX: number,
  openingWidth: number,
  requiresPlateIds: string[],
): { walls: Rect[]; gate: GateDefinition } => ({
  walls: [
    { x: LEFT, y, width: openingX - LEFT, height: 24 },
    { x: openingX + openingWidth, y, width: RIGHT - openingX - openingWidth, height: 24 },
  ].filter((wall) => wall.width > 0),
  gate: {
    id,
    rect: { x: openingX, y, width: openingWidth, height: 24 },
    requiresPlateIds,
    orientation: 'horizontal',
  },
});

const levelBase = (
  number: number,
  chapter: number,
  variant: number,
  values: Omit<LevelDefinition, 'id' | 'number' | 'chapter' | 'chapterName' | 'name' | 'subtitle'>,
): LevelDefinition => ({
  id: `round-${String(number).padStart(2, '0')}`,
  number,
  chapter,
  chapterName: chapters[chapter - 1],
  name: chapterRoundNames[chapter - 1][variant],
  subtitle: `${String(chapter).padStart(2, '0')}.${String(variant + 1).padStart(2, '0')} // ${chapters[chapter - 1]}`,
  ...values,
});

const makeChapterOne = (variant: number): LevelDefinition => {
  const openings = [402, 330, 212, 414, 278, 358];
  const platePoints = [
    { x: 292, y: 170 }, { x: 190, y: 236 }, { x: 348, y: 260 },
    { x: 214, y: 430 }, { x: 356, y: 154 }, { x: 318, y: 454 },
  ];
  const p = plate('p1', platePoints[variant], 0);
  const barrier = verticalBarrier('g1', 500, openings[variant], 80, [p.id]);
  return levelBase(variant + 1, 1, variant, {
    loopSeconds: 14 - Math.floor(variant / 2),
    echoCap: 1,
    parEchoes: 1,
    spawn: { x: 118, y: 478 },
    exit: { x: 854, y: openings[variant] + 40 },
    walls: barrier.walls,
    plates: [p],
    gates: [barrier.gate],
  });
};

const makeChapterTwo = (variant: number): LevelDefinition => {
  const openingY = [398, 214, 340, 150, 420, 282][variant];
  const positions: Point[][] = [
    [{ x: 170, y: 170 }, { x: 360, y: 420 }],
    [{ x: 210, y: 430 }, { x: 350, y: 160 }],
    [{ x: 150, y: 260 }, { x: 350, y: 450 }],
    [{ x: 180, y: 150 }, { x: 330, y: 320 }],
    [{ x: 160, y: 430 }, { x: 370, y: 210 }],
    [{ x: 190, y: 220 }, { x: 360, y: 390 }],
  ];
  const plates = positions[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const barrier = verticalBarrier('g1', 520, openingY, 74, plates.map((item) => item.id));
  return levelBase(variant + 7, 2, variant, {
    loopSeconds: 14,
    echoCap: 2,
    parEchoes: 2,
    spawn: { x: 105, y: 486 },
    exit: { x: 855, y: openingY + 37 },
    walls: barrier.walls,
    plates,
    gates: [barrier.gate],
  });
};

const makeChapterThree = (variant: number): LevelDefinition => {
  const laneY = [458, 430, 470, 414, 446, 398][variant];
  const openingHeight = [96, 88, 80, 72, 64, 58][variant];
  const positions: Point[][] = [
    [{ x: 170, y: 190 }, { x: 500, y: 235 }],
    [{ x: 215, y: 420 }, { x: 545, y: 170 }],
    [{ x: 145, y: 285 }, { x: 470, y: 470 }],
    [{ x: 235, y: 160 }, { x: 565, y: 330 }],
    [{ x: 155, y: 430 }, { x: 490, y: 190 }],
    [{ x: 245, y: 245 }, { x: 570, y: 430 }],
  ];
  const plates = positions[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const first = verticalBarrier('g1', 360, laneY - openingHeight / 2, openingHeight, ['p1']);
  const second = verticalBarrier('g2', 670, laneY - openingHeight / 2, openingHeight, ['p1', 'p2']);
  return levelBase(variant + 13, 3, variant, {
    loopSeconds: [14, 14, 13, 13, 12, 12][variant],
    echoCap: 2,
    parEchoes: 2,
    spawn: { x: 92, y: laneY },
    exit: { x: 858, y: laneY },
    walls: [...first.walls, ...second.walls],
    plates,
    gates: [first.gate, second.gate],
  });
};

const makeChapterFour = (variant: number): LevelDefinition => {
  const laneY = [456, 422, 470, 404, 440, 386][variant];
  const openingHeight = [94, 86, 78, 70, 62, 56][variant];
  const points: Point[][] = [
    [{ x: 155, y: 180 }, { x: 410, y: 275 }, { x: 620, y: 185 }],
    [{ x: 205, y: 425 }, { x: 385, y: 155 }, { x: 625, y: 390 }],
    [{ x: 135, y: 300 }, { x: 420, y: 470 }, { x: 600, y: 170 }],
    [{ x: 220, y: 155 }, { x: 390, y: 330 }, { x: 630, y: 440 }],
    [{ x: 145, y: 430 }, { x: 425, y: 180 }, { x: 605, y: 300 }],
    [{ x: 225, y: 235 }, { x: 390, y: 440 }, { x: 635, y: 155 }],
  ];
  const plates = points[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const first = verticalBarrier('g1', 300, laneY - openingHeight / 2, openingHeight, ['p1']);
  const second = verticalBarrier('g2', 520, laneY - openingHeight / 2, openingHeight, ['p1', 'p2']);
  const third = verticalBarrier('g3', 740, laneY - openingHeight / 2, openingHeight, ['p1', 'p2', 'p3']);
  return levelBase(variant + 19, 4, variant, {
    loopSeconds: [15, 14, 14, 13, 13, 12][variant],
    echoCap: 3,
    parEchoes: 3,
    spawn: { x: 88, y: laneY },
    exit: { x: 862, y: laneY },
    walls: [...first.walls, ...second.walls, ...third.walls],
    plates,
    gates: [first.gate, second.gate, third.gate],
  });
};

const makeChapterFive = (variant: number): LevelDefinition => {
  const laneY = [470, 452, 482, 438, 462, 424][variant];
  const verticalHeight = [92, 84, 76, 68, 62, 56][variant];
  const horizontalWidth = [104, 94, 86, 78, 70, 62][variant];
  const upperY = [320, 306, 334, 292, 314, 280][variant];
  const points: Point[][] = [
    [{ x: 155, y: 430 }, { x: 455, y: 475 }, { x: 610, y: 190 }],
    [{ x: 215, y: 425 }, { x: 430, y: 452 }, { x: 640, y: 165 }],
    [{ x: 140, y: 450 }, { x: 470, y: 490 }, { x: 590, y: 205 }],
    [{ x: 225, y: 410 }, { x: 440, y: 438 }, { x: 650, y: 250 }],
    [{ x: 150, y: 430 }, { x: 480, y: 470 }, { x: 600, y: 155 }],
    [{ x: 235, y: 400 }, { x: 445, y: 424 }, { x: 655, y: 220 }],
  ];
  const plates = points[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const first = verticalBarrier('g1', 300, laneY - verticalHeight / 2, verticalHeight, ['p1']);
  const second = horizontalBarrier('g2', upperY, 420, horizontalWidth, ['p1', 'p2']);
  const third = verticalBarrier('g3', 740, 140, 92 - variant * 6, ['p1', 'p2', 'p3']);
  return levelBase(variant + 25, 5, variant, {
    loopSeconds: [15, 14, 14, 13, 13, 12][variant],
    echoCap: 3,
    parEchoes: 3,
    spawn: { x: 88, y: laneY },
    exit: { x: 858, y: 180 },
    walls: [...first.walls, ...second.walls, ...third.walls],
    plates,
    gates: [first.gate, second.gate, third.gate],
  });
};

const makeChapterSix = (variant: number): LevelDefinition => {
  const laneY = [470, 446, 482, 426, 456, 404][variant];
  const openingHeight = [94, 86, 78, 70, 62, 56][variant];
  const points: Point[][] = [
    [{ x: 145, y: 180 }, { x: 365, y: 285 }, { x: 555, y: 175 }, { x: 725, y: 320 }],
    [{ x: 215, y: 420 }, { x: 345, y: 155 }, { x: 575, y: 390 }, { x: 730, y: 180 }],
    [{ x: 135, y: 275 }, { x: 380, y: 475 }, { x: 540, y: 225 }, { x: 735, y: 430 }],
    [{ x: 220, y: 155 }, { x: 350, y: 330 }, { x: 585, y: 460 }, { x: 730, y: 210 }],
    [{ x: 145, y: 430 }, { x: 385, y: 180 }, { x: 545, y: 310 }, { x: 740, y: 155 }],
    [{ x: 225, y: 240 }, { x: 355, y: 440 }, { x: 590, y: 165 }, { x: 715, y: 350 }],
  ];
  const plates = points[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const first = verticalBarrier('g1', 280, laneY - openingHeight / 2, openingHeight, ['p1']);
  const second = verticalBarrier('g2', 470, laneY - openingHeight / 2, openingHeight, ['p1', 'p2']);
  const third = verticalBarrier('g3', 650, laneY - openingHeight / 2, openingHeight, ['p1', 'p2', 'p3']);
  const fourth = verticalBarrier('g4', 810, laneY - openingHeight / 2, openingHeight, plates.map((item) => item.id));
  return levelBase(variant + 31, 6, variant, {
    loopSeconds: [16, 16, 15, 15, 14, 14][variant],
    echoCap: 4,
    parEchoes: 4,
    spawn: { x: 82, y: laneY },
    exit: { x: 872, y: laneY },
    walls: [...first.walls, ...second.walls, ...third.walls, ...fourth.walls],
    plates,
    gates: [first.gate, second.gate, third.gate, fourth.gate],
  });
};

export const LEVELS: LevelDefinition[] = [
  ...Array.from({ length: 6 }, (_, index) => makeChapterOne(index)),
  ...Array.from({ length: 6 }, (_, index) => makeChapterTwo(index)),
  ...Array.from({ length: 6 }, (_, index) => makeChapterThree(index)),
  ...Array.from({ length: 6 }, (_, index) => makeChapterFour(index)),
  ...Array.from({ length: 6 }, (_, index) => makeChapterFive(index)),
  ...Array.from({ length: 6 }, (_, index) => makeChapterSix(index)),
];

export const levelByNumber = (number: number): LevelDefinition =>
  LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.floor(number) - 1))];
