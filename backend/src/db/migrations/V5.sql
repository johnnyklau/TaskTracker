ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_list_check;


ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_list TEXT NOT NULL DEFAULT 'saved',
  ADD COLUMN IF NOT EXISTS priority INTEGER,
  ADD CONSTRAINT tasks_task_list_check CHECK (task_list IN ('saved', 'priority'));