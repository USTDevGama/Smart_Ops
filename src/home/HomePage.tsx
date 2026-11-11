import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Card } from '@/components/ui';
import { agentsForRole } from '@/agents/registry';
import styles from './HomePage.module.css';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const agents = user ? agentsForRole(user.role) : [];

  return (
    <div className="stack">
      <div className="stack-sm">
        <h1>Choose an agent</h1>
        <p>Signed in as {user?.name}.</p>
      </div>
      <ul className={styles.grid}>
        {agents.map((a, i) => (
          <li key={a.id}>
            <Card className={styles.card}>
              <h2>
                <button className={styles.cardButton} onClick={() => navigate(`/agents/${a.id}`)}>
                  <span className={styles.num}>{i + 1}</span> {a.name}
                </button>
              </h2>
              <p>{a.description}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
