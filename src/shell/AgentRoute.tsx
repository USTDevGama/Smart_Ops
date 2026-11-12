import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Alert, Link, Spinner } from '@/components/ui';
import { AGENTS } from '@/agents/registry';
import { NotFound } from './NotFound';

/** Mounts an agent at /agents/:agentId/* after checking the registry's role list. */
export function AgentRoute() {
  const { agentId } = useParams();
  const { user } = useAuth();
  const agent = AGENTS.find((a) => a.id === agentId);

  if (!agent) return <NotFound />;
  if (!user || !agent.roles.includes(user.role)) {
    return (
      <div className="stack">
        <Alert kind="error">You do not have access to {agent.name}.</Alert>
        <p>
          <Link to="/">Back to home</Link>
        </p>
      </div>
    );
  }

  const Agent = agent.component;
  return (
    <Suspense fallback={<Spinner />}>
      <Agent />
    </Suspense>
  );
}
