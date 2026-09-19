import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { vi } from 'vitest';
import * as api from './api/tasks';
import type { Task } from './api/tasks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('./api/tasks');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Buy milk',
    completed: false,
    created_at: '2026-01-01',
    notes: '',
    x: 0,
    y: 0,
    subtasks: [],
    ...overrides,
  };
}

describe('App', () => {
  it('renders one cloud per task', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue([
      makeTask({ id: 1, title: 'Buy milk', x: -200, y: 0 }),
      makeTask({ id: 2, title: 'Walk the cat', x: 200, y: 0 }),
    ]);

    renderWithClient(<App />);

    expect(await screen.findByRole('button', { name: 'Buy milk' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Walk the cat' })).toBeInTheDocument();
  });

  it('clicking a cloud opens TaskView with the right title', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchTasks).mockResolvedValue([makeTask({ title: 'Pet the cat' })]);

    renderWithClient(<App />);
    const cloud = await screen.findByRole('button', { name: 'Pet the cat' });
    await user.click(cloud);

    expect(await screen.findByText('Notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark complete|Completed/ })).toBeInTheDocument();
  });

  it('fires the update mutation when toggling complete in TaskView', async () => {
    const user = userEvent.setup();
    const task = makeTask({ id: 3, title: 'Pet the cat', completed: false });
    vi.mocked(api.fetchTasks).mockResolvedValue([task]);
    vi.mocked(api.updateTask).mockResolvedValue({ ...task, completed: true });

    renderWithClient(<App />);
    const cloud = await screen.findByRole('button', { name: 'Pet the cat' });
    await user.click(cloud);

    const completeButton = await screen.findByRole('button', { name: 'Mark complete' });
    await user.click(completeButton);

    expect(api.updateTask).toHaveBeenCalledWith(3, { completed: true });
  });

  it('fires the delete mutation and closes TaskView when deleting a task', async () => {
    const user = userEvent.setup();
    const task = makeTask({ id: 7, title: 'Pet the cat' });
    vi.mocked(api.fetchTasks).mockResolvedValue([task]);
    vi.mocked(api.deleteTask).mockResolvedValue(undefined);

    renderWithClient(<App />);
    const cloud = await screen.findByRole('button', { name: 'Pet the cat' });
    await user.click(cloud);

    const deleteButton = await screen.findByRole('button', { name: 'Delete task' });
    await user.click(deleteButton);

    expect(api.deleteTask).toHaveBeenCalledWith(7);
    await waitFor(() => {
      expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    });
  });

  it('debounces drag position updates into a single mutation call, not one per move', async () => {
    const task = makeTask({ id: 5, title: 'Ship the drag-canvas prototype', x: 0, y: 0 });
    vi.mocked(api.fetchTasks).mockResolvedValue([task]);
    vi.mocked(api.updateTask).mockResolvedValue({ ...task, x: 80, y: 80 });

    renderWithClient(<App />);
    const cloud = await screen.findByRole('button', { name: 'Ship the drag-canvas prototype' });

    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(cloud, { clientX: 100, clientY: 100 });
      // Past the 4px drag-vs-click threshold, and beyond a single move —
      // only the debounced final position should ever reach the API.
      fireEvent.pointerMove(window, { clientX: 130, clientY: 110 });
      fireEvent.pointerMove(window, { clientX: 150, clientY: 130 });
      fireEvent.pointerMove(window, { clientX: 180, clientY: 180 });
      fireEvent.pointerUp(window, { clientX: 180, clientY: 180 });

      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }

    expect(api.updateTask).toHaveBeenCalledTimes(1);
    expect(api.updateTask).toHaveBeenCalledWith(5, { x: 80, y: 80 });
  });
});
