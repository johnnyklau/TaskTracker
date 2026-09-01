import { useState, useEffect } from 'react';
import {
  fetchTasks,
  createTask,
  updateTaskCompleted,
  deleteTask,
  type Task,
} from './api/tasks';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetchTasks().then(setTasks);
  }, []);

  async function handleAddTask(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask = await createTask(newTitle);
    setTasks((prev) => [newTask, ...prev]);
    setNewTitle('');
  }

  async function handleToggleComplete(task: Task) {
    const updated = await updateTaskCompleted(task.id, !task.completed);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDeleteTask(id: number) {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
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
