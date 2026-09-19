import type { Subtask } from '../api/tasks';
import { CloudShape } from './CloudShape';
import { createNodeDragHandler } from './nodeDrag';
import { CLOUD_ASPECT_RATIO, SUB_CLOUD_WIDTH } from './canvasConstants';

type SubtaskCloudProps = {
  subtask: Subtask;
  /** Parent task id — clicking a subtask opens its parent's task view. */
  taskId: number;
  originX: number;
  originY: number;
  zoom: number;
  opacity: number;
  onMove: (id: number, dx: number, dy: number) => void;
  onOpen: (taskId: number, el: HTMLElement) => void;
};

export function SubtaskCloud({
  subtask,
  taskId,
  originX,
  originY,
  zoom,
  opacity,
  onMove,
  onOpen,
}: SubtaskCloudProps) {
  const x = originX + subtask.dx;
  const y = originY + subtask.dy;

  const handlePointerDown = createNodeDragHandler(
    () => ({ x: subtask.dx, y: subtask.dy }),
    zoom,
    (dx, dy) => onMove(subtask.id, dx, dy),
    (el) => onOpen(taskId, el)
  );

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab transition-opacity duration-260 ease-out"
      style={{
        left: x,
        top: y,
        width: SUB_CLOUD_WIDTH,
        aspectRatio: CLOUD_ASPECT_RATIO,
        opacity,
      }}
      onPointerDown={handlePointerDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(taskId, e.currentTarget);
      }}
      role="button"
      tabIndex={0}
      aria-label={subtask.title}
    >
      <CloudShape
        strokeClassName={
          subtask.completed ? 'stroke-done' : 'stroke-outline-sub'
        }
        className="drop-shadow-[0_6px_14px_rgba(180,130,70,.13)]"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[14%] text-center text-[14px] leading-[1.32] font-medium text-ink text-pretty">
        {subtask.title}
      </div>
    </div>
  );
}
