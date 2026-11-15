import { describe, expect, it } from 'vitest';

import { recommendationCards } from './reportView';
import { resourceForExercise } from './resourceLinks';

describe('resourceForExercise', () => {
  it('gives each approved exercise a public https resource', () => {
    for (let n = 1; n <= 11; n += 1) {
      const id = `EX-${String(n).padStart(2, '0')}`;
      const resource = resourceForExercise(id);
      expect(resource, id).toBeDefined();
      expect(resource?.url.startsWith('https://')).toBe(true);
    }
  });

  it('returns undefined for an unknown exercise', () => {
    expect(resourceForExercise('EX-99')).toBeUndefined();
  });
});

describe('recommendationCards resource', () => {
  const gap = {
    goal: 'G03',
    label: 'Secure code',
    score: 2,
    severity: 'gap',
    evidence: ['E1'],
    outcome_match: 'strong',
    why: 'Practises spotting injection.',
    outcomes: [],
    exercises: [{ id: 'EX-03', title: 'Find the injection: secure code lab', minutes: 60 }],
  } as unknown as Parameters<typeof recommendationCards>[0][number];

  it('attaches the resource to the exercise card', () => {
    const [card] = recommendationCards([gap]);
    expect(card?.resource?.name).toBe('OWASP WebGoat Hands-on Lab');
  });

  it('gives no resource to the no-exercise card', () => {
    const [card] = recommendationCards([{ ...gap, exercises: [] }]);
    expect(card?.resource).toBeNull();
  });
});
