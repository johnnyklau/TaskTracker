import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type Updater,
} from '@tanstack/react-query';
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTaskCompleted,
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

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateTaskCompleted(id, completed),
    onMutate: async ({ id, completed }) =>
      applyOptimisticTasksUpdate(queryClient, (old) =>
        old?.map((t) => (t.id === id ? { ...t, completed } : t))
      ),
    onError: (_err, _title, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
      else queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });
}

export function useAddTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createTask(title),
    onMutate: (title) => {
      const optimisticTask: Task = {
        id: -Date.now(),
        title,
        completed: false,
        created_at: new Date().toISOString(),
      };
      return applyOptimisticTasksUpdate(queryClient, (old) => [
        optimisticTask,
        ...(old ?? []),
      ]).then((ctx) => ({ ...ctx, tempId: optimisticTask.id }));
    },
    onSuccess: (newTask, _title, context) => {
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => (t.id === context?.tempId ? newTask : t))
      );
    },
    onError: (_err, _title, context) => {
      if (context?.previousTasks)
        queryClient.setQueryData(tasksKey, context.previousTasks);
      else queryClient.invalidateQueries({ queryKey: tasksKey });
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
