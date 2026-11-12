import type { ThemeScore, TraineeGoalScore } from '../api/types';
import { WarningMarkIcon } from './Icon';

function Theme({ code, score }: { code: string; score: ThemeScore }) {
  const missing = score === 'INSUFFICIENT_EVIDENCE';
  return (
    <li className="flex items-center gap-1.5 rounded-sm border border-line bg-neu-50 px-2 py-1 text-xs text-heading">
      <span className="font-mono text-body">{code}</span>
      {missing ? (
        <>
          <WarningMarkIcon />
          <span className="font-medium">Not enough evidence</span>
        </>
      ) : (
        <span className="font-medium tabular-nums">{score}</span>
      )}
    </li>
  );
}

/** Goal scores per trainee. Shown only when the result has them. */
export default function GoalScores({ scores }: { scores: TraineeGoalScore[] }) {
  return (
    <ul className="space-y-3">
      {scores.map((t) => (
        <li key={t.trainee_id} className="rounded-md border border-line bg-surface p-4">
          <h5 className="m-0 text-base font-medium text-heading">
            Trainee <span className="font-mono text-sm">{t.trainee_id}</span>
          </h5>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Goal scores for ${t.trainee_id}`}>
            {Object.entries(t.B_themes).map(([code, score]) => (
              <Theme key={code} code={code} score={score} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
