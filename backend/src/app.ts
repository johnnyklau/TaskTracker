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
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );

    res.status(200).json(result.rows);
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
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  if (!(typeof completed === 'boolean')) {
    return res
      .status(400)
      .json({ error: 'Completed must be BOOLEAN NOT NULL' });
  }

  try {
    const result = await pool.query(
      'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *',
      [completed, id]
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
