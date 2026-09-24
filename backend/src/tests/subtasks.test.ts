import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import pool from '../db/pool';
import { createTestUser } from './testHelpers';

beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

describe('GET /tasks with subtasks', () => {
  it('returns an empty array', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
  it('returns an task with a subtask', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const taskId = taskResult.rows[0].id;
    await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({ title: 'Test subtask' })
      .set('Authorization', `Bearer ${accessToken}`);
    const response = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body[0].subtasks.length).toBe(1);
    expect(response.body[0].subtasks[0].title).toEqual('Test subtask');
  });
});

describe('POST /tasks/:id/subtasks', () => {
  it('creates a subtask and returns it', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const taskId = taskResult.rows[0].id;

    const response = await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({ title: 'Test subtask' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.title).toEqual('Test subtask');
    expect(response.body.task_id).toEqual(taskId);
  });
  it('creates a subtask at a given dx/dy instead of the schema default', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const taskId = taskResult.rows[0].id;

    const response = await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({ title: 'Positioned subtask', dx: 300, dy: 40 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.dx).toEqual(300);
    expect(response.body.dy).toEqual(40);
  });
  it('fails to create subtask with invalid dx/dy type', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const taskId = taskResult.rows[0].id;

    const invalidDxRes = await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({ title: 'Bad dx', dx: 'far', dy: 0 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidDxRes.status).toBe(400);

    const invalidDyRes = await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({ title: 'Bad dy', dx: 0, dy: 'far' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidDyRes.status).toBe(400);
  });
  it('fails to create subtask with invalid task id', async () => {
    const { accessToken } = await createTestUser();
    const invalidIDres = await request(app)
      .post(`/tasks/${-1}/subtasks`)
      .send({ title: 'Invalid ID' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidIDres.status).toBe(400);
  });
  it('fails to create subtask with invalid title type', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const taskId = taskResult.rows[0].id;
    const invalidTitleRes = await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({ title: 4 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidTitleRes.status).toBe(400);
  });
  it('fails to create subtask with no title', async () => {
    const { accessToken } = await createTestUser();
    const taskResult = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Parent task') RETURNING *"
    );
    const taskId = taskResult.rows[0].id;
    const response = await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({})
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('fails to create subtask with a title over 100 characters', async () => {
    const { accessToken } = await createTestUser();
    const taskResult = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Parent task') RETURNING *"
    );
    const taskId = taskResult.rows[0].id;
    const response = await request(app)
      .post(`/tasks/${taskId}/subtasks`)
      .send({ title: 'a'.repeat(101) })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('fails to create subtask for a non-existent task', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .post(`/tasks/999999999/subtasks`)
      .send({ title: 'Orphan subtask' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(404);
  });
});

describe('PATCH /subtasks/:id', () => {
  it('marks a created subtask as complete', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .patch(`/subtasks/${subtaskResult.rows[0].id}`)
      .send({ completed: true })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
  });
  it('changes the title of an existing subtask', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .patch(`/subtasks/${subtaskResult.rows[0].id}`)
      .send({ title: 'Renamed subtask' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.title).toEqual('Renamed subtask');
  });
  it('changes the dx/dy of an existing subtask', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .patch(`/subtasks/${subtaskResult.rows[0].id}`)
      .send({ dx: 20, dy: 20 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.dx).toEqual(20);
    expect(response.body.dy).toEqual(20);
  });
  it('should fail if patching a non-existent subtask', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .patch(`/subtasks/999999999`)
      .send({ completed: true })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(404);
  });
  it('should fail if no valid fields provided', async () => {
    const { accessToken } = await createTestUser();
    const taskResult = await pool.query(
      "INSERT INTO tasks (title) VALUES ('Parent task') RETURNING *"
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .patch(`/subtasks/${subtaskResult.rows[0].id}`)
      .send({})
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('should fail if given alphabetical id', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .patch(`/subtasks/abc`)
      .send({})
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('should fail if title is invalid type', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .patch(`/subtasks/${subtaskResult.rows[0].id}`)
      .send({ title: null })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('should fail if completed is invalid type', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .patch(`/subtasks/${subtaskResult.rows[0].id}`)
      .send({ completed: null })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
  it('should fail if dx/dy is invalid type', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .patch(`/subtasks/${subtaskResult.rows[0].id}`)
      .send({ dx: null, dy: null })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
});

describe('DELETE /subtasks/:id', () => {
  it('deletes a subtask', async () => {
    const { user, accessToken } = await createTestUser();
    const taskResult = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      ['Parent Task', user.id]
    );
    const subtaskResult = await pool.query(
      "INSERT INTO subtasks (task_id, title) VALUES ($1, 'Subtask') RETURNING *",
      [taskResult.rows[0].id]
    );
    const response = await request(app)
      .delete(`/subtasks/${subtaskResult.rows[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(204);
  });
  it('should fail if deleting a non-existent subtask', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .delete(`/subtasks/999999999`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(404);
  });
  it('should fail if given alphabetical id', async () => {
    const { accessToken } = await createTestUser();
    const response = await request(app)
      .delete(`/subtasks/abc`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });
});
