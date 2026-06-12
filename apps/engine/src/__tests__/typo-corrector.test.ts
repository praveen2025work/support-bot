import { describe, it, expect } from 'vitest';
import { correctTypos, addToDictionary } from '../core/nlp/typo-corrector';

describe('correctTypos', () => {
  it('returns unchanged text when no typos', () => {
    const result = correctTypos('show me the revenue');
    expect(result.wasCorrected).toBe(false);
    expect(result.corrected).toBe('show me the revenue');
    expect(result.corrections).toHaveLength(0);
  });

  it('corrects a single typo', () => {
    const result = correctTypos('show me the revnue');
    expect(result.wasCorrected).toBe(true);
    expect(result.corrected).toContain('revenue');
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0].from).toBe('revnue');
    expect(result.corrections[0].to).toBe('revenue');
  });

  it('corrects multiple typos', () => {
    const result = correctTypos('shw me teh revnue');
    expect(result.wasCorrected).toBe(true);
    expect(result.corrections.length).toBeGreaterThanOrEqual(1);
  });

  it('preserves original text in result', () => {
    const input = 'queyr results';
    const result = correctTypos(input);
    expect(result.original).toBe(input);
  });

  it('does not correct very short words (≤ 2 chars)', () => {
    const result = correctTypos('ab cd ef');
    expect(result.wasCorrected).toBe(false);
  });

  it('does not correct words already in dictionary', () => {
    const result = correctTypos('query');
    expect(result.wasCorrected).toBe(false);
    expect(result.corrected).toBe('query');
  });

  it('preserves punctuation around words', () => {
    const result = correctTypos('hello, revnue!');
    // "hello" is in dictionary, no correction
    // "revnue" → "revenue"
    expect(result.corrected).toContain('revenue');
    if (result.wasCorrected) {
      expect(result.corrected).toMatch(/revenue!/);
    }
  });

  it('handles empty string', () => {
    const result = correctTypos('');
    expect(result.wasCorrected).toBe(false);
    expect(result.corrected).toBe('');
  });
});

describe('addToDictionary', () => {
  it('adds words so they are no longer corrected', () => {
    // "kubernetes" is not in the default dictionary
    const before = correctTypos('kuberntes');
    // After adding it, "kuberntes" should not match "kubernetes" (distance may be > 2)
    addToDictionary(['kubernetes']);
    // Now "kubernetes" itself should pass through unchanged
    const after = correctTypos('kubernetes');
    expect(after.wasCorrected).toBe(false);
    expect(after.corrected).toBe('kubernetes');
  });

  it('handles case insensitivity', () => {
    addToDictionary(['CustomWord']);
    const result = correctTypos('customword');
    expect(result.wasCorrected).toBe(false);
  });
});
