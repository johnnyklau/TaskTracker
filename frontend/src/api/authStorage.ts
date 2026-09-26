const AUTH_STORAGE_KEY = 'auth';

export type StoredAuth = {
  user: { id: number; email: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export function loadStoredAuth(): StoredAuth {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return { user: null, accessToken: null, refreshToken: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

export function saveStoredAuth(auth: {
  user: { id: number; email: string };
  accessToken: string;
  refreshToken: string;
}) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
