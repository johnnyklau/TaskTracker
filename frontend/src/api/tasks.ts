const envApiUrl = import.meta.env.VITE_API_URL;
if (!envApiUrl && import.meta.env.PROD) {
  throw new Error('VITE_API_URL must be set in production builds');
}
const API_URL = envApiUrl || 'http://localhost:3000';

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_URL}/tasks`);
  if (!response.ok) throw new Error(response.status + 'Error fetching tasks');
  return (await response.json()) as Task[];
}

export async function createTask(title: string): Promise<Task> {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error(response.status + 'Error creating task');
  return (await response.json()) as Task;
}

export async function updateTaskCompleted(
  id: number,
  completed: boolean
): Promise<Task> {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!response.ok) throw new Error(response.status + 'Error updating task');
  return (await response.json()) as Task;
}

export async function deleteTask(id: number) {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error(response.status + 'Error fetching tasks');
}
