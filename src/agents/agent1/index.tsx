import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Alert } from '@/components/ui';
import { Agent1ApiProvider, isMockMode } from './api';
import { ReviewPage } from './admin/ReviewPage';
import { SessionReviewPage } from './admin/SessionReviewPage';
import { BriefingPage } from './trainee/BriefingPage';
import { CurriculumPage } from './trainee/CurriculumPage';
import { InterviewPage } from './trainee/InterviewPage';
import './theme.css';

/**
 * Agent 1: Viva Agent (port of Smart_Ops_Pod1's React UI).
 * Roles are strictly separate: trainees (candidates) submit/update their own curriculum, are taken
 * straight into the briefing and interview, then see a thank-you screen and return to the agents
 * home page. Admins only review completed sessions (curriculum, transcript, report) and accept or
 * reject the agent's evaluation. See ./README.md and ./MIGRATION.md.
 */
export default function Agent1() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Agent1ApiProvider>
      <div className="viva stack">
        {isMockMode && (
          <Alert kind="info">Running on mock data. Nothing is sent to a server.</Alert>
        )}
        <Routes>
          {isAdmin ? (
            <>
              <Route index element={<ReviewPage />} />
              <Route path="session/:sessionId/review" element={<SessionReviewPage />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </>
          ) : (
            <>
              <Route index element={<CurriculumPage />} />
              <Route path="session/:sessionId/briefing" element={<BriefingPage />} />
              <Route path="session/:sessionId/interview" element={<InterviewPage />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </>
          )}
        </Routes>
      </div>
    </Agent1ApiProvider>
  );
}
