import { API_URL } from './tasks';

export type User = {
  id: number;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const u = value as Record<string, unknown>;
  return typeof u.id === 'number' && typeof u.email === 'string';
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.accessToken === 'string' &&
    typeof r.refreshToken === 'string' &&
    isUser(r.user)
  );
}

function assertAuthResponse(value: unknown): AuthResponse {
  if (!isAuthResponse(value)) {
    throw new Error('Malformed auth response from server');
  }
  return value;
}

async function parseErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

export async function signup(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, `Signup failed: ${response.status}`)
    );
  }
  return assertAuthResponse(await response.json());
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, `Login failed: ${response.status}`)
    );
  }
  return assertAuthResponse(await response.json());
}
