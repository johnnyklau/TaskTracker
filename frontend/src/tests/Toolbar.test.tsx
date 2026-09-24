import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Toolbar } from '../components/Toolbar';
import * as AuthContext from '../context/AuthContext';

vi.mock('../context/AuthContext');

describe('Toolbar + AccountMenu interaction', () => {
  it('closes the account menu when clicking a different toolbar button', async () => {
    const user = userEvent.setup();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 1, email: 'test@example.com' },
      token: 'fake-token',
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <Toolbar
        draft=""
        onDraftChange={vi.fn()}
        onAddTask={vi.fn()}
        searchOpen={false}
        onToggleSearch={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        onRecenter={vi.fn()}
        onFitAll={vi.fn()}
      />
    );

    await user.click(screen.getByTitle('Account'));
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    await user.click(screen.getByTitle('Search tasks'));

    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });
});
