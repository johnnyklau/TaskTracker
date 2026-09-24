import express from 'express';
import type { Request, Response } from 'express';
import 'dotenv/config';
import cors from 'cors';
import pool from './db/pool';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate } from './middleware/authenticate';
import crypto from 'crypto';

const app = express();
app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:5174',
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

function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(userId: number) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  });
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, refreshTokenHash, expiresAt]
  );

  return { accessToken, refreshToken };
}

app.get('/health', async (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// TODO: No pagination , currently just a full bulk get.
app.get('/tasks', authenticate, async (req, res) => {
  try {
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    const subtasksResult = await pool.query(
      'SELECT subtasks.* FROM subtasks JOIN tasks ON subtasks.task_id = tasks.id WHERE tasks.user_id = $1',
      [req.userId]
    );

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

app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase().trim(), passwordHash]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = await issueTokens(user.id);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = await issueTokens(user.id);

    res.status(200).json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.post('/auth/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const tokenHash = hashToken(refreshToken);

  try {
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at is NULL',
      [tokenHash]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const tokenHash = hashToken(refreshToken);

  try {
    const result = await pool.query(
      'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const stored = result.rows[0];

    if (
      stored.revoked_at !== null ||
      new Date(stored.expires_at) < new Date()
    ) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [stored.id]
    );

    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(
      stored.user_id
    );
    res.status(200).json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

app.post('/tasks', authenticate, async (req, res) => {
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
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      [trimmedTitle, req.userId]
    );
    res.status(201).json({ ...result.rows[0], subtasks: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.post(
  '/tasks/:id/subtasks',
  authenticate,
  async (req: Request<{ id: string }>, res: Response) => {
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
      const taskCheck = await pool.query(
        'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
        [id, req.userId]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
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
  }
);

app.patch(
  '/tasks/:id',
  authenticate,
  async (req: Request<{ id: string }>, res: Response) => {
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

    values.push(id, req.userId);

    try {
      const result = await pool.query(
        `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
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
  }
);

app.patch(
  '/subtasks/:id',
  authenticate,
  async (req: Request<{ id: string }>, res: Response) => {
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

    values.push(id, req.userId);

    try {
      const result = await pool.query(
        `UPDATE subtasks SET ${fields.join(', ')} FROM tasks WHERE subtasks.id = $${paramIndex} AND subtasks.task_id = tasks.id AND tasks.user_id = $${paramIndex + 1} RETURNING subtasks.*`,
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
  }
);

app.delete(
  '/tasks/:id',
  authenticate,
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    try {
      const result = await pool.query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
        [id, req.userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
);

app.delete(
  '/subtasks/:id',
  authenticate,
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({ error: 'Invalid subtask ID' });
    }

    try {
      const result = await pool.query(
        'DELETE FROM subtasks USING tasks WHERE subtasks.id = $1 AND subtasks.task_id = tasks.id AND tasks.user_id = $2',
        [id, req.userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Subtask not found' });
      }

      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete subtask' });
    }
  }
);

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
