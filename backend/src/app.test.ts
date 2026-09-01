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
  });

  it('denies creating tasks with no title', async () => {
    const response = await request(app).post('/tasks').send({});
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
  it('should fail if patching a non-existant task', async () => {
    const response = await request(app).patch(`/tasks/5`).send({});
    expect(response.status).toBe(404);
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
  it('should fail if deleting a non-existant task', async () => {
    const response = await request(app).delete(`/tasks/5`);
    expect(response.status).toBe(404);
  });
});
