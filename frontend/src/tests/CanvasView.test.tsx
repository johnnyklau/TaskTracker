import { MAIN_CLOUD_WIDTH } from '../components/canvasConstants';
import { findTaskPlacement } from '../components/CanvasHelpers';

describe('findTaskPlacement', () => {
  it('returns a position when there are no existing tasks', () => {
    const result = findTaskPlacement([]);
    expect(result.x).toBeTypeOf('number');
    expect(result.y).toBeTypeOf('number');
  });

  it('does not collide with a single existing task', () => {
    const existing = [{ x: 120, y: 0 }];
    const result = findTaskPlacement(existing);
    expect(
      Math.hypot(result.x - existing[0].x, result.y - existing[0].y)
    ).toBeGreaterThanOrEqual(MAIN_CLOUD_WIDTH * 1.05);
  });

  it('does not collide with any of several existing tasks', () => {
    const existing = [
      { x: 120, y: 0 },
      { x: -80, y: 140 },
      { x: 200, y: -150 },
    ];
    const result = findTaskPlacement(existing);
    for (const e of existing) {
      expect(Math.hypot(result.x - e.x, result.y - e.y)).toBeGreaterThanOrEqual(
        MAIN_CLOUD_WIDTH * 1.05
      );
    }
  });

  it('picks a different spot once a prior result is fed back in as occupied', () => {
    const first = findTaskPlacement([]);
    const second = findTaskPlacement([first]);
    expect(second).not.toEqual(first);
  });
});
