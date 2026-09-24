import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AuthForm } from '../components/AuthForm';
import * as AuthContext from '../context/useAuth';

vi.mock('../context/useAuth');

describe('AuthForm', () => {
  it('calls login with the entered credentials by default', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login,
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(<AuthForm />);
    await user.type(screen.getByPlaceholderText('Email'), 'HSY@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByText('Log in'));

    expect(login).toHaveBeenCalledWith('HSY@example.com', 'password123');
  });
  it('switches to signup mode and calls signup instead', async () => {
    const user = userEvent.setup();
    const signup = vi.fn().mockResolvedValue(undefined);
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      signup,
      logout: vi.fn(),
    });

    render(<AuthForm />);
    await user.click(screen.getByText("Don't have an account? Sign up"));
    await user.type(screen.getByPlaceholderText('Email'), 'HSY@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByText('Sign up'));

    expect(signup).toHaveBeenCalledWith('HSY@example.com', 'password123');
  });
  it('shows the real error message when login fails', async () => {
    const user = userEvent.setup();
    const login = vi
      .fn()
      .mockRejectedValue(new Error('Invalid email or password'));
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login,
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(<AuthForm />);
    await user.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
    await user.click(screen.getByText('Log in'));

    expect(
      await screen.findByText('Invalid email or password')
    ).toBeInTheDocument();
  });
  it('disables the button while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void = () => {};
    const login = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login,
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(<AuthForm />);
    await user.type(screen.getByPlaceholderText('Email'), 'HSY@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByText('Log in'));

    expect(screen.getByText('Please wait…')).toBeDisabled();
    resolveLogin();
  });
});
