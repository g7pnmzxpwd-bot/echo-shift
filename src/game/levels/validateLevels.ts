import type { LevelDefinition, Point, Rect } from './types';
import { PLAY_BOUNDS } from './types';

const PLAYER_RADIUS = 12;
const GRID_STEP = 16;

const pointHitsRect = (point: Point, radius: number, rect: Rect): boolean => {
  const nearestX = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
  const dx = point.x - nearestX;
  const dy = point.y - nearestY;
  return dx * dx + dy * dy < radius * radius;
};

const insideBounds = (point: Point, radius = PLAYER_RADIUS): boolean =>
  point.x >= PLAY_BOUNDS.x + radius &&
  point.x <= PLAY_BOUNDS.x + PLAY_BOUNDS.width - radius &&
  point.y >= PLAY_BOUNDS.y + radius &&
  point.y <= PLAY_BOUNDS.y + PLAY_BOUNDS.height - radius;

const rectInsideBounds = (rect: Rect): boolean =>
  rect.x >= PLAY_BOUNDS.x &&
  rect.y >= PLAY_BOUNDS.y &&
  rect.x + rect.width <= PLAY_BOUNDS.x + PLAY_BOUNDS.width &&
  rect.y + rect.height <= PLAY_BOUNDS.y + PLAY_BOUNDS.height;

const reachable = (level: LevelDefinition, target: Point, includeClosedGates: boolean): boolean => {
  const colliders = [
    ...level.walls,
    ...(includeClosedGates ? level.gates.map((gate) => gate.rect) : []),
  ];
  const columns = Math.floor((PLAY_BOUNDS.width - PLAYER_RADIUS * 2) / GRID_STEP) + 1;
  const rows = Math.floor((PLAY_BOUNDS.height - PLAYER_RADIUS * 2) / GRID_STEP) + 1;
  const pointFor = (column: number, row: number): Point => ({
    x: PLAY_BOUNDS.x + PLAYER_RADIUS + column * GRID_STEP,
    y: PLAY_BOUNDS.y + PLAYER_RADIUS + row * GRID_STEP,
  });
  const nearestCell = (point: Point): [number, number] => [
    Math.max(0, Math.min(columns - 1, Math.round((point.x - PLAY_BOUNDS.x - PLAYER_RADIUS) / GRID_STEP))),
    Math.max(0, Math.min(rows - 1, Math.round((point.y - PLAY_BOUNDS.y - PLAYER_RADIUS) / GRID_STEP))),
  ];
  const [startColumn, startRow] = nearestCell(level.spawn);
  const [targetColumn, targetRow] = nearestCell(target);
  const key = (column: number, row: number) => row * columns + column;
  const queue: [number, number][] = [[startColumn, startRow]];
  const visited = new Set<number>([key(startColumn, startRow)]);

  while (queue.length > 0) {
    const [column, row] = queue.shift()!;
    if (column === targetColumn && row === targetRow) return true;
    for (const [nextColumn, nextRow] of [
      [column + 1, row], [column - 1, row], [column, row + 1], [column, row - 1],
    ] as [number, number][]) {
      if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
      const cellKey = key(nextColumn, nextRow);
      if (visited.has(cellKey)) continue;
      const point = pointFor(nextColumn, nextRow);
      if (colliders.some((rect) => pointHitsRect(point, PLAYER_RADIUS, rect))) continue;
      visited.add(cellKey);
      queue.push([nextColumn, nextRow]);
    }
  }
  return false;
};

export const validateLevel = (level: LevelDefinition): string[] => {
  const errors: string[] = [];
  const plateIds = level.plates.map((plate) => plate.id);
  const gateIds = level.gates.map((gate) => gate.id);

  if (new Set(plateIds).size !== plateIds.length) errors.push(`${level.id}: duplicate plate id`);
  if (new Set(gateIds).size !== gateIds.length) errors.push(`${level.id}: duplicate gate id`);
  if (level.echoCap < level.plates.length) errors.push(`${level.id}: echoCap is below mandatory plate count`);
  if (level.parEchoes > level.echoCap) errors.push(`${level.id}: parEchoes exceeds echoCap`);
  if (level.loopSeconds < 8 || level.loopSeconds > 20) errors.push(`${level.id}: loopSeconds outside 8..20`);
  if (!insideBounds(level.spawn)) errors.push(`${level.id}: spawn outside play bounds`);
  if (!insideBounds(level.exit)) errors.push(`${level.id}: exit outside play bounds`);

  for (const wall of level.walls) {
    if (!rectInsideBounds(wall)) errors.push(`${level.id}: wall outside play bounds`);
  }
  for (const gate of level.gates) {
    if (!rectInsideBounds(gate.rect)) errors.push(`${level.id}: gate ${gate.id} outside play bounds`);
    for (const plateId of gate.requiresPlateIds) {
      if (!plateIds.includes(plateId)) errors.push(`${level.id}: gate ${gate.id} references missing plate ${plateId}`);
    }
  }
  for (const plate of level.plates) {
    if (!insideBounds(plate, 34)) errors.push(`${level.id}: plate ${plate.id} outside safe bounds`);
    if (level.walls.some((wall) => pointHitsRect(plate, 34, wall))) {
      errors.push(`${level.id}: plate ${plate.id} overlaps a wall`);
    }
    if (!reachable(level, plate, true)) errors.push(`${level.id}: plate ${plate.id} unreachable with gates closed`);
  }
  if (level.walls.some((wall) => pointHitsRect(level.spawn, PLAYER_RADIUS, wall))) {
    errors.push(`${level.id}: spawn overlaps a wall`);
  }
  if (!reachable(level, level.exit, false)) errors.push(`${level.id}: exit unreachable with gates open`);
  return errors;
};

export const validateLevelPack = (levels: LevelDefinition[]): string[] => {
  const errors = levels.flatMap(validateLevel);
  if (new Set(levels.map((level) => level.id)).size !== levels.length) errors.push('level pack has duplicate ids');
  for (let chapter = 1; chapter <= 6; chapter += 1) {
    if (levels.filter((level) => level.chapter === chapter).length !== 6) {
      errors.push(`chapter ${chapter} does not contain six rounds`);
    }
  }
  return errors;
};
