const API_URL = 'http://localhost:3000';

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_URL}/tasks`);
  return response.json();
}

export async function createTask(title: string): Promise<Task> {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return response.json();
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
  return response.json();
}

export async function deleteTask(id: number) {
  await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });
}
