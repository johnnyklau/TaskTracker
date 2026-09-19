import type { PointerEvent as ReactPointerEvent } from 'react';
import { DRAG_THRESHOLD_PX } from './canvasConstants';

/**
 * Shared drag-vs-click handling for task/subtask clouds: a pointer move under
 * DRAG_THRESHOLD_PX (measured in screen px) is a click (fires onOpen), past it
 * it's a drag (fires onMove with the new position, in canvas space).
 */
export function createNodeDragHandler(
  getOrigin: () => { x: number; y: number },
  zoom: number,
  onMove: (x: number, y: number) => void,
  onOpen: (el: HTMLElement) => void
) {
  return function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const el = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = getOrigin();
    let moved = false;

    function handleMove(ev: PointerEvent) {
      const screenDistance = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (!moved && screenDistance < DRAG_THRESHOLD_PX) return;
      moved = true;
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      onMove(origin.x + dx, origin.y + dy);
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (!moved) onOpen(el);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };
}
