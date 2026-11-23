import { IoLocateSharp, IoScanSharp } from 'react-icons/io5';
import { AccountMenu } from './AccountMenu';
import { AddTaskForm } from './AddTaskForm';
import { ToolbarButton } from './ToolbarButton';
import { TaskFilter } from './TaskFilter';

type ToolbarProps = {
  onAddTask: (title: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onRecenter: () => void;
  onFitAll: () => void;
};

export function Toolbar({
  onAddTask,
  query,
  onQueryChange,
  onRecenter,
  onFitAll,
}: ToolbarProps) {
  return (
    <div
      className="fixed bottom-7 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-[20px] border-[1.5px] border-surface-edge bg-cloud/92 p-2 shadow-[0_10px_30px_rgba(170,120,60,.14),0_2px_5px_rgba(170,120,60,.08)] backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <AddTaskForm onAddTask={onAddTask} />

      <ToolbarDivider />

      <TaskFilter query={query} onQueryChange={onQueryChange} />

      <ToolbarButton onClick={onRecenter} label="Recenter canvas">
        <IoLocateSharp size={19} />
      </ToolbarButton>

      <ToolbarButton onClick={onFitAll} label="Fit all tasks">
        <IoScanSharp size={19} />
      </ToolbarButton>

      <ToolbarDivider />

      <AccountMenu />
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-6.5 w-[1.5px] bg-surface-edge" />;
}
