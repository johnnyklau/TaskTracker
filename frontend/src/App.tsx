import { useTasks } from './hooks/useTasks';
import { CanvasView } from './components/CanvasView';

function App() {
  const { data: tasks = [], isPending, isError } = useTasks();

  if (isPending) {
    return <div className="h-full min-h-140 w-full bg-canvas" />;
  }

  if (isError) {
    return (
      <div className="flex h-full min-h-140 w-full items-center justify-center bg-canvas text-ink-soft">
        Something went wrong loading your tasks.
      </div>
    );
  }

  return <CanvasView tasks={tasks} />;
}

export default App;
