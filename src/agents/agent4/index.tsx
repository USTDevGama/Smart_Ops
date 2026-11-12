import { Navigate, Route, Routes } from 'react-router-dom';
import { Alert } from '@/components/ui';
import { Agent4ApiProvider, isMockMode } from './api';
import { AgentScreen } from './AgentScreen';

/**
 * Adaptive Skill-Gap Diagnostic Agent (ASGD). Port of the Smart_Ops_Pod4 screen.
 * Both roles see the same screen. Routes are relative to /agents/agent4. See ./README.md.
 */
export default function Agent4() {
  return (
    <Agent4ApiProvider>
      <div className="stack">
        {isMockMode && (
          <Alert kind="info">Running on mock data. Nothing is sent to a server.</Alert>
        )}
        <Routes>
          <Route index element={<AgentScreen />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </Agent4ApiProvider>
  );
}
