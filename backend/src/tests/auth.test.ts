import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import pool from '../db/pool';
import { createTestUser, hashToken, insertRefreshToken } from './testHelpers';
import jwt from 'jsonwebtoken';

beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

describe('POST /auth/signup', () => {
  it('creates a user and returns a token', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
    expect(response.body.user.email).toEqual('new@example.com');
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    await request(app)
      .post('/auth/signup')
      .send({ email: 'new@example.com', password: 'password123' });
    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(response.status).toBe(409);
  });

  it('rejects a password under 8 characters', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'new@example.com', password: 'pass' });

    expect(response.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app)
      .post('/auth/signup')
      .send({ email: 'new@example.com', password: 'password123' });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
  });

  it('rejects an incorrect password with generic message', async () => {
    await request(app)
      .post('/auth/signup')
      .send({ email: 'new@example.com', password: 'password123' });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'new@example.com', password: 'password123456' });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual('Invalid email or password');
  });

  it('rejects a nonexistent email with identical message as wrong password', async () => {
    await request(app)
      .post('/auth/signup')
      .send({ email: 'new@example.com', password: 'password123' });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'password123456' });
    expect(response.status).toBe(401);
    expect(response.body.error).toEqual('Invalid email or password');
  });
});

describe('POST /auth/refresh', () => {
  it('issues new tokens and revokes the old refresh token', async () => {
    const { refreshToken } = await createTestUser();

    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
    expect(response.body.refreshToken).not.toEqual(refreshToken);

    const oldTokenHash = hashToken(refreshToken);
    const check = await pool.query(
      'SELECT revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [oldTokenHash]
    );
    expect(check.rows[0].revoked_at).not.toBeNull();
  });

  it('rejects a missing refresh token', async () => {
    const response = await request(app).post('/auth/logout').send({});
    expect(response.status).toBe(400);
  });
  it('rejects an expired refresh token', async () => {
    const { user } = await createTestUser();
    const expiredToken = await insertRefreshToken(user.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: expiredToken });
    expect(response.status).toBe(401);
  });

  it('rejects a nonexistent refresh token', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });
    expect(response.status).toBe(401);
  });

  it('rejects an already-revoked refresh token', async () => {
    const { refreshToken } = await createTestUser();
    await request(app).post('/auth/refresh').send({ refreshToken });

    const secondAttempt = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(secondAttempt.status).toBe(401);
  });

  it('rejects a missing refresh token', async () => {
    const response = await request(app).post('/auth/refresh').send({});
    expect(response.status).toBe(400);
  });

  it('does not let two concurrent requests to succeed with the same token', async () => {
    const { refreshToken } = await createTestUser();

    const [first, second] = await Promise.all([
      request(app).post('/auth/refresh').send({ refreshToken }),
      request(app).post('/auth/refresh').send({ refreshToken }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 401]);
  });

  it('revokes all other sessions when a revoked token is reused after the grace window', async () => {
    const { refreshToken: originalToken } = await createTestUser();

    const firstRefresh = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: originalToken });
    expect(firstRefresh.status).toBe(200);
    const currentToken = firstRefresh.body.refreshToken;

    const originalHash = hashToken(originalToken);
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() - interval '1 minute' WHERE token_hash = $1`,
      [originalHash]
    );

    const reuseAttempt = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: originalToken });
    expect(reuseAttempt.status).toBe(401);

    const currentHash = hashToken(currentToken);
    const check = await pool.query(
      'SELECT revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [currentHash]
    );
    expect(check.rows[0].revoked_at).not.toBeNull();
  });

  it('does not treat the losing side of a race as reuse', async () => {
    const { refreshToken } = await createTestUser();
    const [first, second] = await Promise.all([
      request(app).post('/auth/refresh').send({ refreshToken }),
      request(app).post('/auth/refresh').send({ refreshToken }),
    ]);

    const winner = [first, second].find((r) => r.status === 200);
    expect(winner).toBeDefined();

    const winnerHash = hashToken(winner!.body.refreshToken);
    const check = await pool.query(
      'SELECT revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [winnerHash]
    );
    expect(check.rows[0].revoked_at).toBeNull();
  });
  it('allows the new refresh token to be refreshed again, and the new access token to work on GET /tasks', async () => {
    const { refreshToken: firstToken } = await createTestUser();

    const secondRefresh = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: firstToken });
    expect(secondRefresh.status).toBe(200);
    const secondRefreshToken = secondRefresh.body.refreshToken;

    const thirdRefresh = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: secondRefreshToken });
    expect(thirdRefresh.status).toBe(200);
    expect(thirdRefresh.body.accessToken).toBeTruthy();
    expect(thirdRefresh.body.refreshToken).not.toEqual(secondRefreshToken);

    const tasksResponse = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${thirdRefresh.body.accessToken}`);

    expect(tasksResponse.status).toBe(200);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token', async () => {
    const { refreshToken } = await createTestUser();

    const response = await request(app)
      .post('/auth/logout')
      .send({ refreshToken });
    expect(response.status).toBe(204);

    const tokenHash = hashToken(refreshToken);
    const check = await pool.query(
      'SELECT revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    expect(check.rows[0].revoked_at).not.toBeNull();
  });
  it('succeeds even wtih an already-invalid token', async () => {
    const response = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'garbage-token' });
    expect(response.status).toBe(204);
  });

  it('rejects a refresh attempt after logout', async () => {
    const { refreshToken } = await createTestUser();
    await request(app).post('/auth/logout').send({ refreshToken });
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(response.status).toBe(401);
  });
});

