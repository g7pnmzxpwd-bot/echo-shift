export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export interface PlateDefinition extends Point {
  id: string;
  label: string;
}

export interface GateDefinition {
  id: string;
  rect: Rect;
  requiresPlateIds: string[];
  orientation: 'vertical' | 'horizontal';
}

export interface LevelDefinition {
  id: string;
  number: number;
  chapter: number;
  chapterName: string;
  name: string;
  subtitle: string;
  loopSeconds: number;
  echoCap: number;
  parEchoes: number;
  spawn: Point;
  exit: Point;
  walls: Rect[];
  plates: PlateDefinition[];
  gates: GateDefinition[];
}

export const PLAY_BOUNDS: Rect = { x: 50, y: 92, width: 860, height: 466 };
