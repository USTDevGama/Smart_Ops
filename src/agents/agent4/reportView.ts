// Pure helpers for the results page. No React here, so the rules can be tested directly.
// Every number on the page comes from the Summary the API returns. Nothing is written in by hand.

import type { GapSummary, Outcome, RunStatus, ScoreRow } from './api';

export const SCALE_MAX = 5;

export type ScoreStatus = 'gap' | 'met' | 'not_assessed';

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
  not_assessed: 'Not assessed',
};

// A score at or below the threshold is a gap. The threshold comes from the API, never from here.
export function scoreStatus(score: number | null, threshold: number): ScoreStatus {
  if (score === null) return 'not_assessed';
  return score <= threshold ? 'gap' : 'met';
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

// The three groups in the scores list, in the order the design shows them.
export type ScoreGroup = { status: ScoreStatus; title: string; rows: ScoreRow[] };

export function groupScoreRows(rows: ScoreRow[], threshold: number): ScoreGroup[] {
  const sorted = sortScoreRows(rows);
  const groups: ScoreGroup[] = [
    { status: 'gap', title: 'Skill gaps', rows: [] },
    { status: 'met', title: 'Met', rows: [] },
    { status: 'not_assessed', title: 'Not assessed', rows: [] },
  ];
  for (const row of sorted) {
    const status = scoreStatus(row.score, threshold);
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

// The sentence under "Not assessed". The design adds a fixed line after it.
export function notAssessedNote(rows: { goal: string; label: string }[]): string {
  const names = joinNames(rows.map(goalName));
  if (rows.length === 1) return `${names} has no evidence yet, so it is not scored.`;
  return `${names} have no evidence yet, so they are not scored.`;
}

// One card per exercise. A gap with no approved exercise gets one card that says so.
export type RecommendationCard = {
  key: string;
  title: string;
  minutes: number | null;
  goal: string;
  why: string;
  outcomes: Outcome[];
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

// Tile value for exercises: "2 · 1 h 40 min". Only approved exercises count.
export function exerciseTile(gaps: GapSummary[]): string {
  const exercises = gaps.flatMap((gap) => gap.exercises);
  const minutes = exercises.reduce((total, exercise) => total + exercise.minutes, 0);
  return `${exercises.length} · ${formatMinutes(minutes)}`;
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
export function summaryErrorText(status: number, role: 'trainee' | 'admin'): string {
  if (status === 404) {
    return role === 'trainee'
      ? 'No results yet for this trainee ID. Check it and try again.'
      : 'No results yet for this trainee.';
  }
  if (status === 409) {
    return role === 'trainee'
      ? 'Complete all your assessments to view your results.'
      : 'This trainee has not completed all assessments yet.';
  }
  if (status === 503) {
    return 'The agent could not check this result. Try again in a moment.';
  }
  return 'The results could not be loaded.';
}

// File name for the download, as the server names it: trainee-{id}-report.pdf.
export function reportFileName(traineeId: string): string {
  return `trainee-${traineeId.replace(/[^A-Za-z0-9_-]/g, '')}-report.pdf`;
}
