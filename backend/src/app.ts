import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import pool from './db/pool';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:5173',
        'https://tasktracker-hsy.vercel.app/',
      ];
      if (
        !origin ||
        allowed.includes(origin) ||
        /\.vercel\.app$/.test(origin) //TODO: Overly permissive
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

app.get('/health', async (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// TODO: No pagination , currently just a full bulk get.
app.get('/tasks', async (req, res) => {
  try {
    const tasksResult = await pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
    const subtasksResult = await pool.query('SELECT * FROM subtasks');

    const subtasksByTaskId = new Map<number, typeof subtasksResult.rows>();
    for (const subtask of subtasksResult.rows) {
      const existing = subtasksByTaskId.get(subtask.task_id) ?? [];
      existing.push(subtask);
      subtasksByTaskId.set(subtask.task_id, existing);
    }

    const tasksWithSubtasks = tasksResult.rows.map((task) => ({
      ...task,
      subtasks: subtasksByTaskId.get(task.id) ?? [],
    }));

    res.status(200).json(tasksWithSubtasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (typeof title !== 'string') {
    return res.status(400).json({ error: 'Title must be a string' });
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  if (trimmedTitle.length > 100) {
    return res
      .status(400)
      .json({ error: 'Title must be 100 characters or less' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      [trimmedTitle]
    );
    res.status(201).json({ ...result.rows[0], subtasks: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.post('/tasks/:id/subtasks', async (req, res) => {
  const { id } = req.params;
  const { title, dx, dy } = req.body;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  if (!title || typeof title !== 'string' || title.length > 100) {
    return res
      .status(400)
      .json({ error: 'Title is required and must be under 100 characters' });
  }

  if (dx !== undefined && (typeof dx !== 'number' || Number.isNaN(dx))) {
    return res.status(400).json({ error: 'dx must be a number' });
  }

  if (dy !== undefined && (typeof dy !== 'number' || Number.isNaN(dy))) {
    return res.status(400).json({ error: 'dy must be a number' });
  }

  try {
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [
      id,
    ]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // dx/dy are optional — omitting them falls back to the schema's default
    // offset (used when the client has no better placement in mind).
    const result =
      dx !== undefined && dy !== undefined
        ? await pool.query(
            'INSERT INTO subtasks (task_id, title, dx, dy) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, title, dx, dy]
          )
        : await pool.query(
            'INSERT INTO subtasks (task_id, title) VALUES ($1, $2) RETURNING *',
            [id, title]
          );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create subtask' });
  }
});

app.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (req.body.completed !== undefined) {
    if (typeof req.body.completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be a boolean' });
    }
    fields.push(`completed = $${paramIndex++}`);
    values.push(req.body.completed);
  }

  if (req.body.title !== undefined) {
    if (typeof req.body.title !== 'string') {
      return res.status(400).json({ error: 'title must be a string' });
    }
    const trimmedTitle = req.body.title.trim();

    if (trimmedTitle.length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (trimmedTitle.length > 100) {
      return res
        .status(400)
        .json({ error: 'Title must be 100 characters or less' });
    }

    fields.push(`title = $${paramIndex++}`);
    values.push(trimmedTitle);
  }

  if (req.body.notes !== undefined) {
    if (typeof req.body.notes !== 'string') {
      return res.status(400).json({ error: 'notes must be a string' });
    }
    fields.push(`notes = $${paramIndex++}`);
    values.push(req.body.notes);
  }

  if (req.body.x !== undefined) {
    if (typeof req.body.x !== 'number' || Number.isNaN(req.body.x)) {
      return res.status(400).json({ error: 'x must be a number' });
    }
    fields.push(`x = $${paramIndex++}`);
    values.push(req.body.x);
  }

  if (req.body.y !== undefined) {
    if (typeof req.body.y !== 'number' || Number.isNaN(req.body.y)) {
      return res.status(400).json({ error: 'y must be a number' });
    }
    fields.push(`y = $${paramIndex++}`);
    values.push(req.body.y);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.patch('/subtasks/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'Invalid subtask ID' });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (req.body.completed !== undefined) {
    if (typeof req.body.completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be a boolean' });
    }
    fields.push(`completed = $${paramIndex++}`);
    values.push(req.body.completed);
  }

  if (req.body.title !== undefined) {
    if (typeof req.body.title !== 'string') {
      return res.status(400).json({ error: 'title must be a string' });
    }
    const trimmedTitle = req.body.title.trim();
    if (trimmedTitle.length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    if (trimmedTitle.length > 100) {
      return res
        .status(400)
        .json({ error: 'Title must be 100 characters or less' });
    }
    fields.push(`title = $${paramIndex++}`);
    values.push(trimmedTitle);
  }

  if (req.body.dx !== undefined) {
    if (typeof req.body.dx !== 'number' || Number.isNaN(req.body.dx)) {
      return res.status(400).json({ error: 'dx must be a number' });
    }
    fields.push(`dx = $${paramIndex++}`);
    values.push(req.body.dx);
  }

  if (req.body.dy !== undefined) {
    if (typeof req.body.dy !== 'number' || Number.isNaN(req.body.dy)) {
      return res.status(400).json({ error: 'dy must be a number' });
    }
    fields.push(`dy = $${paramIndex++}`);
    values.push(req.body.dy);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE subtasks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.delete('/subtasks/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'Invalid subtask ID' });
  }

  try {
    const result = await pool.query('DELETE FROM subtasks WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(400).json({ error: 'Invalid request' });
  }
);

export default app;
