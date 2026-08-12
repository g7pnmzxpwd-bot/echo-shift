import { describe, expect, it } from 'vitest';

import { completeRound, parseProgress, serializeProgress } from './ProgressStore';

describe('ProgressStore', () => {
  it('falls back to a fresh sequential campaign for corrupt data', () => {
    expect(parseProgress('{broken', 36)).toEqual({ unlocked: 1, completed: [] });
  });

  it('drops invalid and non-contiguous completion entries', () => {
    const raw = JSON.stringify({ unlocked: 999, completed: [1, 2, 4, 36, -1, '3', 2] });
    expect(parseProgress(raw, 36)).toEqual({ unlocked: 3, completed: [1, 2] });
  });

  it('unlocks only the immediate successor', () => {
    const fresh = { unlocked: 1, completed: [] };
    expect(completeRound(fresh, 2, 36)).toEqual(fresh);
    expect(completeRound(fresh, 1, 36)).toEqual({ unlocked: 2, completed: [1] });
  });

  it('allows replaying earlier rounds without changing progression', () => {
    const progress = { unlocked: 3, completed: [1, 2] };
    expect(completeRound(progress, 1, 36)).toEqual(progress);
  });

  it('serializes a normalized compact record', () => {
    expect(serializeProgress({ unlocked: 12, completed: [1, 2, 4] }, 36)).toBe(
      JSON.stringify({ unlocked: 3, completed: [1, 2] }),
    );
  });
});
