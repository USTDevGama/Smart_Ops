// ASGD screen. The role is set at login: trainees see their own results, evaluators see the
// trainee list and each trainee's report with the review decision. There is no switch.

import { useAuth } from '@/auth';
import { EvaluatorView } from './EvaluatorView';
import { TraineeView } from './TraineeView';
import './theme.css';
import styles from './AgentScreen.module.css';

export function AgentScreen() {
  const { user } = useAuth();
  // Admins are the evaluators; everyone else sees the trainee view.
  const isEvaluator = user?.role === 'admin';
  return (
    <div className={`asgd ${styles.screen}`}>
      {isEvaluator ? <EvaluatorView /> : <TraineeView />}
    </div>
  );
}
