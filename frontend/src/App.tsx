import { useEffect } from 'react';
import { AuthForm } from './components/AuthForm';
import { CanvasView } from './components/CanvasView';
import { useAuth } from './context/useAuth';
import { useTasks } from './hooks/useTasks';

function App() {
  const { user, logout } = useAuth();

  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const { data: tasks = [], isPending, isError } = useTasks();

  if (!user) {
    return <AuthForm />;
  }

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
