import { describe, expect, it } from 'vitest';

import { EchoTimeline, type EchoFrame } from './EchoTimeline';

const frame = (x: number, y = 0, action = false): EchoFrame => ({
  x,
  y,
  facing: 'right',
  action,
});

describe('EchoTimeline', () => {
  it('records one frame per fixed tick and clamps at the loop budget', () => {
    const timeline = new EchoTimeline(3);

    timeline.record(frame(1));
    timeline.record(frame(2));
    timeline.record(frame(3));
    timeline.record(frame(4));

    expect(timeline.currentLength).toBe(3);
    expect(timeline.currentFrame(2)).toEqual(frame(3));
  });

  it('commits an immutable echo and starts a clean current loop', () => {
    const timeline = new EchoTimeline(10);
    timeline.record(frame(4, 8));
    timeline.commit();

    expect(timeline.echoCount).toBe(1);
    expect(timeline.currentLength).toBe(0);
    expect(timeline.echoFrame(0, 0)).toEqual(frame(4, 8));
  });

  it('keeps an echo at its final position after its recording ends', () => {
    const timeline = new EchoTimeline(10);
    timeline.record(frame(1));
    timeline.record(frame(5));
    timeline.commit();

    expect(timeline.echoFrame(0, 999)).toEqual(frame(5));
  });

  it('can discard only the current attempt while preserving committed echoes', () => {
    const timeline = new EchoTimeline(10);
    timeline.record(frame(1));
    timeline.commit();
    timeline.record(frame(9));
    timeline.discardCurrent();

    expect(timeline.echoCount).toBe(1);
    expect(timeline.currentLength).toBe(0);
    expect(timeline.echoFrame(0, 0)).toEqual(frame(1));
  });

  it('can clear all echoes when restarting the level', () => {
    const timeline = new EchoTimeline(10);
    timeline.record(frame(1));
    timeline.commit();
    timeline.clear();

    expect(timeline.echoCount).toBe(0);
    expect(timeline.currentLength).toBe(0);
  });
});
