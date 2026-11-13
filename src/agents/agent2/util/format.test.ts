import { describe, expect, it } from 'vitest';
import { batchLabel, flagKey, flagTitle, parseSubject } from './format';

describe('format helpers', () => {
  it('splits a subject into source (reviewer) and trainee', () => {
    expect(parseSubject('R-02 <-> T-03')).toEqual({ source: 'R-02', trainee: 'T-03' });
    expect(parseSubject('R-02<->T-03')).toEqual({ source: 'R-02', trainee: 'T-03' });
  });

  it('keeps an unexpected subject whole instead of guessing', () => {
    expect(parseSubject('R-02')).toEqual({ source: 'R-02', trainee: null });
    expect(parseSubject('R-02 <->')).toEqual({ source: 'R-02 <->', trainee: null });
  });

  it('matches agent flag names to table names', () => {
    expect(flagKey('subtle_harsh')).toBe(flagKey('Subtle-Harsh'));
    expect(flagTitle('subtle_harsh')).toBe('Subtle harsh');
  });

  it('labels a run by its batch id', () => {
    expect(batchLabel('B-1042')).toBe('Batch B-1042');
    expect(batchLabel(null)).toBe('Batch ID not available yet');
  });
});
