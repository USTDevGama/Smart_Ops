import { Outlet } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Avatar, Button, Link, Tag } from '@/components/ui';
import styles from './Layout.module.css';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          Agent Portal
        </Link>
        {user && (
          <div className="row">
            <Avatar size={24} />
            <span>{user.name}</span>
            <Tag kind="info">{user.role === 'admin' ? 'Admin' : 'Trainee'}</Tag>
            <Button variant="secondary" compact onClick={logout}>
              Sign out
            </Button>
          </div>
        )}
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
