type ConnectorProps = {
  originX: number;
  originY: number;
  dx: number;
  dy: number;
};

/** Line from a task's center to a subtask's center, offset (dx, dy) away. */
export function Connector({ originX, originY, dx, dy }: ConnectorProps) {
  const length = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <div
      className="pointer-events-none absolute h-[2.5px] origin-left rounded-full bg-[#9C8F84]"
      style={{
        left: originX,
        top: originY,
        width: length,
        transform: `rotate(${angleDeg}deg)`,
      }}
    />
  );
}
