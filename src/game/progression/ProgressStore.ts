export const PROGRESS_KEY = 'echo-shift-progress-v1';

export interface ProgressState {
  unlocked: number;
  completed: number[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const freshProgress = (): ProgressState => ({ unlocked: 1, completed: [] });

const normalizeProgress = (value: unknown, totalRounds: number): ProgressState => {
  if (!value || typeof value !== 'object') return freshProgress();
  const candidate = value as { completed?: unknown };
  if (!Array.isArray(candidate.completed)) return freshProgress();

  const valid = new Set(
    candidate.completed.filter(
      (round): round is number => Number.isInteger(round) && Number(round) >= 1 && Number(round) <= totalRounds,
    ),
  );
  const completed: number[] = [];
  for (let round = 1; round <= totalRounds && valid.has(round); round += 1) completed.push(round);
  const unlocked = completed.length >= totalRounds ? totalRounds : completed.length + 1;
  return { unlocked, completed };
};

export const parseProgress = (raw: string | null, totalRounds: number): ProgressState => {
  if (!raw) return freshProgress();
  try {
    return normalizeProgress(JSON.parse(raw), totalRounds);
  } catch {
    return freshProgress();
  }
};

export const readProgress = (storage: StorageLike, totalRounds: number): ProgressState => {
  try {
    return parseProgress(storage.getItem(PROGRESS_KEY), totalRounds);
  } catch {
    return freshProgress();
  }
};

export const completeRound = (
  current: ProgressState,
  round: number,
  totalRounds: number,
): ProgressState => {
  const normalized = normalizeProgress(current, totalRounds);
  if (!Number.isInteger(round) || round < 1 || round > normalized.unlocked) return normalized;
  if (normalized.completed.includes(round)) return normalized;
  return normalizeProgress({ completed: [...normalized.completed, round] }, totalRounds);
};

export const serializeProgress = (progress: ProgressState, totalRounds: number): string =>
  JSON.stringify(normalizeProgress(progress, totalRounds));

export const writeProgress = (
  storage: StorageLike,
  progress: ProgressState,
  totalRounds: number,
): boolean => {
  try {
    storage.setItem(PROGRESS_KEY, serializeProgress(progress, totalRounds));
    return true;
  } catch {
    return false;
  }
};