describe('cross-user data isolation', () => {
  it("prevents one user from seeing another user's tasks", async () => {
    const { user: userA } = await createTestUser('hsy@example.com');
    const { accessToken: tokenB } = await createTestUser('kdj@example.com');

    await pool.query('INSERT INTO tasks (title, user_id) VALUES ($1, $2)', [
      "HSY's task",
      userA.id,
    ]);

    const response = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
  it("returns 404, not the task, when user tries to PATCH someone else's task", async () => {
    const { user: userA } = await createTestUser('hsy@example.com');
    const { accessToken: tokenB } = await createTestUser('kdj@example.com');

    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ["HSY's task", userA.id]
    );
    const taskId = taskResult.rows[0].id;

    const response = await request(app)
      .patch(`/tasks/${taskId}`)
      .send({ completed: true })
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
  });
  it("returns 404, not the task, when user tries to DELETE someone else's task", async () => {
    const { user: userA } = await createTestUser('hsy@example.com');
    const { accessToken: tokenB } = await createTestUser('kdj@example.com');

    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ["HSY's task", userA.id]
    );
    const taskId = taskResult.rows[0].id;

    const response = await request(app)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(response.status).toBe(404);

    const check = await pool.query('SELECT id FROM tasks WHERE id = $1', [
      taskId,
    ]);
    expect(check.rows.length).toBe(1);
  });
  it("returns 404, not the task, when user tries to PATCH a subtask on someone else's task", async () => {
    const { user: userA } = await createTestUser('hsy@example.com');
    const { accessToken: tokenB } = await createTestUser('kdj@example.com');

    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ["HSY's task", userA.id]
    );
    const subtaskResult = await pool.query(
      'INSERT INTO subtasks (task_id, title) VALUES ($1, $2) RETURNING *',
      [taskResult.rows[0].id, "HSY's subtask"]
    );
    const subtaskId = subtaskResult.rows[0].id;

    const response = await request(app)
      .patch(`/subtasks/${subtaskId}`)
      .send({ completed: true })
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
    const check = await pool.query(
      'SELECT completed FROM subtasks WHERE id = $1',
      [subtaskId]
    );
    expect(check.rows[0].completed).toBe(false);
  });
  it("returns 404, not the task, when user tries to DELETE a subtask on someone else's task", async () => {
    const { user: userA } = await createTestUser('hsy@example.com');
    const { accessToken: tokenB } = await createTestUser('kdj@example.com');

    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ["HSY's task", userA.id]
    );
    const subtaskResult = await pool.query(
      'INSERT INTO subtasks (task_id, title) VALUES ($1, $2) RETURNING *',
      [taskResult.rows[0].id, "HSY's subtask"]
    );
    const subtaskId = subtaskResult.rows[0].id;

    const response = await request(app)
      .delete(`/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
    const check = await pool.query('SELECT id FROM subtasks WHERE id = $1', [
      subtaskId,
    ]);
    expect(check.rows.length).toBe(1);
  });
});

describe('authenticate middleware', () => {
  it('rejects a request with no Authorization header', async () => {
    const response = await request(app).get('/tasks');
    expect(response.status).toBe(401);
  });
  it('rejects a header missing the Bearer prefix', async () => {
    const response = await request(app)
      .get('/tasks')
      .set('Authorization', 'not-a-bearer-token');
    expect(response.status).toBe(401);
  });
  it('rejects a malformed token', async () => {
    const response = await request(app)
      .get('/tasks')
      .set('Authorization', 'Bearer garbage.not.a.jwt');
    expect(response.status).toBe(401);
  });
  it('rejects an expired access token', async () => {
    const { user } = await createTestUser();
    const expiredAccessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '-10s' }
    );
    const response = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${expiredAccessToken}`);
    expect(response.status).toBe(401);
  });
  it('rejects a token signed with the wrong secret', async () => {
    const { user } = await createTestUser();
    const forgedToken = jwt.sign({ userId: user.id }, 'wrong-secret', {
      expiresIn: '15m',
    });

    const response = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${forgedToken}`);
    expect(response.status).toBe(401);
  });
});
