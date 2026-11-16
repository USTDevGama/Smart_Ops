// Pure helpers for the results page. No React here, so the rules can be tested directly.
// Every number on the page comes from the Summary the API returns. Nothing is written in by hand.

import type { GapSummary, GoalStatus, Outcome, RunStatus, ScoreRow } from './api';
import { resourceForExercise, type ResourceLink } from './resourceLinks';

export const SCALE_MAX = 5;

export type ScoreStatus = 'gap' | 'met' | 'not_covered' | 'not_available';

export const STATUS_TEXT: Record<RunStatus, string> = {
  running: 'Running',
  pending_review: 'Pending review',
  failed: 'Failed',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const STATUS_PILL_TEXT: Record<ScoreStatus, string> = {
  gap: 'Gap',
  met: 'Met',
  not_covered: 'Not covered',
  not_available: 'Not available',
};

// A score at or below the threshold is a gap. The threshold comes from the API, never from here.
export function scoreStatus(score: number | null, threshold: number): ScoreStatus {
  if (score === null) return 'not_available';
  return score <= threshold ? 'gap' : 'met';
}

// A goal without status 'scored' is never given a number, whatever the score field holds.
export function rowStatus(row: ScoreRow, threshold: number): ScoreStatus {
  return row.status === 'scored'
    ? scoreStatus(row.score, threshold)
    : row.status === 'not_covered'
      ? 'not_covered'
      : 'not_available';
}

// Position of a value on the 0 to 5 bar, as a CSS percentage.
export function percentOfScale(value: number): string {
  return `${(value / SCALE_MAX) * 100}%`;
}

// Lowest score first, ties by goal code. Goals not assessed go last.
export function sortScoreRows(rows: ScoreRow[]): ScoreRow[] {
  return [...rows].sort((a, b) => {
    if (a.score === null && b.score === null) return a.goal.localeCompare(b.goal);
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (a.score !== b.score) return a.score - b.score;
    return a.goal.localeCompare(b.goal);
  });
}

// The signal behind a score, from its source references ("A_scores.G04=2" means the interview).
// Order is fixed: interview, peer feedback, roleplay.
export const SIGNAL_LABEL: Record<'A' | 'B' | 'C', string> = {
  A: 'Interview',
  B: 'Peer feedback',
  C: 'Roleplay',
};
export type Signal = { code: 'A' | 'B' | 'C'; label: string };

const SOURCE_SIGNAL: Record<string, 'A' | 'B' | 'C'> = {
  A_scores: 'A',
  B_themes: 'B',
  C_scores: 'C',
};

export function signalsFor(sources: string[]): Signal[] {
  const found = new Set<'A' | 'B' | 'C'>();
  for (const source of sources) {
    const code = SOURCE_SIGNAL[source.split('.')[0]];
    if (code) found.add(code);
  }
  return (['A', 'B', 'C'] as const)
    .filter((code) => found.has(code))
    .map((code) => ({ code, label: SIGNAL_LABEL[code] }));
}

// The three groups in the scores list, in the order the design shows them.
export type ScoreGroup = { status: ScoreStatus; title: string; rows: ScoreRow[] };

export function groupScoreRows(rows: ScoreRow[], threshold: number): ScoreGroup[] {
  const sorted = sortScoreRows(rows);
  const groups: ScoreGroup[] = [
    { status: 'gap', title: 'Skill gaps', rows: [] },
    { status: 'met', title: 'Met', rows: [] },
    { status: 'not_covered', title: 'Not covered', rows: [] },
    { status: 'not_available', title: 'Not available', rows: [] },
  ];
  for (const row of sorted) {
    const status = rowStatus(row, threshold);
    groups.find((group) => group.status === status)?.rows.push(row);
  }
  return groups.filter((group) => group.rows.length > 0);
}

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

export function countWord(n: number): string {
  const word = NUMBER_WORDS[n];
  return word === undefined ? String(n) : word;
}

// "a", "a and b", "a, b and c"
export function joinNames(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const goalName = (row: { goal: string; label: string }) => `${row.goal} ${row.label}`;

// The sentence under "Not assessed". The design adds a fixed line after it. Goals the database
// says are "not covered" are named apart from goals with no entry.
export function notAssessedNote(
  rows: { goal: string; label: string; status?: GoalStatus }[],
): string {
  const covered = rows.filter((row) => row.status === 'not_covered');
  const rest = rows.filter((row) => row.status !== 'not_covered');
  const sentences: string[] = [];
  if (rest.length > 0) {
    const names = joinNames(rest.map(goalName));
    sentences.push(
      rest.length === 1
        ? `${names} has no evidence yet, so it is not scored.`
        : `${names} have no evidence yet, so they are not scored.`,
    );
  }
  if (covered.length > 0) {
    const names = joinNames(covered.map(goalName));
    sentences.push(
      covered.length === 1
        ? `${names} is not covered, so it is not scored.`
        : `${names} are not covered, so they are not scored.`,
    );
  }
  return sentences.join(' ');
}

// One card per exercise. A gap with no approved exercise gets one card that says so.
export type RecommendationCard = {
  key: string;
  title: string;
  minutes: number | null;
  goal: string;
  why: string;
  outcomes: Outcome[];
  resource: ResourceLink | null;
};

export function recommendationCards(gaps: GapSummary[]): RecommendationCard[] {
  return gaps.flatMap((gap): RecommendationCard[] => {
    const goal = `${gap.goal} ${gap.label}`;
    if (gap.exercises.length === 0) {
      return [
        {
          key: `${gap.goal}-none`,
          title: 'No approved exercise for this goal yet',
          minutes: null,
          goal,
          why: gap.why,
          outcomes: gap.outcomes,
          resource: null,
        },
      ];
    }
    return gap.exercises.map((exercise) => ({
      key: `${gap.goal}-${exercise.id}`,
      title: exercise.title,
      minutes: exercise.minutes,
      goal: `${goal} (score ${gap.score})`,
      why: gap.why,
      outcomes: gap.outcomes,
      resource: resourceForExercise(exercise.id) ?? null,
    }));
  });
}

// Minutes as the screen shows them: "40 min", "1 h", "1 h 40 min".
export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

// Exercises tile: how many approved exercises, and how long they take in total. Shown separately.
export function exerciseTotals(gaps: GapSummary[]): { count: number; time: string } {
  const exercises = gaps.flatMap((gap) => gap.exercises);
  const minutes = exercises.reduce((total, exercise) => total + exercise.minutes, 0);
  return { count: exercises.length, time: formatMinutes(minutes) };
}

export function exerciseCount(gaps: GapSummary[]): number {
  return gaps.reduce((total, gap) => total + gap.exercises.length, 0);
}

export function matchLabel(match: string): string {
  return `${match.charAt(0).toUpperCase()}${match.slice(1)} match`;
}

// The outcome as a person reads it: its wording only, without the internal code (O4, O11...).
export function outcomeLine(outcome: Outcome): string {
  return outcome.wording;
}

// What the screen says for each error from the summary. The server's own text is for developers.
// 409 is no longer returned for incomplete data: a partial summary comes back instead.
export function summaryErrorText(status: number): string {
  if (status === 404) return 'No results yet for this trainee.';
  if (status === 503) return 'Try again.';
  return 'The results could not be loaded.';
}

// What the PDF download says when it fails. 503 means the server has no PDF engine installed.
export function reportErrorText(status: number): string {
  if (status === 503)
    return 'The server cannot make PDF reports right now (PDF engine not installed).';
  return 'The report could not be downloaded.';
}

// The note under the overview while a section (A, B or C) has no data yet. Empty when none.
export function pendingNote(sections: { label: string }[]): string {
  if (sections.length === 0) return '';
  return `Showing the results received so far. Still waiting for ${joinNames(sections.map((s) => s.label))}.`;
}

// Shown in place of the score when a goal has none. A number is never shown for these.
export function goalStatusText(status: GoalStatus): string {
  return status === 'not_covered' ? 'Not covered' : 'Not available';
}

// File name for the download, ASGD_<trainee-id>_<run-id>.pdf.
export function reportFileName(traineeId: string, runId?: string): string {
  const clean = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, '');
  const run = runId ? clean(runId) : '';
  return `ASGD_${clean(traineeId)}${run ? `_${run}` : ''}.pdf`;
}
