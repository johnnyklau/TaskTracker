import { motion } from 'motion/react';
import type { Task } from '../types';

type ListViewProps = {
  tasks: Task[];
  openTaskId: number | null;
  onOpenTask: (taskId: number) => void;
  matchesQuery: (task: Task) => boolean;
};

// Stub: every task renders under "Saved" until tasks carry task_list /
// priority, at which point this splits into the ordered Priority list and
// the unordered Saved list.
export function ListView({
  tasks,
  openTaskId,
  onOpenTask,
  matchesQuery,
}: ListViewProps) {
  const saved = [...tasks].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pt-12 pb-32">
      <section className="mx-auto max-w-xl">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-mute uppercase">
          Saved
        </h2>
        <ul className="flex flex-col gap-2">
          {saved.map(
            (task) =>
              task.id !== openTaskId && (
                <li key={task.id}>
                  <motion.button
                    // Shares TaskCloud's layoutId so TaskView's open/close
                    // animation morphs from the row the same way.
                    layoutId={`task-${task.id}`}
                    transition={{ layout: { duration: 0 } }}
                    onClick={() => onOpenTask(task.id)}
                    className="w-full rounded-[14px] border-[1.5px] border-surface-edge bg-cloud px-4 py-3 text-left text-base font-medium text-ink transition-opacity duration-260 ease-out hover:bg-hover-warm"
                    style={{ opacity: matchesQuery(task) ? 1 : 0.22 }}
                  >
                    <span className={task.completed ? 'line-through' : ''}>
                      {task.title}
                    </span>
                  </motion.button>
                </li>
              )
          )}
        </ul>
      </section>
    </div>
  );
}
