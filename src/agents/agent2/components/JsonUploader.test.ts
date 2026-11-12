import { describe, expect, it } from 'vitest';
import { textToPayload } from './JsonUploader';

describe('textToPayload', () => {
  it('makes one record per blank-line separated paragraph', () => {
    const p = textToPayload(
      'notes.txt',
      'First line\nstill first.\r\n\r\nSecond paragraph.\n\n\n  \nThird.',
    );
    expect(p.dataset).toBe('notes.txt');
    expect(p.records).toEqual([
      { id: 'T-001', comment: 'First line still first.' },
      { id: 'T-002', comment: 'Second paragraph.' },
      { id: 'T-003', comment: 'Third.' },
    ]);
  });

  it('splits per line when there are no blank lines', () => {
    expect(textToPayload('a.txt', 'one\ntwo\n').records.map((r) => r.comment)).toEqual([
      'one',
      'two',
    ]);
  });
});
