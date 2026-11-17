import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../app';
import { parseAllowedOrigins } from '../config/origins';

describe('CORS allowed origins check', () => {
  it('returns 403, not 500, for a disallowed CORS origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://not-allowed.example.com');
    expect(response.status).toBe(403);
  });
  it('rejects a request from an unrelated vercel.app subdomain', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://some-other-random-project.vercel.app');
    expect(response.status).toBe(403);
  });
  it('allows a request from an allowed origin', async () => {
    const [origin] = parseAllowedOrigins(process.env.ALLOWED_ORIGINS, false);

    const response = await request(app).get('/health').set('Origin', origin);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
  });
  it('answers a preflight from an allowed origin', async () => {
    const origin = process.env.ALLOWED_ORIGINS!;
    const response = await request(app)
      .options('/tasks/1')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
  });
});
