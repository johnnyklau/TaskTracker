import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Task } from '../api/tasks';
import {
  useAddSubtask,
  useAddTask,
  useDeleteTask,
  useMoveSubtask,
  useMoveTask,
  useUpdateSubtask,
  useUpdateTask,
} from '../hooks/useTasks';
import { TaskCloud } from './TaskCloud';
import { SubtaskCloud } from './SubtaskCloud';
import { DraftSubtaskCloud } from './DraftSubtaskCloud';
import { Connector } from './Connector';
import { TaskView } from './TaskView';
import { Toolbar } from './Toolbar';
import {
  CLOUD_ASPECT_RATIO,
  DEFAULT_SUBTASK_DX,
  DEFAULT_SUBTASK_DY,
  MAIN_CLOUD_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
  SUB_CLOUD_WIDTH,
} from './canvasConstants';

type CanvasViewProps = {
  tasks: Task[];
};

type Cam = { x: number; y: number };

const GOLDEN_ANGLE_DEG = 137.508;

/** Spiral placement for tasks that have never been positioned (x/y null). */
function autoPlacement(index: number): { x: number; y: number } {
  const angle = (index * GOLDEN_ANGLE_DEG * Math.PI) / 180;
  const radius = 120 * Math.sqrt(index + 1);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * Collision-avoiding placement for a new subtask relative to its parent.
 * Tries the default offset first (matches the DB default, so most tasks —
 * which only ever get one subtask — never pay for the search); if that
 * collides with an existing subtask, spirals outward around it until it
 * finds a spot far enough away not to visually overlap.
 */
function findSubtaskPlacement(existing: { dx: number; dy: number }[]): {
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

export function CanvasView({ tasks }: CanvasViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const moveTask = useMoveTask();
  const moveSubtask = useMoveSubtask();
  const updateTask = useUpdateTask();
  const updateSubtask = useUpdateSubtask();
  const addTask = useAddTask();
  const deleteTask = useDeleteTask();
  const addSubtask = useAddSubtask();

  const [cam, setCam] = useState<Cam>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [camAnim, setCamAnim] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draftSubtask, setDraftSubtask] = useState<{
    taskId: number;
    dx: number;
    dy: number;
  } | null>(null);

  const glideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const placedRef = useRef(new Set<number>());
  const didFitRef = useRef(false);
  const zoomRef = useRef(zoom);
  const camRef = useRef(cam);
  const openTaskIdRef = useRef(openTaskId);

  const glideTo = useCallback(
    (x: number, y: number, nextZoom: number, instant: boolean) => {
      setCam({ x, y });
      setZoom(nextZoom);
      setCamAnim(!instant);
      if (glideTimerRef.current) clearTimeout(glideTimerRef.current);
      if (!instant) {
        glideTimerRef.current = setTimeout(() => setCamAnim(false), 560);
      }
    },
    []
  );

  const fitAll = useCallback(
    (instant: boolean) => {
      const boxes: Array<[number, number, number]> = [];
      tasks.forEach((task) => {
        if (task.x === null || task.y === null) return;
        boxes.push([task.x, task.y, MAIN_CLOUD_WIDTH]);
        task.subtasks.forEach((subtask) =>
          boxes.push([
            task.x! + subtask.dx,
            task.y! + subtask.dy,
            SUB_CLOUD_WIDTH,
          ])
        );
      });

      if (boxes.length === 0) {
        glideTo(0, 0, 1, instant);
        return;
      }

      const x0 = Math.min(...boxes.map(([bx, , w]) => bx - w / 2));
      const x1 = Math.max(...boxes.map(([bx, , w]) => bx + w / 2));
      const y0 = Math.min(
        ...boxes.map(([, by, w]) => by - w / CLOUD_ASPECT_RATIO / 2)
      );
      const y1 = Math.max(
        ...boxes.map(([, by, w]) => by + w / CLOUD_ASPECT_RATIO / 2)
      );

      const rect = rootRef.current?.getBoundingClientRect();
      const width = rect?.width || window.innerWidth;
      const height = rect?.height || window.innerHeight;

      const floor = instant ? 0.5 : 0.35;
      const scale = Math.max(
        floor,
        Math.min(1, (width - 72) / (x1 - x0), (height - 120) / (y1 - y0))
      );
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      glideTo(-cx * scale, -cy * scale - 34, scale, instant);
    },
    [tasks, glideTo]
  );

  const recenter = useCallback(() => glideTo(0, 0, 1, false), [glideTo]);

  function handleAddTask() {
    const title = draft.trim();
    if (!title) return;
    addTask.mutate(title);
    setDraft('');
  }

  function toggleSearch() {
    setSearchOpen((open) => {
      if (open) setQuery('');
      return !open;
    });
  }

  // Auto-place any task that's never been positioned, then persist it.
  // Skips optimistic (negative-id) tasks still awaiting their real server id
  // — placing those would PATCH a position against an id that doesn't exist
  // yet server-side. Once useAddTask's onSuccess swaps in the real task
  // (still x/y null), this effect picks it up and places it for real.
  useEffect(() => {
    tasks.forEach((task, index) => {
      if (task.x !== null && task.y !== null) return;
      if (task.id < 0) return;
      if (placedRef.current.has(task.id)) return;
      placedRef.current.add(task.id);
      const { x, y } = autoPlacement(index);
      moveTask(task.id, x, y);
    });
  }, [tasks, moveTask]);

  // Initial framing, once every task has a real position. Deferred a frame
  // (matching the prototype) so the root element has real layout to measure.
  useEffect(() => {
    if (didFitRef.current) return;
    if (tasks.length === 0) return;
    if (tasks.some((task) => task.x === null || task.y === null)) return;
    didFitRef.current = true;
    const raf = requestAnimationFrame(() => fitAll(true));
    return () => cancelAnimationFrame(raf);
  }, [tasks, fitAll]);

  useEffect(() => {
    function handleResize() {
      fitAll(true);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitAll]);

  const closeTask = useCallback(() => setOpenTaskId(null), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeTask();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeTask]);

  function handleBackgroundPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (openTaskId !== null) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const originCam = cam;

    function handleMove(ev: PointerEvent) {
      setCam({
        x: originCam.x + (ev.clientX - startX),
        y: originCam.y + (ev.clientY - startY),
      });
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  // Wheel-zoom needs preventDefault to stop page scroll while zooming, but
  // React's onWheel is attached passive — preventDefault silently no-ops
  // there (confirmed via a real browser: "Unable to preventDefault inside
  // passive event listener invocation"). A native, explicitly non-passive
  // listener is the standard workaround. Refs avoid re-subscribing it on
  // every zoom/pan tick.
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);
  useEffect(() => {
    openTaskIdRef.current = openTaskId;
  }, [openTaskId]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (openTaskIdRef.current !== null) return;
      e.preventDefault();

      const currentZoom = zoomRef.current;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, currentZoom * Math.exp(-e.deltaY * 0.0015))
      );
      if (nextZoom === currentZoom) return;

      const rect = el!.getBoundingClientRect();
      const px = e.clientX - (rect.left + rect.width / 2);
      const py = e.clientY - (rect.top + rect.height / 2);
      const k = 1 - nextZoom / currentZoom;
      const prevCam = camRef.current;

      setZoom(nextZoom);
      setCamAnim(false);
      setCam({
        x: prevCam.x + (px - prevCam.x) * k,
        y: prevCam.y + (py - prevCam.y) * k,
      });
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  function handleOpenTask(taskId: number) {
    setOpenTaskId(taskId);
  }

  function handleAddSubtask(taskId: number) {
    const task = tasks.find((t) => t.id === taskId);
    const position = findSubtaskPlacement(task?.subtasks ?? []);
    setDraftSubtask({ taskId, ...position });
    closeTask();
  }

  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;
  const draftSubtaskTask = draftSubtask
    ? (tasks.find((task) => task.id === draftSubtask.taskId) ?? null)
    : null;

  const trimmedQuery = query.trim().toLowerCase();
  function matchesQuery(task: Task): boolean {
    if (!trimmedQuery) return true;
    if (task.title.toLowerCase().includes(trimmedQuery)) return true;
    if (task.notes.toLowerCase().includes(trimmedQuery)) return true;
    return task.subtasks.some((subtask) =>
      subtask.title.toLowerCase().includes(trimmedQuery)
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-140 w-full cursor-grab touch-none overflow-hidden bg-canvas select-none"
      style={{
        backgroundImage: 'radial-gradient(#E9D2B8 1.6px, transparent 1.6px)',
        backgroundSize: '30px 30px',
        backgroundPosition: `${cam.x}px ${cam.y}px`,
      }}
      onPointerDown={handleBackgroundPointerDown}
    >
      <div
        className="absolute left-1/2 top-1/2 h-0 w-0"
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${zoom})`,
          transition: camAnim
            ? 'transform 520ms cubic-bezier(.3,1.02,.36,1)'
            : 'none',
        }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 text-center text-[180px] leading-none font-extrabold tracking-[-2px] text-logo"
          style={{ width: 1440 }}
        >
          TASKTRACKER
        </div>

        {tasks.map((task) =>
          task.subtasks.map((subtask) => (
            <Connector
              key={subtask.id}
              originX={task.x ?? 0}
              originY={task.y ?? 0}
              dx={subtask.dx}
              dy={subtask.dy}
            />
          ))
        )}

        {tasks.map(
          (task) =>
            task.id !== openTaskId && (
              <TaskCloud
                key={task.id}
                task={task}
                zoom={zoom}
                opacity={matchesQuery(task) ? 1 : 0.22}
                onMove={moveTask}
                onOpen={handleOpenTask}
              />
            )
        )}

        {tasks.map((task) =>
          task.subtasks.map((subtask) => (
            <SubtaskCloud
              key={subtask.id}
              subtask={subtask}
              taskId={task.id}
              originX={task.x ?? 0}
              originY={task.y ?? 0}
              zoom={zoom}
              opacity={matchesQuery(task) ? 1 : 0.22}
              onMove={moveSubtask}
              onOpen={handleOpenTask}
            />
          ))
        )}

        {draftSubtaskTask && draftSubtask && (
          <DraftSubtaskCloud
            originX={draftSubtaskTask.x ?? 0}
            originY={draftSubtaskTask.y ?? 0}
            dx={draftSubtask.dx}
            dy={draftSubtask.dy}
            onCommit={(title) => {
              addSubtask.mutate({
                taskId: draftSubtaskTask.id,
                title,
                position: { dx: draftSubtask.dx, dy: draftSubtask.dy },
              });
              setDraftSubtask(null);
            }}
            onCancel={() => setDraftSubtask(null)}
          />
        )}
      </div>

      <Toolbar
        draft={draft}
        onDraftChange={setDraft}
        onAddTask={handleAddTask}
        searchOpen={searchOpen}
        onToggleSearch={toggleSearch}
        query={query}
        onQueryChange={setQuery}
        onRecenter={recenter}
        onFitAll={() => fitAll(false)}
      />

      <AnimatePresence>
        {openTask && (
          <TaskView
            key={openTask.id}
            task={openTask}
            onClose={closeTask}
            onToggleComplete={() =>
              updateTask.mutate({
                id: openTask.id,
                updates: { completed: !openTask.completed },
              })
            }
            onToggleSubtask={(id) => {
              const subtask = openTask.subtasks.find((s) => s.id === id);
              if (subtask) {
                updateSubtask.mutate({
                  id,
                  updates: { completed: !subtask.completed },
                });
              }
            }}
            // Deliberately not also calling closeTask() here: that sets
            // openTaskId=null synchronously, one commit *before* the delete
            // mutation's optimistic update removes the task from `tasks`
            // (it's behind an `await cancelQueries()`). In that gap the
            // task still exists but openTaskId is already null, so
            // TaskCloud's `task.id !== openTaskId` briefly turns true and
            // it remounts mid-exit, hijacking Motion's layoutId animation
            // and making it look like the close animation plays twice.
            // Deleting alone is enough — once the task leaves `tasks`,
            // `openTask` goes straight from found to undefined in one
            // commit, and TaskView closes with no intermediate state.
            onDelete={() => deleteTask.mutate(openTask.id)}
            onAddSubtask={() => handleAddSubtask(openTask.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
