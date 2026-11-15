import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button, Card, Input, Select } from '@/components/ui';
import { useAuth } from './AuthProvider';
import { isRole } from './devAuth';
import type { Role } from './types';
import logo from '@/assets/ust/ust-motion-logo_static.png';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('trainee');
  const [traineeId, setTraineeId] = useState('');
  const [error, setError] = useState<string>();
  const [idError, setIdError] = useState<string>();

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
    if (role === 'trainee' && !traineeId.trim()) {
      setIdError('Enter your trainee ID.');
      return;
    }
    login(name, role, traineeId);
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <form className="stack" onSubmit={onSubmit} noValidate>
          <div className={styles.header}>
            <img className={styles.logo} src={logo} alt="UST" width={40} height={40} />
            <h1>Sign in</h1>
            <p>Pick your role, then choose an agent.</p>
          </div>
          <Select
            label="Role"
            value={role}
            onChange={(e) => isRole(e.target.value) && setRole(e.target.value)}
          >
            <option value="trainee">Trainee</option>
            <option value="admin">Admin</option>
          </Select>
          <Input
            label="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
            error={error}
            autoComplete="username"
          />
          {role === 'trainee' && (
            <div className={styles.reveal}>
              <Input
                label="Trainee ID"
                value={traineeId}
                onChange={(e) => {
                  setTraineeId(e.target.value);
                  setIdError(undefined);
                }}
                error={idError}
                autoComplete="off"
              />
            </div>
          )}
          <Button type="submit">Sign in</Button>
          <Button variant="secondary" disabled title="Available once Zitadel is configured">
            Sign in with Zitadel
          </Button>
        </form>
      </Card>
    </main>
  );
}
