import { describe, it, expect } from 'vitest';
import { normalizeOrigin, parseAllowedOrigins } from '../config/origins';

describe('Normalize tests', () => {
  it('throws error if given empty string', () => {
    expect(() => normalizeOrigin('')).toThrow();
  });
  it('throws error if not a proper URL', () => {
    expect(() => normalizeOrigin('a.com')).toThrow();
  });
  it('handles comma parsing with stray whitespace', () => {
    expect(normalizeOrigin('https://a.com')).toBe('https://a.com');
  });
});

describe('parseAllowedOrigins', () => {
  it('splits on commas and trims whitespace', () => {
    expect(parseAllowedOrigins('https://a.com , https://b.com', true)).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
});
