import { vi } from 'vitest';
import * as AuthContext from '../context/useAuth';
import { AccountMenu } from '../components/AccountMenu';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../context/useAuth');

describe('AccountMenu', () => {
  it('renders nothing when logged out', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the user email once opened', async () => {
    const user = userEvent.setup();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 1, email: 'HSY@example.com' },
      token: 'x',
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });
    render(<AccountMenu />);
    await user.click(screen.getByTitle('Account'));
    expect(screen.getByText('HSY@example.com')).toBeInTheDocument();
  });
  it('calls logout when clicked', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 1, email: 'HSY@example.com' },
      token: 'x',
      login: vi.fn(),
      signup: vi.fn(),
      logout,
    });
    render(<AccountMenu />);
    await user.click(screen.getByTitle('Account'));
    await user.click(screen.getByText('Log out'));
    expect(logout).toHaveBeenCalled();
  });
  it('closes when clicking outside the menu', async () => {
    const user = userEvent.setup();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 1, email: 'HSY@example.com' },
      token: 'x',
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <div>
        <AccountMenu />
        <div data-testid="outside">Elsewhere</div>
      </div>
    );
    await user.click(screen.getByTitle('Account'));
    expect(screen.getByText('HSY@example.com')).toBeInTheDocument();
    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByText('HSY@example.com')).not.toBeInTheDocument();
  });
});
