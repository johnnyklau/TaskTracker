import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from './app';
import pool from './db/pool';

beforeEach(async () => {
  await pool.query('DELETE FROM tasks');
});

describe('GET /tasks', () => {
  it('returns an empty array', async () => {
    const response = await request(app).get('/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe('POST /tasks', () => {
  it('creates a task and returns it', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Test task' });
    expect(response.status).toBe(201);
    expect(response.body.title).toEqual('Test task');
    expect(response.body.subtasks).toEqual([]);
  });

  it('denies creating tasks with no title', async () => {
    const response = await request(app).post('/tasks').send({});
    expect(response.status).toBe(400);
  });

  it('denies creating tasks with a non-string title', async () => {
    const response = await request(app).post('/tasks').send({ title: 4 });
    expect(response.status).toBe(400);
  });

  it('denies creating tasks with a whitespace-only title', async () => {
    const response = await request(app).post('/tasks').send({ title: '   ' });
    expect(response.status).toBe(400);
  });

  it('denies creating tasks with a title over 100 characters', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'a'.repeat(101) });
    expect(response.status).toBe(400);
  });
});

describe('PATCH /tasks', () => {
  it('marks a created task as complete', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ completed: true });
    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
  });
  it('changes the title of an existing task', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: 'Task completed!' });
    expect(response.status).toBe(200);
    expect(response.body.title).toEqual('Task completed!');
  });
  it('changes the notes of an existing task', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ notes: 'Check whether task is completed or not' });
    expect(response.status).toBe(200);
    expect(response.body.notes).toEqual(
      'Check whether task is completed or not'
    );
  });
  it('changes the x/y of an existing task', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ x: 20, y: 20 });
    expect(response.status).toBe(200);
    expect(response.body.x).toEqual(20);
    expect(response.body.y).toEqual(20);
  });
  it('should fail if patching a non-existent task', async () => {
    const response = await request(app)
      .patch(`/tasks/999999999`)
      .send({ completed: true });
    expect(response.status).toBe(404);
  });
  it('should fail if no valid fields provided', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({});
    expect(response.status).toBe(400);
  });
  it('should fail if given alphabetical id', async () => {
    const invalidIDRes = await request(app).patch(`/tasks/abc`).send({});
    expect(invalidIDRes.status).toBe(400);
  });
  it('should fail if title is invalid type', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: null });
    expect(invalidTypingRes.status).toBe(400);
  });
  it('should fail if title is whitespace-only', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: '   ' });
    expect(response.status).toBe(400);
  });
  it('should fail if title is over 100 characters', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const response = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ title: 'a'.repeat(101) });
    expect(response.status).toBe(400);
  });
  it('should fail if completed is invalid type', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ completed: null });
    expect(invalidTypingRes.status).toBe(400);
  });
  it('should fail if notes is invalid type', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ notes: null });
    expect(invalidTypingRes.status).toBe(400);
  });
  it('should fail if x/y is invalid type', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to complete') RETURNING *"
    );
    const invalidTypingRes = await request(app)
      .patch(`/tasks/${insertResponse.rows[0].id}`)
      .send({ x: null, y: null });
    expect(invalidTypingRes.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task', async () => {
    const insertResponse = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Task to delete') RETURNING *"
    );
    const response = await request(app).delete(
      `/tasks/${insertResponse.rows[0].id}`
    );
    expect(response.status).toBe(204);
  });
  it('should fail if deleting a non-existent task', async () => {
    const missingRes = await request(app).delete(`/tasks/5`);
    expect(missingRes.status).toBe(404);
  });
  it('should fail if given alphabetical id', async () => {
    const invalidIDRes = await request(app).delete(`/tasks/abc`);
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
    const response = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{ invalid json');
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toMatch(/at\s.+\(.+:\d+:\d+\)/);
  });
});
