import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { useAuth } from './AuthProvider';
import { isRole } from './devAuth';
import type { Role } from './types';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('trainee');
  const [error, setError] = useState<string>();

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    login(name, role);
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <form className="stack" onSubmit={onSubmit} noValidate>
          <div className="stack-sm">
            <h1>Sign in</h1>
            <p>Choose an agent after you sign in.</p>
          </div>
          <Alert kind="info">Development login. Single sign-on (Zitadel) is coming.</Alert>
          <Input
            label="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
            error={error}
            autoComplete="username"
            autoFocus
          />
          <Select
            label="Role"
            value={role}
            onChange={(e) => isRole(e.target.value) && setRole(e.target.value)}
          >
            <option value="trainee">Trainee</option>
            <option value="admin">Admin</option>
          </Select>
          <Button type="submit">Sign in</Button>
          <Button variant="secondary" disabled title="Available once Zitadel is configured">
            Sign in with Zitadel
          </Button>
        </form>
      </Card>
    </main>
  );
}
