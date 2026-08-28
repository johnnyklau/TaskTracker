import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { vi } from 'vitest';
import * as api from './api/tasks';

vi.mock('./api/tasks');

describe('App', () => {
  it('renders tasks returned from API', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue([
      {id: 1, title: 'Buy milk', completed: false, created_at: '2026-01-01'},
    ]);
    render(<App />);
    expect(await screen.findByText('Buy milk')).toBeInTheDocument();
  })

  it('adds a new task on form submission', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchTasks).mockResolvedValue([]);
    vi.mocked(api.createTask).mockResolvedValue({
      id: 2, title: "Walk the cat", completed: false, created_at: '2026-01-02',
    });

    render(<App />);
    const input = await screen.findByPlaceholderText('Add a task');
    await user.type(input, "Walk the cat");
    await user.click(screen.getByText('Add'));

    expect(await screen.findByText("Walk the cat")).toBeInTheDocument();
  })

  it('toggles a task completed', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchTasks).mockResolvedValue([{
      id: 3, title: "Pet the cat", completed: false, created_at: '2026-02-03'
    }])
    vi.mocked(api.updateTaskCompleted).mockResolvedValue({
      id: 3, title: "Pet the cat", completed: true, created_at: '2026-02-03'
    });

    render(<App/>);
    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);
    
    expect(api.updateTaskCompleted).toHaveBeenCalledWith(3, true);
  })

  it('removes a task when deleted', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchTasks).mockResolvedValue([{
      id: 4, title: "Feed the cat", completed: true, created_at: '2026-02-03'
    }])
    vi.mocked(api.deleteTask).mockResolvedValue(undefined);
    render(<App />);
    await screen.findByText('Feed the cat');
    await user.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(screen.queryByText('Feed the cat')).not.toBeInTheDocument();
    })
  })
})