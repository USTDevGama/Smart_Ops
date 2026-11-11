import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

async function signIn(role: 'Trainee' | 'Admin', name = 'anna') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Your name'), name);
  await user.selectOptions(screen.getByLabelText('Role'), role);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => {
  // Agent 3 talks to the API; in tests there is none.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});

describe('login and routing', () => {
  it('sends a signed-out visitor to the login page', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('keeps the Zitadel button disabled', () => {
    renderAt('/login');
    expect(screen.getByRole('button', { name: 'Sign in with Zitadel' })).toBeDisabled();
  });

  it('requires a name', async () => {
    renderAt('/login');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your name.')).toBeInTheDocument();
  });

  it('shows the four agents after login', async () => {
    renderAt('/login');
    await signIn('Trainee');
    expect(await screen.findByRole('heading', { name: 'Choose an agent' })).toBeInTheDocument();
    for (const name of ['Agent 1', 'Agent 2', 'Stakeholder Roleplay', 'Agent 4']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('opens an agent from its card', async () => {
    renderAt('/login');
    await signIn('Trainee');
    await userEvent.click(await screen.findByRole('button', { name: /Agent 1/ }));
    expect(await screen.findByRole('heading', { name: 'Agent 1' })).toBeInTheDocument();
  });
});

describe('role separation in agent 3', () => {
  it('shows trainee pages only to a trainee', async () => {
    renderAt('/login');
    await signIn('Trainee');
    await userEvent.click(await screen.findByRole('button', { name: /Stakeholder Roleplay/ }));
    expect(await screen.findByRole('link', { name: 'My resume' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chat with the client' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Set the stage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review chats' })).not.toBeInTheDocument();
  });

  it('shows admin pages only to an admin', async () => {
    renderAt('/login');
    await signIn('Admin', 'boss');
    await userEvent.click(await screen.findByRole('button', { name: /Stakeholder Roleplay/ }));
    expect(await screen.findByRole('link', { name: 'Set the stage' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review chats' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My resume' })).not.toBeInTheDocument();
  });

  it('sends a trainee who opens an admin URL to their own page', async () => {
    renderAt('/agents/agent3/setup'); // signed out: login first, then back to this URL
    await signIn('Trainee');
    expect(await screen.findByRole('heading', { name: 'My resume' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Set the stage' })).not.toBeInTheDocument();
  });

  it('signs out', async () => {
    renderAt('/login');
    await signIn('Trainee');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
