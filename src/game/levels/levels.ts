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
  const y = [330, 302, 350, 286, 365, 318][variant];
  const openingX = [748, 690, 790, 720, 650, 770][variant];
  const positions: Point[][] = [
    [{ x: 180, y: 470 }, { x: 430, y: 490 }],
    [{ x: 250, y: 430 }, { x: 610, y: 500 }],
    [{ x: 150, y: 420 }, { x: 500, y: 470 }],
    [{ x: 330, y: 450 }, { x: 650, y: 490 }],
    [{ x: 180, y: 470 }, { x: 570, y: 430 }],
    [{ x: 280, y: 470 }, { x: 620, y: 460 }],
  ];
  const plates = positions[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const barrier = horizontalBarrier('g1', y, openingX, 82, plates.map((item) => item.id));
  return levelBase(variant + 13, 3, variant, {
    loopSeconds: 14,
    echoCap: 2,
    parEchoes: 2,
    spawn: { x: 100, y: 510 },
    exit: { x: 845, y: 150 },
    walls: barrier.walls,
    plates,
    gates: [barrier.gate],
  });
};

const makeChapterFour = (variant: number): LevelDefinition => {
  const firstOpening = [410, 380, 430, 350, 405, 370][variant];
  const secondOpening = [170, 210, 150, 230, 180, 250][variant];
  const points: Point[][] = [
    [{ x: 130, y: 160 }, { x: 285, y: 285 }, { x: 155, y: 455 }],
    [{ x: 160, y: 220 }, { x: 315, y: 145 }, { x: 285, y: 455 }],
    [{ x: 135, y: 440 }, { x: 305, y: 315 }, { x: 170, y: 170 }],
    [{ x: 180, y: 150 }, { x: 320, y: 250 }, { x: 160, y: 430 }],
    [{ x: 140, y: 280 }, { x: 300, y: 150 }, { x: 310, y: 455 }],
    [{ x: 160, y: 170 }, { x: 310, y: 300 }, { x: 150, y: 455 }],
  ];
  const plates = points[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const first = verticalBarrier('g1', 400, firstOpening, 72, plates.slice(0, 2).map((item) => item.id));
  const second = verticalBarrier('g2', 650, secondOpening, 72, plates.map((item) => item.id));
  return levelBase(variant + 19, 4, variant, {
    loopSeconds: 15,
    echoCap: 3,
    parEchoes: 3,
    spawn: { x: 92, y: 500 },
    exit: { x: 850, y: secondOpening + 36 },
    walls: [...first.walls, ...second.walls],
    plates,
    gates: [first.gate, second.gate],
  });
};

const makeChapterFive = (variant: number): LevelDefinition => {
  const lowerY = [400, 390, 420, 382, 410, 396][variant];
  const upperY = [235, 250, 220, 260, 242, 215][variant];
  const lowerOpening = [740, 680, 770, 710, 650, 790][variant];
  const upperOpening = [120, 170, 105, 210, 145, 190][variant];
  const points: Point[][] = [
    [{ x: 160, y: 475 }, { x: 390, y: 500 }, { x: 610, y: 470 }],
    [{ x: 130, y: 500 }, { x: 350, y: 455 }, { x: 600, y: 500 }],
    [{ x: 180, y: 500 }, { x: 430, y: 500 }, { x: 650, y: 500 }],
    [{ x: 140, y: 460 }, { x: 370, y: 510 }, { x: 620, y: 470 }],
    [{ x: 210, y: 490 }, { x: 450, y: 490 }, { x: 680, y: 500 }],
    [{ x: 150, y: 500 }, { x: 400, y: 470 }, { x: 640, y: 490 }],
  ];
  const plates = points[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const lower = horizontalBarrier('g1', lowerY, lowerOpening, 76, plates.slice(0, 2).map((item) => item.id));
  const upper = horizontalBarrier('g2', upperY, upperOpening, 76, plates.map((item) => item.id));
  return levelBase(variant + 25, 5, variant, {
    loopSeconds: 17,
    echoCap: 3,
    parEchoes: 3,
    spawn: { x: 90, y: 520 },
    exit: { x: 850, y: 145 },
    walls: [...lower.walls, ...upper.walls],
    plates,
    gates: [lower.gate, upper.gate],
  });
};

const makeChapterSix = (variant: number): LevelDefinition => {
  const firstOpening = [420, 390, 435, 365, 410, 380][variant];
  const secondOpening = [165, 210, 145, 235, 185, 255][variant];
  const points: Point[][] = [
    [{ x: 110, y: 150 }, { x: 275, y: 210 }, { x: 120, y: 390 }, { x: 285, y: 480 }],
    [{ x: 130, y: 185 }, { x: 290, y: 135 }, { x: 150, y: 350 }, { x: 300, y: 470 }],
    [{ x: 110, y: 430 }, { x: 270, y: 335 }, { x: 130, y: 150 }, { x: 300, y: 225 }],
    [{ x: 140, y: 150 }, { x: 295, y: 250 }, { x: 120, y: 410 }, { x: 290, y: 490 }],
    [{ x: 120, y: 270 }, { x: 285, y: 145 }, { x: 150, y: 450 }, { x: 305, y: 360 }],
    [{ x: 115, y: 145 }, { x: 295, y: 220 }, { x: 125, y: 410 }, { x: 300, y: 490 }],
  ];
  const plates = points[variant].map((point, index) => plate(`p${index + 1}`, point, index));
  const first = verticalBarrier('g1', 360, firstOpening, 68, plates.slice(0, 2).map((item) => item.id));
  const second = verticalBarrier('g2', 635, secondOpening, 68, plates.map((item) => item.id));
  return levelBase(variant + 31, 6, variant, {
    loopSeconds: 16,
    echoCap: 4,
    parEchoes: 4,
    spawn: { x: 82, y: 515 },
    exit: { x: 855, y: secondOpening + 34 },
    walls: [...first.walls, ...second.walls],
    plates,
    gates: [first.gate, second.gate],
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
