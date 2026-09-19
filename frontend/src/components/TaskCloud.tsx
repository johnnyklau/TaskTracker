import { motion } from 'motion/react';
import type { Task } from '../api/tasks';
import { CloudShape } from './CloudShape';
import { createNodeDragHandler } from './nodeDrag';
import { CLOUD_ASPECT_RATIO, MAIN_CLOUD_WIDTH } from './canvasConstants';

type TaskCloudProps = {
  task: Task;
  zoom: number;
  opacity: number;
  onMove: (id: number, x: number, y: number) => void;
  onOpen: (id: number, el: HTMLElement) => void;
};

export function TaskCloud({
  task,
  zoom,
  opacity,
  onMove,
  onOpen,
}: TaskCloudProps) {
  const x = task.x ?? 0;
  const y = task.y ?? 0;

  const handlePointerDown = createNodeDragHandler(
    () => ({ x, y }),
    zoom,
    (nx, ny) => onMove(task.id, nx, ny),
    (el) => onOpen(task.id, el)
  );

  return (
    <motion.div
      layoutId={`task-${task.id}`}
      // `layoutId` makes Motion continuously track this element's rendered
      // bounding box, not just the open/close TaskView handoff — including
      // shifts caused purely by CanvasView's pan/zoom transform on an
      // ancestor. Without this, every camera pan/zoom gets treated as a
      // "layout change" and spring-animated, so clouds visibly lag behind
      // the cursor instead of tracking it 1:1. `layout: {duration: 0}`
      // keeps the (still-needed) TaskCloud<->TaskView shared transition —
      // TaskView's own `transition` governs how that one animates — while
      // making any other incidental bounding-box correction instant.
      transition={{ layout: { duration: 0 } }}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab transition-opacity duration-260 ease-out"
      style={{
        left: x,
        top: y,
        width: MAIN_CLOUD_WIDTH,
        aspectRatio: CLOUD_ASPECT_RATIO,
        opacity,
      }}
      onPointerDown={handlePointerDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task.id, e.currentTarget);
      }}
      role="button"
      tabIndex={0}
      aria-label={task.title}
    >
      <CloudShape
        strokeClassName={task.completed ? 'stroke-done' : 'stroke-outline'}
        className="drop-shadow-[0_6px_14px_rgba(180,130,70,.13)]"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[14%] text-center text-[18px] leading-[1.32] font-medium text-ink text-pretty">
        {task.title}
      </div>
    </motion.div>
  );
}
