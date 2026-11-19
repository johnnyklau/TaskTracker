// `erasableSyntaxOnly` rules out TS `enum`, so enum-like values are a const
// object plus a same-named union type: `TaskList.Priority` at runtime,
// `TaskList` ('saved' | 'priority') as a type.

export const TaskList = {
  Saved: 'saved',
  Priority: 'priority',
} as const;
export type TaskList = (typeof TaskList)[keyof typeof TaskList];

export const ViewMode = {
  Cloud: 'cloud',
  List: 'list',
} as const;
export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode];

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
  task_list: TaskList;
  // Position within the priority list; null while the task is saved.
  priority: number | null;
};
