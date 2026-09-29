import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '../api/tasks';
import type { ReactNode } from 'react';
import type { Task } from '../api/tasks';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDeleteTask, useUpdateSubtask } from '../hooks/useTasks';

vi.mock('../api/tasks');

function makeWrapper(intialTasks: api.Task[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(['tasks'], intialTasks);
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useTasks rollback', () => {
  it('reverts only completed on a failed subtask toggle, leaving other fields untouched', async () => {
    const initialTasks: Task[] = [
      {
        id: 1,
        title: 'Task A',
        completed: false,
        created_at: '2026-01-01',
        notes: '',
        x: 0,
        y: 0,
        subtasks: [
          {
            id: 10,
            task_id: 1,
            title: 'Sub A',
            completed: false,
            dx: 180,
            dy: -140,
            created_at: '2026-01-01',
          },
        ],
      },
    ];
    const { queryClient, wrapper } = makeWrapper(initialTasks);
    vi.mocked(api.updateSubtask).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useUpdateSubtask(), { wrapper });

    act(() => {
      result.current.mutate({ id: 10, updates: { completed: true } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const subtask = queryClient.getQueryData<Task[]>(['tasks'])?.[0]
      .subtasks[0];
    expect(subtask?.completed).toBe(false);
    expect(subtask?.title).toBe('Sub A');
  });

  it('reinserts a task exactly once when a delete fails', async () => {
    const initialTasks: Task[] = [
      {
        id: 1,
        title: 'Task A',
        completed: false,
        created_at: '2026-01-01',
        notes: '',
        x: 0,
        y: 0,
        subtasks: [],
      },
    ];
    const { queryClient, wrapper } = makeWrapper(initialTasks);
    vi.mocked(api.deleteTask).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const tasks = queryClient.getQueryData<Task[]>(['tasks']);
    expect(tasks).toHaveLength(1);
    expect(tasks?.[0].id).toBe(1);
  });
});
