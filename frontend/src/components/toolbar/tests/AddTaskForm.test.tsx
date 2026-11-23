import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AddTaskForm } from '../AddTaskForm';

vi.mock('../context/useAuth');

describe('AddTaskForm functionality', () => {
  it('adds a new task with both trimmed & untrimmed text', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(<AddTaskForm onAddTask={onAddTask} />);

    const input = screen.getByRole('textbox', { name: 'New task' });
    await user.type(input, 'Setting practice{enter}');
    expect(onAddTask).toHaveBeenCalled();
    expect(onAddTask).toHaveBeenCalledWith('Setting practice');
    expect(input).toHaveValue('');

    await user.type(input, '   Bumping practice  ');
    const addButton = screen.getByTitle('Add task');
    await user.click(addButton);
    expect(onAddTask).toHaveBeenCalled();
    expect(onAddTask).toHaveBeenCalledWith('Bumping practice');
  });
  it('rejects empty/whitespace inputs', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(<AddTaskForm onAddTask={onAddTask} />);

    const input = screen.getByRole('textbox', { name: 'New task' });
    await user.type(input, '{enter}');
    expect(onAddTask).not.toHaveBeenCalled();
    expect(input).toHaveValue('');

    await user.type(input, '      ');
    const addButton = screen.getByTitle('Add task');
    await user.click(addButton);
    expect(onAddTask).not.toHaveBeenCalled();
  });
});
