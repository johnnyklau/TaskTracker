import { useCallback, useEffect, useRef } from 'react';
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type Updater,
} from '@tanstack/react-query';
import {
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  fetchTasks,
  updateSubtask,
  updateTask,
  type Subtask,
  type Task,
} from '../api/tasks';

const tasksKey = ['tasks'] as const; // TODO: Query key factory??

export function useTasks() {
  return useQuery({
    queryKey: tasksKey,
    queryFn: fetchTasks,
  });
}

async function applyOptimisticTasksUpdate(
  queryClient: QueryClient,
  updater: Updater<Task[] | undefined, Task[] | undefined>
) {
  await queryClient.cancelQueries({ queryKey: tasksKey });
  const previousTasks = queryClient.getQueryData<Task[]>(tasksKey);
  queryClient.setQueryData<Task[]>(tasksKey, updater);
  return { previousTasks };
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<Pick<Task, 'title' | 'notes' | 'x' | 'y' | 'completed'>>;
    }) => updateTask(id, updates),
    onMutate: ({ id, updates }) =>
      applyOptimisticTasksUpdate(queryClient, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } : t))
      ),
    onSuccess: (updatedTask) => {
      // PATCH /tasks/:id doesn't return `subtasks` (only GET and POST do) —
      // merge onto the cached task rather than replacing it wholesale, or
      // this drops subtasks and crashes anything that reads them.
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) =>
          t.id === updatedTask.id
            ? { ...t, ...updatedTask, subtasks: t.subtasks }
            : t
        )
      );
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
    },
  });
}

const MOVE_DEBOUNCE_MS = 400;

function useDebouncedPositionUpdate<TArgs extends { id: number }>({
  mutationFn,
  applyOptimistic,
}: {
  mutationFn: (args: TArgs) => Promise<unknown>;
  applyOptimistic: (queryClient: QueryClient, args: TArgs) => void;
}) {
  const queryClient = useQueryClient();
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const { mutate } = useMutation({
    mutationFn,
    onError: () => {
      queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      pendingTimers.forEach((timer) => clearTimeout(timer));
      pendingTimers.clear();
    };
  }, []);

  return useCallback(
    (args: TArgs) => {
      applyOptimistic(queryClient, args);

      const pending = timers.current.get(args.id);
      if (pending) clearTimeout(pending);

      timers.current.set(
        args.id,
        setTimeout(() => {
          timers.current.delete(args.id);
          mutate(args);
        }, MOVE_DEBOUNCE_MS)
      );
    },
    [queryClient, mutate, applyOptimistic]
  );
}

export function useMoveTask() {
  const move = useDebouncedPositionUpdate<{ id: number; x: number; y: number }>(
    {
      mutationFn: ({ id, x, y }) => updateTask(id, { x, y }),
      applyOptimistic: (queryClient, { id, x, y }) =>
        queryClient.setQueryData<Task[]>(tasksKey, (old) =>
          old?.map((t) => (t.id === id ? { ...t, x, y } : t))
        ),
    }
  );

  return useCallback(
    (id: number, x: number, y: number) => move({ id, x, y }),
    [move]
  );
}

export function useMoveSubtask() {
  const move = useDebouncedPositionUpdate<{
    id: number;
    dx: number;
    dy: number;
  }>({
    mutationFn: ({ id, dx, dy }) => updateSubtask(id, { dx, dy }),
    applyOptimistic: (queryClient, { id, dx, dy }) =>
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) => (s.id === id ? { ...s, dx, dy } : s)),
        }))
      ),
  });

  return useCallback(
    (id: number, dx: number, dy: number) => move({ id, dx, dy }),
    [move]
  );
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<Pick<Subtask, 'title' | 'dx' | 'dy' | 'completed'>>;
    }) => updateSubtask(id, updates),
    onMutate: async ({ id, updates }) =>
      applyOptimisticTasksUpdate(queryClient, (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }))
      ),
    onSuccess: (updatedSubtask) => {
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === updatedSubtask.id ? updatedSubtask : s
          ),
        }))
      );
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
    },
  });
}

export function useAddTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createTask(title),
    onMutate: async (title) => {
      // Negative sentinel: real ids are positive Postgres SERIALs, so this
      // can never collide with (or be mistaken for) a confirmed task's id.
      const optimisticId = -Date.now();
      const optimisticTask: Task = {
        id: optimisticId,
        title,
        completed: false,
        created_at: new Date().toISOString(),
        notes: '',
        x: null,
        y: null,
        subtasks: [],
      };
      const result = await applyOptimisticTasksUpdate(queryClient, (old) => [
        optimisticTask,
        ...(old ?? []),
      ]);
      return { ...result, optimisticId };
    },
    onSuccess: (newTask, _title, context) => {
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => (t.id === context?.optimisticId ? newTask : t))
      );
    },
    onError: (_err, _title, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
    },
  });
}

export function useAddSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      title,
      position,
    }: {
      taskId: number;
      title: string;
      position?: { dx: number; dy: number };
    }) => createSubtask(taskId, title, position),
    onMutate: async ({ taskId, title, position }) => {
      // Same negative-sentinel convention as useAddTask's optimistic id.
      const optimisticId = -Date.now();
      const optimisticSubtask: Subtask = {
        id: optimisticId,
        task_id: taskId,
        title,
        completed: false,
        dx: position?.dx ?? 180,
        dy: position?.dy ?? -140,
        created_at: new Date().toISOString(),
      };
      const result = await applyOptimisticTasksUpdate(queryClient, (old) =>
        old?.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...t.subtasks, optimisticSubtask] }
            : t
        )
      );
      return { ...result, optimisticId, taskId };
    },
    onSuccess: (newSubtask, _variables, context) => {
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) =>
          t.id === context?.taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) =>
                  s.id === context.optimisticId ? newSubtask : s
                ),
              }
            : t
        )
      );
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onMutate: async (id: number) =>
      applyOptimisticTasksUpdate(queryClient, (old) =>
        old?.filter((t) => t.id !== id)
      ),
    onError: (_err, _title, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
      else queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSubtask(id),
    onMutate: async (id: number) =>
      applyOptimisticTasksUpdate(queryClient, (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: t.subtasks.filter((s) => s.id !== id),
        }))
      ),
    onError: (_err, _title, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
      else queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });
}
