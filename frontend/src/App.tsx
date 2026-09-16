import { useState } from 'react';
import { type Task } from './api/tasks';
import {
  useAddTask,
  useCompleteTask,
  useDeleteTask,
  useTasks,
} from './hooks/useTasks';

function App() {
  const [newTitle, setNewTitle] = useState('');

  const { data: tasks = [], isPending, isError } = useTasks();
  const completeTaskMutation = useCompleteTask();
  const addTaskMutation = useAddTask();
  const deleteTaskMutation = useDeleteTask();

  if (isPending) return <></>;
  if (isError) return <></>; // TODO: Address loading/error states

  function handleToggleComplete(task: Task) {
    completeTaskMutation.mutate({ id: task.id, completed: !task.completed });
  }

  function handleAddTask(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTaskMutation.mutate(newTitle);
    setNewTitle('');
  }

  function handleDeleteTask(id: number) {
    deleteTaskMutation.mutate(id);
  }

  return (
    <div>
      <h1>TaskTracker</h1>
      <form onSubmit={handleAddTask}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task"
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleToggleComplete(task)}
            />
            {task.title}
            <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
