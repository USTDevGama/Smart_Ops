import { describe, expect, it } from 'vitest';
import { textToPayload } from './JsonUploader';

describe('textToPayload', () => {
  it('makes one complete record per blank-line separated paragraph', () => {
    const p = textToPayload(
      'notes.txt',
      'First line\nstill first.\r\n\r\nSecond paragraph.\n\n\n  \nThird.',
    );
    expect(p.dataset).toBe('notes.txt');
    expect(p.records).toEqual([
      {
        id: 'TXT-001',
        reviewer: 'Unknown reviewer',
        trainee: 'UNKNOWN-001',
        rating: 3,
        comment: 'First line still first.',
      },
      {
        id: 'TXT-002',
        reviewer: 'Unknown reviewer',
        trainee: 'UNKNOWN-002',
        rating: 3,
        comment: 'Second paragraph.',
      },
      {
        id: 'TXT-003',
        reviewer: 'Unknown reviewer',
        trainee: 'UNKNOWN-003',
        rating: 3,
        comment: 'Third.',
      },
    ]);
  });

  it('gives every record all five required fields and unique ids and trainees', () => {
    const { records } = textToPayload('a.txt', 'one\n\ntwo\n\nthree');
    for (const r of records)
      expect(Object.keys(r).sort()).toEqual(['comment', 'id', 'rating', 'reviewer', 'trainee']);
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
    expect(new Set(records.map((r) => r.trainee)).size).toBe(records.length);
  });

  it('splits per line when there are no blank lines', () => {
    expect(textToPayload('a.txt', 'one\ntwo\n').records.map((r) => r.comment)).toEqual([
      'one',
      'two',
    ]);
  });
});
