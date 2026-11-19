import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ViewMode, type Task } from '../types';
import {
  useAddTask,
  useDeleteSubtask,
  useDeleteTask,
  useUpdateSubtask,
  useUpdateTask,
} from '../hooks/useTasks';
import { CloudView } from './CloudView';
import type { CloudViewControls } from './CloudView';
import { ListView } from './ListView';
import { TaskView } from './TaskView';
import { Toolbar } from './Toolbar';

type CanvasViewProps = {
  tasks: Task[];
};

export function CanvasView({ tasks }: CanvasViewProps) {
  const updateTask = useUpdateTask();
  const updateSubtask = useUpdateSubtask();
  const addTask = useAddTask();
  const deleteTask = useDeleteTask();
  const deleteSubtask = useDeleteSubtask();

  const [view, setView] = useState<ViewMode>(ViewMode.Cloud);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const cloudControlsRef = useRef<CloudViewControls>(null);

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

  function toggleView() {
    setView((current) =>
      current === ViewMode.Cloud ? ViewMode.List : ViewMode.Cloud
    );
  }

  const closeTask = useCallback(() => setOpenTaskId(null), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeTask();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeTask]);

  function handleAddSubtask(taskId: number) {
    // TODO: ListView needs its own inline add-subtask affordance.
    if (view === ViewMode.Cloud) cloudControlsRef.current?.startSubtask(taskId);
    closeTask();
  }

  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;

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
    <div className="relative h-full min-h-140 w-full overflow-hidden bg-canvas">
      {view === ViewMode.Cloud ? (
        <CloudView
          tasks={tasks}
          openTaskId={openTaskId}
          onOpenTask={setOpenTaskId}
          matchesQuery={matchesQuery}
          controlsRef={cloudControlsRef}
        />
      ) : (
        <ListView
          tasks={tasks}
          openTaskId={openTaskId}
          onOpenTask={setOpenTaskId}
          matchesQuery={matchesQuery}
        />
      )}

      <Toolbar
        draft={draft}
        onDraftChange={setDraft}
        onAddTask={handleAddTask}
        searchOpen={searchOpen}
        onToggleSearch={toggleSearch}
        currentView={view}
        onToggleView={toggleView}
        query={query}
        onQueryChange={setQuery}
        onRecenter={
          view === ViewMode.Cloud
            ? () => cloudControlsRef.current?.recenter()
            : undefined
        }
        onFitAll={
          view === ViewMode.Cloud
            ? () => cloudControlsRef.current?.fitAll()
            : undefined
        }
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
            onDeleteSubtask={(id) => deleteSubtask.mutate(id)}
            onSaveNotes={(notes) =>
              updateTask.mutate({ id: openTask.id, updates: { notes } })
            }
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
