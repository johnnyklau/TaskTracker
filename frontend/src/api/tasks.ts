const envApiUrl = import.meta.env.VITE_API_URL;
if (!envApiUrl && import.meta.env.PROD) {
  throw new Error('VITE_API_URL must be set in production builds');
}
const API_URL = envApiUrl || 'http://localhost:3000';

export type Subtask = {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
  dx: number;
  dy: number;
  created_at: string;
};

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  notes: string;
  x: number | null;
  y: number | null;
  subtasks: Subtask[];
};

// PATCH /tasks/:id returns the task row without `subtasks` (only GET/POST
// include it) — see the merge in useUpdateTask's onSuccess.
type TaskWithoutSubtasks = Omit<Task, 'subtasks'>;

function isSubtask(value: unknown): value is Subtask {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'number' &&
    typeof s.task_id === 'number' &&
    typeof s.title === 'string' &&
    typeof s.completed === 'boolean' &&
    typeof s.dx === 'number' &&
    typeof s.dy === 'number' &&
    typeof s.created_at === 'string'
  );
}

function isTaskWithoutSubtasks(value: unknown): value is TaskWithoutSubtasks {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'number' &&
    typeof t.title === 'string' &&
    typeof t.completed === 'boolean' &&
    typeof t.created_at === 'string' &&
    typeof t.notes === 'string' &&
    (t.x === null || typeof t.x === 'number') &&
    (t.y === null || typeof t.y === 'number')
  );
}

function isTask(value: unknown): value is Task {
  return (
    isTaskWithoutSubtasks(value) &&
    Array.isArray((value as Task).subtasks) &&
    (value as Task).subtasks.every(isSubtask)
  );
}

function assertTask(value: unknown): Task {
  if (!isTask(value)) throw new Error('Malformed task response from server');
  return value;
}

function assertTaskWithoutSubtasks(value: unknown): TaskWithoutSubtasks {
  if (!isTaskWithoutSubtasks(value)) {
    throw new Error('Malformed task response from server');
  }
  return value;
}

function assertTaskArray(value: unknown): Task[] {
  if (!Array.isArray(value) || !value.every(isTask)) {
    throw new Error('Malformed task list response from server');
  }
  return value;
}

function assertSubtask(value: unknown): Subtask {
  if (!isSubtask(value))
    throw new Error('Malformed subtask response from server');
  return value;
}

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_URL}/tasks`);
  if (!response.ok)
    throw new Error(`Failed to fetch tasks: ${response.status}`);
  return assertTaskArray(await response.json());
}

export async function createTask(title: string): Promise<Task> {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok)
    throw new Error(`Failed to create task: ${response.status}`);
  return assertTask(await response.json());
}

export async function updateTask(
  id: number,
  updates: Partial<Pick<Task, 'title' | 'notes' | 'x' | 'y' | 'completed'>>
): Promise<TaskWithoutSubtasks> {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok)
    throw new Error(`Failed to update task: ${response.status}`);
  return assertTaskWithoutSubtasks(await response.json());
}

export async function createSubtask(
  taskId: number,
  title: string,
  position?: { dx: number; dy: number }
): Promise<Subtask> {
  const response = await fetch(`${API_URL}/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, ...position }),
  });
  if (!response.ok)
    throw new Error(`Failed to create subtask: ${response.status}`);
  return assertSubtask(await response.json());
}

export async function updateSubtask(
  id: number,
  updates: Partial<Pick<Subtask, 'title' | 'completed' | 'dx' | 'dy'>>
): Promise<Subtask> {
  const response = await fetch(`${API_URL}/subtasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok)
    throw new Error(`Failed to update subtask: ${response.status}`);
  return assertSubtask(await response.json());
}

export async function deleteSubtask(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/subtasks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok)
    throw new Error(`Failed to delete subtask: ${response.status}`);
}

export async function deleteTask(id: number) {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok)
    throw new Error(`Failed to delete task: ${response.status}`);
}
