import {
  DEFAULT_SUBTASK_DX,
  DEFAULT_SUBTASK_DY,
  GOLDEN_ANGLE_DEG,
  MAIN_CLOUD_WIDTH,
  SUB_CLOUD_WIDTH,
} from './canvasConstants';

/** Collision-avoiding spiral placement for a task that's never been positioned. */
export function findTaskPlacement(existing: { x: number; y: number }[]): {
  x: number;
  y: number;
} {
  const minDistance = MAIN_CLOUD_WIDTH * 1.05;
  const collides = (x: number, y: number) =>
    existing.some((t) => Math.hypot(t.x - x, t.y - y) < minDistance);

  for (let attempt = 0; attempt < 200; attempt++) {
    const angle = (attempt * GOLDEN_ANGLE_DEG * Math.PI) / 180;
    const radius = 120 * Math.sqrt(attempt + 1);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (!collides(x, y)) return { x, y };
  }

  return { x: existing.length * minDistance, y: 0 };
}

/**
 * Collision-avoiding placement for a new subtask relative to its parent.
 * Tries the default offset first (matches the DB default, so most tasks —
 * which only ever get one subtask — never pay for the search); if that
 * collides with an existing subtask, spirals outward around it until it
 * finds a spot far enough away not to visually overlap.
 */
export function findSubtaskPlacement(existing: { dx: number; dy: number }[]): {
  dx: number;
  dy: number;
} {
  const minDistance = SUB_CLOUD_WIDTH * 1.05;
  const collides = (dx: number, dy: number) =>
    existing.some((s) => Math.hypot(s.dx - dx, s.dy - dy) < minDistance);

  if (!collides(DEFAULT_SUBTASK_DX, DEFAULT_SUBTASK_DY)) {
    return { dx: DEFAULT_SUBTASK_DX, dy: DEFAULT_SUBTASK_DY };
  }

  const baseRadius = Math.hypot(DEFAULT_SUBTASK_DX, DEFAULT_SUBTASK_DY);
  const baseAngle = Math.atan2(DEFAULT_SUBTASK_DY, DEFAULT_SUBTASK_DX);

  for (let attempt = 1; attempt <= 40; attempt++) {
    const angle = baseAngle + (attempt * GOLDEN_ANGLE_DEG * Math.PI) / 180;
    const radius = baseRadius + attempt * (minDistance * 0.5);
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    if (!collides(dx, dy)) return { dx, dy };
  }

  // Fallback (shouldn't realistically happen with 40 attempts): stack
  // straight down far enough to clear everything tried so far.
  return {
    dx: DEFAULT_SUBTASK_DX,
    dy: DEFAULT_SUBTASK_DY + existing.length * minDistance,
  };
}
