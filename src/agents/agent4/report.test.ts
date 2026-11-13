// Checks the results page rules against made-up example results (SYN-01, SYN-02). No real trainee
// data is in this file. Each example is checked for the counts the backend reports.

import { describe, expect, it } from 'vitest';

import type { Summary } from './api';
import { buildReportPdf } from './reportPdf';
import {
  exerciseTotals,
  formatMinutes,
  groupScoreRows,
  notAssessedNote,
  outcomeLine,
  percentOfScale,
  recommendationCards,
  reportFileName,
  scoreStatus,
  signalsFor,
  sortScoreRows,
  summaryErrorText,
} from './reportView';

const T02: Summary = {
  run_id: 'synthetic-SYN-02',
  status: 'pending_review',
  trainee_id: 'SYN-02',
  overview: 'Overview text from the agent.',
  assessed_count: 11,
  goal_count: 12,
  gap_threshold: 2,
  scores: [
    { goal: 'G01', label: 'Explaining concepts', score: 4.5, sources: ['A_scores.G01=4.5'] },
    { goal: 'G02', label: 'Engineering process', score: 4, sources: ['A_scores.G02=4'] },
    { goal: 'G03', label: 'Secure code', score: 3, sources: ['A_scores.G03=3'] },
    { goal: 'G04', label: 'Handling data', score: 3.5, sources: ['A_scores.G04=3.5'] },
    { goal: 'G05', label: 'Testing own work', score: 4, sources: ['B_themes.G05=4'] },
    {
      goal: 'G06',
      label: 'Clear communication',
      score: 3,
      sources: ['B_themes.G06=3', 'C_scores.G06=3'],
    },
    { goal: 'G07', label: 'Giving and receiving feedback', score: 4, sources: ['B_themes.G07=4'] },
    { goal: 'G08', label: 'Handling client pressure', score: 2, sources: ['C_scores.G08=2'] },
    { goal: 'G09', label: 'Environments and release', score: 3, sources: ['A_scores.G09=3'] },
    {
      goal: 'G10',
      label: 'Responding to incidents',
      score: 2.5,
      sources: ['A_scores.G10=2', 'C_scores.G10=3'],
    },
    { goal: 'G11', label: 'Teamwork', score: 5, sources: ['B_themes.G11=5'] },
    { goal: 'G12', label: 'Independent learning', score: null, sources: [] },
  ],
  gaps: [
    {
      goal: 'G08',
      label: 'Handling client pressure',
      score: 2,
      evidence: ['C_scores.G08=2'],
      outcome_match: 'partial',
      exercises: [{ id: 'EX-08', title: 'Client pushback practice', minutes: 40 }],
      outcomes: [
        {
          id: 'O11',
          wording: 'Balancing technical execution with professional responsibility.',
          match: 'partial',
        },
      ],
      why: 'Rehearsing pushback in a roleplay targets this low score directly.',
    },
  ],
  strong: [
    { goal: 'G01', label: 'Explaining concepts', score: 4.5 },
    { goal: 'G02', label: 'Engineering process', score: 4 },
    { goal: 'G05', label: 'Testing own work', score: 4 },
    { goal: 'G07', label: 'Giving and receiving feedback', score: 4 },
    { goal: 'G11', label: 'Teamwork', score: 5 },
  ],
  not_assessed: [{ goal: 'G12', label: 'Independent learning' }],
  review_required: true,
  versions: { rules: '0.1.0', mapping: '0.2.0', content_library: 'sha256:ff8d717b471c' },
};

