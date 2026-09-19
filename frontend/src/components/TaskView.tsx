import { motion } from 'motion/react';
import type { Task } from '../api/tasks';
import { CloudShape } from './CloudShape';
import { CLOUD_ASPECT_RATIO } from './canvasConstants';

type TaskViewProps = {
  task: Task;
  onClose: () => void;
  onToggleComplete: () => void;
  onToggleSubtask: (id: number) => void;
  onDelete: () => void;
  onAddSubtask: () => void;
};

function CheckIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <path d="M2 6.4 4.7 9 10 3.2" />
    </svg>
  );
}

export function TaskView({
  task,
  onClose,
  onToggleComplete,
  onToggleSubtask,
  onDelete,
  onAddSubtask,
}: TaskViewProps) {
  return (
    <>
      <motion.div
        className="fixed inset-0 z-60 bg-[#3A2A18]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.42 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.42 }}
        onPointerDown={onClose}
      />
      <motion.div
        layoutId={`task-${task.id}`}
        className="fixed top-1/2 left-1/2 z-61 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 'min(860px, 92vw, 132vh)', aspectRatio: CLOUD_ASPECT_RATIO }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <CloudShape
          strokeClassName={task.completed ? 'stroke-done' : 'stroke-outline'}
          strokeWidth={2.5}
          className="drop-shadow-[0_18px_44px_rgba(50,30,10,.28)]"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-between px-[14.5%] pt-[16%] pb-[15.5%] text-center">
          <div className="text-[clamp(20px,3.3vw,34px)] leading-[1.14] font-extrabold tracking-[-0.4px] text-ink text-balance">
            {task.title}
          </div>

          <div className="flex max-w-full flex-col items-center gap-2.5">
            <div className="text-[13px] font-semibold tracking-[.14em] text-[#B08A55] uppercase">
              Notes
            </div>
            <div className="text-[clamp(13px,1.5vw,17px)] leading-[1.45] text-ink-soft text-pretty">
              {task.notes || 'No notes yet.'}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {task.subtasks.map((subtask) => (
                <button
                  key={subtask.id}
                  onClick={() => onToggleSubtask(subtask.id)}
                  className={`flex items-center gap-[9px] rounded-full border-[1.5px] bg-[#FFFDFA] py-[7px] pr-3.5 pl-2.5 text-[14px] font-medium transition-colors duration-220 ${
                    subtask.completed ? 'border-done text-[#3C6B28]' : 'border-[#EBD9C4] text-ink-soft'
                  }`}
                >
                  <span
                    className={`flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full border-[1.5px] ${
                      subtask.completed ? 'border-done bg-done' : 'border-[#EBD9C4] bg-transparent'
                    }`}
                  >
                    <CheckIcon visible={subtask.completed} />
                  </span>
                  {subtask.title}
                </button>
              ))}
              <button
                onClick={onAddSubtask}
                className="flex items-center gap-[7px] rounded-full border-[1.5px] border-dashed border-[#EBD9C4] bg-transparent py-[7px] pr-3.5 pl-2.5 text-[14px] font-medium text-ink-mute transition-colors duration-220 hover:border-outline-sub hover:text-ink-soft"
              >
                <svg width="12" height="12" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M11 4v14M4 11h14" />
                </svg>
                Add subtask
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleComplete}
              className={`flex items-center gap-2.5 rounded-full border-[1.5px] px-[22px] py-2.5 text-[15px] font-semibold transition-colors duration-220 ${
                task.completed
                  ? 'border-done bg-[rgba(126,217,87,.14)] text-[#3C6B28]'
                  : 'border-outline bg-[#FFFDFA] text-[#6B5844]'
              }`}
            >
              <span
                className={`flex h-[19px] w-[19px] items-center justify-center rounded-full border-[1.5px] ${
                  task.completed ? 'border-done bg-done' : 'border-outline bg-transparent'
                }`}
              >
                <CheckIcon visible={task.completed} />
              </span>
              {task.completed ? 'Completed' : 'Mark complete'}
            </button>

            <button
              onClick={onDelete}
              title="Delete task"
              aria-label="Delete task"
              className="flex h-10.5 w-10.5 items-center justify-center rounded-full border-[1.5px] border-[#EBD9C4] bg-[#FFFDFA] text-[#6B5844] transition-colors duration-220 hover:border-[#E5A98F] hover:bg-[#FBEAE3] hover:text-[#B8492E]"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 22 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6.5h14M8.3 6.5V4.4A1.4 1.4 0 0 1 9.7 3h2.6a1.4 1.4 0 0 1 1.4 1.4v2.1" />
                <path d="M6.4 6.5 7.2 18a1.6 1.6 0 0 0 1.6 1.5h4.4a1.6 1.6 0 0 0 1.6-1.5l.8-11.5" />
                <path d="M9.3 9.8v6M12.7 9.8v6" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
