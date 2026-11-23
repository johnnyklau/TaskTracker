import { useState } from 'react';
import { IoCheckmarkSharp } from 'react-icons/io5';

type AddTaskFormProps = {
  onAddTask: (newTaskTitle: string) => void;
};

export function AddTaskForm({ onAddTask }: AddTaskFormProps) {
  const [draft, setDraft] = useState('');

  function submit() {
    const title = draft.trim();
    if (!title) {
      setDraft('');
      return;
    }
    onAddTask(title);
    setDraft('');
  }

  return (
    <div className="flex items-center gap-2.5 py-0 pr-1.5 pl-3.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        maxLength={100}
        placeholder="New task"
        aria-label="New task"
        className="w-57.5 border-none bg-transparent py-2.5 font-sans text-base font-medium text-ink outline-none"
      />

      <button
        onClick={submit}
        title="Add task"
        className="flex h-10.5 items-center gap-2 rounded-[14px] bg-done px-4.5 text-[15px] font-semibold text-white transition-all duration-180 hover:brightness-105 active:translate-y-px cursor-pointer"
      >
        <IoCheckmarkSharp size={15} />
        Add
      </button>
    </div>
  );
}