// A made-up result in the shape the API returns (synthetic values, not a real trainee).
const T01: Summary = {
  run_id: '55081ddf-7596-4b79-b893-4bbdcffa7008',
  status: 'pending_review',
  trainee_id: 'SYN-01',
  overview:
    '10 of 12 goals were assessed, and 2 goals, Secure code and Handling data, need attention. Both of these gaps come from the same source. Testing own work and Independent learning were not assessed.',
  assessed_count: 10,
  goal_count: 12,
  gap_threshold: 2,
  scores: [
    { goal: 'G01', label: 'Explaining concepts', score: 3.5, sources: ['A_scores.G01=3.5'] },
    { goal: 'G02', label: 'Engineering process', score: 4, sources: ['A_scores.G02=4'] },
    { goal: 'G03', label: 'Secure code', score: 2, sources: ['A_scores.G03=2'] },
    { goal: 'G04', label: 'Handling data', score: 2, sources: ['A_scores.G04=2'] },
    { goal: 'G05', label: 'Testing own work', score: null, sources: [] },
    {
      goal: 'G06',
      label: 'Clear communication',
      score: 3,
      sources: ['B_themes.G06=3', 'C_scores.G06=3'],
    },
    { goal: 'G07', label: 'Giving and receiving feedback', score: 4, sources: ['B_themes.G07=4'] },
    { goal: 'G08', label: 'Handling client pressure', score: 4, sources: ['C_scores.G08=4'] },
    { goal: 'G09', label: 'Environments and release', score: 4, sources: ['A_scores.G09=4'] },
    {
      goal: 'G10',
      label: 'Responding to incidents',
      score: 2.5,
      sources: ['A_scores.G10=2', 'C_scores.G10=3'],
    },
    { goal: 'G11', label: 'Teamwork', score: 4, sources: ['B_themes.G11=4'] },
    { goal: 'G12', label: 'Independent learning', score: null, sources: [] },
  ],
  gaps: [
    {
      goal: 'G03',
      label: 'Secure code',
      score: 2,
      evidence: ['A_scores.G03=2'],
      outcome_match: 'strong',
      exercises: [{ id: 'EX-03', title: 'Find the injection: secure code lab', minutes: 60 }],
      outcomes: [
        {
          id: 'O4',
          wording: 'Security, compliance and intellectual-property protection.',
          match: 'strong',
        },
      ],
      why: 'This lab has you hunt for an injection flaw in code, which gives you hands-on practice in the secure code skill where your score was low.',
    },
    {
      goal: 'G04',
      label: 'Handling data',
      score: 2,
      evidence: ['A_scores.G04=2'],
      outcome_match: 'partial',
      exercises: [{ id: 'EX-04', title: 'Data handling cases', minutes: 40 }],
      outcomes: [
        {
          id: 'O4',
          wording: 'Security, compliance and intellectual-property protection.',
          match: 'partial',
        },
      ],
      why: 'These cases let you practise deciding how to handle data in realistic situations, which targets the area where your score was low.',
    },
  ],
  strong: [
    { goal: 'G02', label: 'Engineering process', score: 4 },
    { goal: 'G07', label: 'Giving and receiving feedback', score: 4 },
    { goal: 'G08', label: 'Handling client pressure', score: 4 },
    { goal: 'G09', label: 'Environments and release', score: 4 },
    { goal: 'G11', label: 'Teamwork', score: 4 },
  ],
  not_assessed: [
    { goal: 'G05', label: 'Testing own work' },
    { goal: 'G12', label: 'Independent learning' },
  ],
  review_required: true,
  versions: { rules: '0.1.0', mapping: '0.2.0', content_library: 'builtin:sha256:070aa2cb710f' },
};

describe('status rule', () => {
  it('treats 2 or below as a gap and anything above as met', () => {
    expect(scoreStatus(2, 2)).toBe('gap');
    expect(scoreStatus(2.5, 2)).toBe('met');
    expect(scoreStatus(3.5, 2)).toBe('met');
  });

  it('marks a missing score as not assessed', () => {
    expect(scoreStatus(null, 2)).toBe('not_assessed');
  });

  it('places the bars on the 0 to 5 scale', () => {
    expect(percentOfScale(2)).toBe('40%');
    expect(percentOfScale(3.5)).toBe('70%');
    expect(percentOfScale(5)).toBe('100%');
  });

  it('agrees with the backend gap list for both trainees', () => {
    for (const summary of [T02, T01]) {
      const gapsFromScores = summary.scores
        .filter((row) => scoreStatus(row.score, summary.gap_threshold) === 'gap')
        .map((row) => row.goal);
      expect(gapsFromScores).toEqual(summary.gaps.map((gap) => gap.goal));
    }
  });

  it('agrees with the backend strong list for both trainees', () => {
    for (const summary of [T02, T01]) {
      const fromScores = summary.scores
        .filter((row) => row.score !== null && row.score >= 4)
        .map((row) => row.goal);
      expect(fromScores).toEqual(summary.strong.map((row) => row.goal));
    }
  });
});

describe('scores list', () => {
  it('sorts by score, then code, with not assessed last', () => {
    expect(sortScoreRows(T02.scores).map((row) => row.goal)).toEqual([
      'G08',
      'G10',
      'G03',
      'G06',
      'G09',
      'G04',
      'G02',
      'G05',
      'G07',
      'G01',
      'G11',
      'G12',
    ]);
  });

  it('groups the rows into skill gaps, met and not assessed', () => {
    const groups = groupScoreRows(T01.scores, T01.gap_threshold);
    expect(groups.map((group) => group.title)).toEqual(['Skill gaps', 'Met', 'Not assessed']);
    expect(groups[0].rows.map((row) => row.goal)).toEqual(['G03', 'G04']);
    expect(groups[1].rows.map((row) => row.goal)).toEqual([
      'G10',
      'G06',
      'G01',
      'G02',
      'G07',
      'G08',
      'G09',
      'G11',
    ]);
    expect(groups[2].rows.map((row) => row.goal)).toEqual(['G05', 'G12']);
  });

  it('leaves out a group with no rows', () => {
    const groups = groupScoreRows(
      T02.scores.filter((row) => row.score !== null),
      2,
    );
    expect(groups.map((group) => group.title)).toEqual(['Skill gaps', 'Met']);
  });
});

