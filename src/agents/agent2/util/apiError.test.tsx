import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/types';
import RunError from '../components/RunError';
import { fieldErrors, toRunFailure } from './apiError';

const details = [
  { field: 'records[2].rating', message: 'Field required' },
  { field: 'records[5].comment', message: 'String should have at least 1 character' },
];

describe('fieldErrors', () => {
  it('keeps every valid { field, message } entry, including record indexes', () => {
    expect(fieldErrors(details)).toEqual(details);
  });

  it('skips entries and shapes it cannot use instead of guessing', () => {
    expect(
      fieldErrors([
        { field: 'records[0].id', message: 'Field required' },
        { field: 'records[1].id' },
        { message: 'no field' },
        { field: '  ', message: 'blank field' },
        { field: 3, message: 'not a string' },
        null,
        'text',
      ]),
    ).toEqual([{ field: 'records[0].id', message: 'Field required' }]);
    expect(fieldErrors(undefined)).toEqual([]);
    expect(fieldErrors({ field: 'a', message: 'b' })).toEqual([]);
    expect(fieldErrors('oops')).toEqual([]);
  });
});

describe('toRunFailure', () => {
  it('keeps the main message and the field details of an API error', () => {
    const f = toRunFailure(new ApiError(400, 'validation_error', 'Input is not valid', details));
    expect(f.message).toBe('Input is not valid');
    expect(f.details).toEqual(details);
  });

  it('gives network and other errors a plain message with no details', () => {
    expect(toRunFailure(new ApiError(0, 'network_error', 'Cannot reach the backend (x)'))).toEqual({
      message: 'Cannot reach the backend (x)',
      details: [],
    });
    expect(toRunFailure(new Error('boom'))).toEqual({ message: 'boom', details: [] });
    expect(toRunFailure('weird').message).toBe('Something went wrong.');
  });
});

describe('RunError', () => {
  it('shows the main message and every field problem as a list', () => {
    render(<RunError failure={{ message: 'Input is not valid', details }} />);
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Input is not valid')).toBeInTheDocument();
    expect(within(alert).getByText('2 problems to fix:')).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: '2 problems to fix:' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('records[2].rating: Field required');
    expect(items[1]).toHaveTextContent('records[5].comment');
  });

  it('shows only the message when there are no field details', () => {
    render(<RunError failure={{ message: 'Cannot reach the backend (offline)', details: [] }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the backend (offline)');
    expect(screen.queryByRole('list')).toBeNull();
  });
});
