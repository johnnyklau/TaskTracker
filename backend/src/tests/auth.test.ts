import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import pool from '../db/pool';
import { createTestUser } from './testHelpers';

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
});
