import { vi } from 'vitest';
import { fetchTasks } from '../api/tasks';
import { loadStoredAuth, saveStoredAuth } from '../api/authStorage';

describe('refreshAccessToken failure handling', () => {
  it('does not log out when refresh fails with a transient error, not a real 401', async () => {
    saveStoredAuth({
      user: { id: 1, email: 'test@example.com' },
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    });

    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: false,
          status: 503,
          json: async () => ({ error: 'Service unavailable' }),
        });
      }
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call to ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const expiredListener = vi.fn();
    window.addEventListener('auth:expired', expiredListener);

    await expect(fetchTasks()).rejects.toThrow();
    expect(expiredListener).not.toHaveBeenCalled();
    expect(loadStoredAuth().refreshToken).toBe('old-refresh-token');

    window.removeEventListener('auth:expired', expiredListener);
  });
});

describe('authFetch multi-tab recovery', () => {
  it("uses a sibling tab's already-rotated token instead of dispatching auth:expired", async () => {
    saveStoredAuth({
      user: { id: 1, email: 'test@example.com' },
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    });

    let tasksCallCount = 0;
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes('/auth/refresh')) {
        // Simulates a sibling tab winning the rotation race: by the time
        // our own refresh request comes back, storage already reflects
        // the SIBLING's new tokens, not the ones we're waiting on.
        saveStoredAuth({
          user: { id: 1, email: 'test@example.com' },
          accessToken: 'sibling-access-token',
          refreshToken: 'sibling-refresh-token',
        });
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Invalid refresh token' }),
        });
      }

      if (url.includes('/tasks')) {
        tasksCallCount++;
        const authHeader = (
          options?.headers as Record<string, string> | undefined
        )?.Authorization;
        if (tasksCallCount === 1) {
          expect(authHeader).toBe('Bearer old-access-token');
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: 'Unauthorized' }),
          });
        }
        expect(authHeader).toBe('Bearer sibling-access-token');
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      }

      return Promise.reject(new Error(`Unexpected fetch call to ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const expiredListener = vi.fn();
    window.addEventListener('auth:expired', expiredListener);

    const tasks = await fetchTasks();

    expect(tasks).toEqual([]);
    expect(expiredListener).not.toHaveBeenCalled();

    window.removeEventListener('auth:expired', expiredListener);
  });
});
