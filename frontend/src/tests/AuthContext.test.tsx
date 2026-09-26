import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import type { ReactNode } from 'react';
import { clearStoredAuth, saveStoredAuth } from '../api/authStorage';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../context/useAuth';
import { fetchTasks } from '../api/tasks';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthContext logout', () => {
  afterEach(() => {
    clearStoredAuth();
    vi.unstubAllGlobals();
  });

  it('sends the token authFetch actually refreshed, not the one from initial render', async () => {
    saveStoredAuth({
      user: { id: 1, email: 'HSY@example.com' },
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.refreshToken).toBe('old-refresh-token');

    let tasksCallCount = 0;
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          }),
        });
      }
      if (url.includes('/tasks')) {
        tasksCallCount++;
        if (tasksCallCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: 'Unauthorized' }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      }
      if (url.includes('/auth/logout')) {
        return Promise.resolve({ ok: true, status: 204 });
      }
      return Promise.reject(new Error(`Unexpected fetch call to ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchTasks();

    expect(result.current.refreshToken).toBe('old-refresh-token');

    await result.current.logout();

    const logoutCall = fetchMock.mock.calls.find(([url]) =>
      (url as string).includes('/auth/logout')
    );
    expect(logoutCall).toBeDefined();
    expect(logoutCall?.[1]?.body).toEqual(
      JSON.stringify({ refreshToken: 'new-refresh-token' })
    );
  });

  it('sends the current, rotated refresh token - not a stale one from initial state', async () => {
    saveStoredAuth({
      user: { id: 1, email: 'HSY@example.com' },
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.refreshToken).toBe('old-refresh-token');

    saveStoredAuth({
      user: { id: 1, email: 'HSY@example.com' },
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(result.current.refreshToken).toBe('old-refresh-token');

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await result.current.logout();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: 'new-refresh-token' }),
      })
    );
  });
});
