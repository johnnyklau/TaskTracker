import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import pool from '../db/pool';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createTestUser } from './testHelpers';

beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

describe('GET /tasks', () => {
  it('returns an empty array when there are no tasks', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe('POST /tasks', () => {
  it('creates a task and returns it', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Test task' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(201);
    expect(response.body.title).toEqual('Test task');
    expect(response.body.subtasks).toEqual([]);
  });

  it('denies creating tasks with no title', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .post('/tasks')
      .send({})
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });

  it('denies creating tasks with a non-string title', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .post('/tasks')
      .send({ title: 4 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });

  it('denies creating tasks with a whitespace-only title', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .post('/tasks')
      .send({ title: '   ' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });

  it('denies creating tasks with a title over 100 characters', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'a'.repeat(101) })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
});

describe('PATCH /tasks', () => {
  it('marks a created task as complete', async () => {
    const { user, accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Task to complete', user.id]
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ completed: true })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
  });
  it('changes the title of an existing task', async () => {
    const { user, accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Task to complete', user.id]
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: 'Task completed!' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.title).toEqual('Task completed!');
  });
  it('changes the notes of an existing task', async () => {
    const { user, accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Task to complete', user.id]
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ notes: 'Check whether task is completed or not' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.notes).toEqual(
      'Check whether task is completed or not'
    );
  });
  it('changes the x/y of an existing task', async () => {
    const { user, accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Task to complete', user.id]
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ x: 20, y: 20 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.x).toEqual(20);
    expect(response.body.y).toEqual(20);
  });
  it('should fail if patching a non-existent task', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .patch(`/tasks/999999999`)
      .send({ completed: true })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(404);
  });
  it('should fail if no valid fields provided', async () => {
    const { accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({})
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('should fail if given alphabetical id', async () => {
    const { accessToken } = await createTestUser();
    const invalidIDRes = await request(app)
      .patch(`/tasks/abc`)
      .send({})
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidIDRes.status).toBe(400);
  });
  it('should fail if title is invalid type', async () => {
    const { accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: null })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidTypingRes.status).toBe(400);
  });
  it('should fail if title is whitespace-only', async () => {
    const { accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: '   ' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('should fail if title is over 100 characters', async () => {
    const { accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: 'a'.repeat(101) })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('should fail if completed is invalid type', async () => {
    const { accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ completed: null })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidTypingRes.status).toBe(400);
  });
  it('should fail if notes is invalid type', async () => {
    const { accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ notes: null })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidTypingRes.status).toBe(400);
  });
  it('should fail if x/y is invalid type', async () => {
    const { accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ x: null, y: null })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidTypingRes.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task', async () => {
    const { user, accessToken } = await createTestUser();
    const insertResponse = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Task to delete', user.id]
    );
    const response = await request(app)
      .delete(`/tasks/${insertResponse.rows[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(204);
  });
  it('should fail if deleting a non-existent task', async () => {
    const { accessToken } = await createTestUser();
    const missingRes = await request(app)
      .delete(`/tasks/5`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(missingRes.status).toBe(404);
  });
  it('should fail if given alphabetical id', async () => {
    const { accessToken } = await createTestUser();
    const invalidIDRes = await request(app)
      .delete(`/tasks/abc`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidIDRes.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns ok status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('malformed request body', () => {
  it('returns 400 without leaking a stack trace on invalid JSON', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .send('{ invalid json');
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toMatch(/at\s.+\(.+:\d+:\d+\)/);
  });
});
