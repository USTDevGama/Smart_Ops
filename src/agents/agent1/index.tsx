import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Alert } from '@/components/ui';

/**
 * Agent 1: entry point owned by Team 1. Routes are relative to /agents/agent1.
 * Split views by role the same way agent3 does (trainee/ and admin/ folders).
 */
function Landing() {
  const { user } = useAuth();
  return (
    <div className="stack">
      <h1>Agent 1</h1>
      <Alert kind="info">
        Team 1 builds this agent here. You are signed in as {user?.name} ({user?.role}).
      </Alert>
    </div>
  );
}

export default function Agent1() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
