import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Alert, SubNav } from '@/components/ui';
import { Agent3ApiProvider, isMockMode } from './api';
import { ReviewPage } from './admin/ReviewPage';
import { SetupPage } from './admin/SetupPage';
import { ChatPage } from './trainee/ChatPage';
import { ResumePage } from './trainee/ResumePage';

/**
 * Agent 3: Stakeholder Roleplay (port of Smart_Ops_Pod3 Streamlit UI).
 * Roles are strictly separate: trainees get resume + chat, admins get setup + review.
 * Routes are relative to /agents/agent3. See ./README.md.
 */
export default function Agent3() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Agent3ApiProvider>
      <div className="stack">
        {isMockMode && (
          <Alert kind="info">Running on mock data. Nothing is sent to a server.</Alert>
        )}
        <SubNav
          items={
            isAdmin
              ? [
                  { to: 'setup', label: 'Set the stage' },
                  { to: 'review', label: 'Review chats' },
                ]
              : [
                  { to: 'resume', label: 'My resume' },
                  { to: 'chat', label: 'Chat with the client' },
                ]
          }
        />
        <Routes>
          {isAdmin ? (
            <>
              <Route index element={<Navigate to="setup" replace />} />
              <Route path="setup" element={<SetupPage />} />
              <Route path="review" element={<ReviewPage />} />
              <Route path="*" element={<Navigate to="setup" replace />} />
            </>
          ) : (
            <>
              <Route index element={<Navigate to="resume" replace />} />
              <Route path="resume" element={<ResumePage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="*" element={<Navigate to="resume" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Agent3ApiProvider>
  );
}
