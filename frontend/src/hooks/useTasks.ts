import { useCallback, useEffect, useRef } from 'react';
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
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
import { useAuth } from '../context/useAuth';

const tasksKey = ['tasks'] as const; // TODO: Query key factory??

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: tasksKey,
    queryFn: fetchTasks,
    enabled: !!user,
  });
}

export function useAddTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createTask(title),
    onMutate: async (title) => {
      // Negative sentinel: real ids are positive Postgres SERIALs, so this
      // can never collide with (or be mistaken for) a confirmed task's id.
      await queryClient.cancelQueries({ queryKey: tasksKey });
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

      queryClient.setQueryData<Task[]>(tasksKey, (old) => [
        optimisticTask,
        ...(old ?? []),
      ]);
      return { optimisticId };
    },
    onSuccess: (newTask, _title, context) => {
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => (t.id === context?.optimisticId ? newTask : t))
      );
    },
    onError: (_err, _title, context) => {
      if (!context) return;
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.filter((t) => t.id !== context.optimisticId)
      );
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
      await queryClient.cancelQueries({ queryKey: tasksKey });
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

      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...t.subtasks, optimisticSubtask] }
            : t
        )
      );
      return { optimisticId, taskId };
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
      if (!context) return;
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) =>
          t.id === context.taskId
            ? {
                ...t,
                subtasks: t.subtasks.filter(
                  (s) => s.id !== context.optimisticId
                ),
              }
            : t
        )
      );
    },
  });
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
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previousTask = queryClient
        .getQueryData<Task[]>(tasksKey)
        ?.find((t) => t.id === id);

      const previousFields = previousTask
        ? (Object.fromEntries(
            Object.keys(updates).map((k) => [
              k,
              previousTask[k as keyof typeof updates],
            ])
          ) as typeof updates)
        : undefined;

      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );

      return { previousFields };
    },
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
    onError: (_err, { id }, context) => {
      if (!context?.previousFields) return;
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...context.previousFields } : t))
      );
    },
  });
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
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previousSubtask = queryClient
        .getQueryData<Task[]>(tasksKey)
        ?.flatMap((t) => t.subtasks)
        .find((s) => s.id === id);

      const previousFields = previousSubtask
        ? (Object.fromEntries(
            Object.keys(updates).map((k) => [
              k,
              previousSubtask[k as keyof typeof updates],
            ])
          ) as typeof updates)
        : undefined;

      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }))
      );
      return { previousFields };
    },
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
    onError: (_err, { id }, context) => {
      if (context?.previousFields)
        queryClient.setQueryData<Task[]>(tasksKey, (old) =>
          old?.map((t) => ({
            ...t,
            subtasks: t.subtasks.map((s) =>
              s.id === id ? { ...s, ...context.previousFields } : s
            ),
          }))
        );
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previousTask = queryClient
        .getQueryData<Task[]>(tasksKey)
        ?.find((t) => t.id === id);
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.filter((t) => t.id !== id)
      );

      return { previousTask };
    },
    onError: (_err, _id, context) => {
      const previous = context?.previousTask;
      if (!previous) return;
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.some((t) => t.id === previous.id)
          ? old
          : [...(old ?? []), previous]
      );
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSubtask(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previousSubtask = queryClient
        .getQueryData<Task[]>(tasksKey)
        ?.flatMap((t) => t.subtasks)
        .find((s) => s.id === id);

      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: t.subtasks.filter((s) => s.id !== id),
        }))
      );

      return { previousSubtask };
    },
    onError: (_err, _id, context) => {
      const subtask = context?.previousSubtask;
      if (!subtask) return;
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) =>
          t.id === subtask.task_id
            ? {
                ...t,
                subtasks: t.subtasks.some((s) => s.id === subtask.id)
                  ? t.subtasks
                  : [...t.subtasks, subtask],
              }
            : t
        )
      );
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