describe('tiles and counts from the API', () => {
  it('shows the SYN-02 counts', () => {
    expect(`${T02.assessed_count} of ${T02.goal_count}`).toBe('11 of 12');
    expect(T02.gaps.length).toBe(1);
    expect(exerciseTotals(T02.gaps)).toEqual({ count: 1, time: '40 min' });
    expect(T02.strong.length).toBe(5);
  });

  it('shows the SYN-01 counts', () => {
    expect(`${T01.assessed_count} of ${T01.goal_count}`).toBe('10 of 12');
    expect(T01.gaps.length).toBe(2);
    expect(exerciseTotals(T01.gaps)).toEqual({ count: 2, time: '1 h 40 min' });
    expect(T01.strong.length).toBe(5);
    expect(T01.not_assessed.length).toBe(2);
  });
});

describe('plain-text fields', () => {
  it('uses the overview and the why text exactly as the agent wrote them', () => {
    expect(T01.overview.startsWith('10 of 12 goals were assessed')).toBe(true);
    const cards = recommendationCards(T01.gaps);
    expect(cards[0].why).toBe(T01.gaps[0].why);
    expect(cards[0].title).toBe('Find the injection: secure code lab');
  });

  it('keeps a gap with no approved exercise visible', () => {
    const cards = recommendationCards([{ ...T02.gaps[0], exercises: [] }]);
    expect(cards).toHaveLength(1);
    expect(cards[0].minutes).toBeNull();
    expect(exerciseTotals([{ ...T02.gaps[0], exercises: [] }])).toEqual({
      count: 0,
      time: '0 min',
    });
  });
});

describe('not-assessed note', () => {
  it('names each goal in one sentence', () => {
    expect(notAssessedNote(T02.not_assessed)).toBe(
      'G12 Independent learning has no evidence yet, so it is not scored.',
    );
    expect(notAssessedNote(T01.not_assessed)).toBe(
      'G05 Testing own work and G12 Independent learning have no evidence yet, so they are not scored.',
    );
  });
});

describe('errors from the summary', () => {
  it('shows the screen wording, not the server text', () => {
    expect(summaryErrorText(404, 'trainee')).toBe(
      'No results yet for this trainee ID. Check it and try again.',
    );
    expect(summaryErrorText(409, 'trainee')).toBe(
      'Complete all your assessments to view your results.',
    );
    expect(summaryErrorText(409, 'admin')).toBe(
      'This trainee has not completed all assessments yet.',
    );
    expect(summaryErrorText(503, 'trainee')).toBe(
      'The agent could not check this result. Try again in a moment.',
    );
  });
});

describe('PDF download', () => {
  it('names the file the way the server does', () => {
    expect(reportFileName('SYN-01')).toBe('trainee-SYN-01-report.pdf');
    expect(reportFileName('SYN-02/../x')).toBe('trainee-SYN-02x-report.pdf');
  });

  it('builds a PDF from the summary for both trainees', async () => {
    for (const summary of [T02, T01]) {
      const blob = buildReportPdf(summary);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(1000);
      const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
      expect(new TextDecoder().decode(new Uint8Array(bytes).slice(0, 5))).toBe('%PDF-');
    }
  });

  it('builds a PDF for a trainee with no assessed goals', () => {
    const blob = buildReportPdf({
      ...T02,
      gaps: [],
      strong: [],
      scores: T02.scores.map((row) => ({ ...row, score: null, sources: [] })),
      assessed_count: 0,
      not_assessed: T02.scores.map((row) => ({ goal: row.goal, label: row.label })),
    });
    expect(blob.size).toBeGreaterThan(1000);
  });
});

describe('minutes and card text', () => {
  it('shows minutes as hours when they reach an hour', () => {
    expect(formatMinutes(40)).toBe('40 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(100)).toBe('1 h 40 min');
  });

  it('shows the goal with its score and the outcome without its code', () => {
    const cards = recommendationCards(T01.gaps);
    expect(cards[0].goal).toBe('G03 Secure code (score 2)');
    expect(outcomeLine(T01.gaps[0].outcomes[0])).toBe(
      'Security, compliance and intellectual-property protection.',
    );
  });
});

describe('signals', () => {
  it('names the signal behind each score from its source', () => {
    expect(signalsFor(['A_scores.G04=2']).map((s) => s.label)).toEqual(['Interview']);
    expect(signalsFor(['C_scores.G08=2']).map((s) => s.label)).toEqual(['Roleplay']);
    expect(signalsFor(['B_themes.G11=5']).map((s) => s.label)).toEqual(['Peer feedback']);
  });

  it('lists several signals in interview, peer feedback, roleplay order', () => {
    expect(signalsFor(['C_scores.G06=3', 'B_themes.G06=4']).map((s) => s.label)).toEqual([
      'Peer feedback',
      'Roleplay',
    ]);
    expect(signalsFor(['A_scores.G10=2', 'C_scores.G10=3']).map((s) => s.label)).toEqual([
      'Interview',
      'Roleplay',
    ]);
  });

  it('ignores a source it does not know', () => {
    expect(signalsFor(['X_other.G01=3'])).toEqual([]);
    expect(signalsFor([])).toEqual([]);
  });
});
