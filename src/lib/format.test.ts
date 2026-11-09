import { describe, expect, it } from 'vitest';
import { formatMinutes } from './format';

describe('formatMinutes', () => {
  it('rounds to whole minutes, never 0', () => {
    expect(formatMinutes(584)).toBe('10 min');
    expect(formatMinutes(565)).toBe('9 min');
    expect(formatMinutes(20)).toBe('1 min');
  });
});
