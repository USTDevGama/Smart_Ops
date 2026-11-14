import { describe, expect, it } from 'vitest';
import { toBackendHeaders } from './devHeaders';

describe('toBackendHeaders', () => {
  it('sends the portal trainee role as the backend user role', () => {
    expect(toBackendHeaders({ 'X-Dev-User': 'sam', 'X-Dev-Role': 'trainee' })).toEqual({
      'X-Dev-User': 'sam',
      'X-Dev-Role': 'user',
    });
  });

  it('keeps admin as admin', () => {
    const h = { 'X-Dev-User': 'ada', 'X-Dev-Role': 'admin' };
    expect(toBackendHeaders(h)).toEqual(h);
  });

  it('passes a bearer token through untouched', () => {
    const h = { Authorization: 'Bearer abc' };
    expect(toBackendHeaders(h)).toBe(h);
  });
});
