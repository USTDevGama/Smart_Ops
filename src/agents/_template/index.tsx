import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Alert } from '@/components/ui';

/**
 * TEMPLATE. Copy this folder to src/agents/<new-id>, then register it in ../registry.ts.
 * Routes are relative to /agents/<new-id>. See ./README.md and docs/adding-an-agent.md.
 */
function Landing() {
  const { user } = useAuth();
  return (
    <div className="stack">
      <h1>New agent</h1>
      <Alert kind="info">
        Signed in as {user?.name} ({user?.role}).
      </Alert>
    </div>
  );
}

export default function TemplateAgent() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
