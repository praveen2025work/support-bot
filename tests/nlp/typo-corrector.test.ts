/**
 * Unit tests for Typo Corrector
 *
 * These tests exercise:
 *   - Correcting common misspellings (e.g., "reveune" -> "revenue")
 *   - Not modifying already correct words
 *   - Handling empty strings
 *   - Preserving punctuation
 *   - Reporting corrections in result
 *   - addToDictionary runtime extension
 */

import { correctTypos, addToDictionary } from '../../services/engine/src/core/nlp/typo-corrector';

// ---------------------------------------------------------------------------
// Mock the logger so corrections don't write to stdout
// ---------------------------------------------------------------------------
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('correctTypos', () => {
  // ── Corrects common misspellings ──────────────────────────────────────

  describe('corrects misspellings', () => {
    it('corrects "reveune" to "revenue"', () => {
      const result = correctTypos('reveune');
      expect(result.corrected).toBe('revenue');
      expect(result.wasCorrected).toBe(true);
    });

    it('corrects "qurey" to "query"', () => {
      const result = correctTypos('qurey');
      expect(result.corrected).toBe('query');
      expect(result.wasCorrected).toBe(true);
    });

    it('corrects "serach" to "search"', () => {
      const result = correctTypos('serach');
      expect(result.corrected).toBe('search');
      expect(result.wasCorrected).toBe(true);
    });

    it('corrects "preformance" to "performance"', () => {
      const result = correctTypos('preformance');
      expect(result.corrected).toBe('performance');
      expect(result.wasCorrected).toBe(true);
    });

    it('corrects misspellings in multi-word input', () => {
      const result = correctTypos('show reveune for last motnh');
      expect(result.corrected).toContain('revenue');
      expect(result.corrected).toContain('month');
      expect(result.wasCorrected).toBe(true);
    });
  });

  // ── Does not modify correct words ─────────────────────────────────────

  describe('does not modify correct words', () => {
    it('leaves "revenue" unchanged', () => {
      const result = correctTypos('revenue');
      expect(result.corrected).toBe('revenue');
      expect(result.wasCorrected).toBe(false);
      expect(result.corrections).toHaveLength(0);
    });

    it('leaves a fully correct sentence unchanged', () => {
      const text = 'show revenue for last month';
      const result = correctTypos(text);
      expect(result.corrected).toBe(text);
      expect(result.wasCorrected).toBe(false);
    });

    it('leaves common short words unchanged', () => {
      const result = correctTypos('the for and in on by');
      expect(result.corrected).toBe('the for and in on by');
      expect(result.wasCorrected).toBe(false);
    });
  });

  // ── Empty and edge-case strings ───────────────────────────────────────

  describe('handles empty and edge-case strings', () => {
    it('handles empty string', () => {
      const result = correctTypos('');
      expect(result.corrected).toBe('');
      expect(result.wasCorrected).toBe(false);
      expect(result.corrections).toHaveLength(0);
    });

    it('handles single character', () => {
      const result = correctTypos('a');
      expect(result.corrected).toBe('a');
      expect(result.wasCorrected).toBe(false);
    });

    it('handles two-character words without correction (too short)', () => {
      const result = correctTypos('hi me my');
      // Two-letter words should not be "corrected" to something else
      expect(result.corrections.filter((c) => c.from.length <= 2)).toHaveLength(0);
    });
  });

  // ── Preserves punctuation ─────────────────────────────────────────────

  describe('preserves punctuation', () => {
    it('preserves trailing punctuation', () => {
      const result = correctTypos('reveune?');
      expect(result.corrected).toBe('revenue?');
      expect(result.wasCorrected).toBe(true);
    });

    it('preserves leading and trailing punctuation', () => {
      const result = correctTypos('"reveune"');
      expect(result.corrected).toBe('"revenue"');
      expect(result.wasCorrected).toBe(true);
    });

    it('preserves commas in multi-word input', () => {
      const result = correctTypos('reveune, saels, and grwoth');
      expect(result.corrected).toContain('revenue,');
      expect(result.corrected).toContain('sales,');
      expect(result.corrected).toContain('growth');
    });
  });

  // ── Reports corrections ───────────────────────────────────────────────

  describe('reports corrections in result', () => {
    it('includes original text', () => {
      const result = correctTypos('reveune');
      expect(result.original).toBe('reveune');
    });

    it('lists each correction with from/to', () => {
      const result = correctTypos('reveune');
      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].from).toBe('reveune');
      expect(result.corrections[0].to).toBe('revenue');
    });

    it('lists multiple corrections', () => {
      const result = correctTypos('show reveune and saels');
      expect(result.corrections.length).toBeGreaterThanOrEqual(2);

      const froms = result.corrections.map((c) => c.from);
      expect(froms).toContain('reveune');
      expect(froms).toContain('saels');
    });

    it('sets wasCorrected=false when no corrections needed', () => {
      const result = correctTypos('show revenue');
      expect(result.wasCorrected).toBe(false);
      expect(result.corrections).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------

describe('addToDictionary', () => {
  it('prevents correction of newly added words', () => {
    // "kubernetes" is not in the default dictionary, but it's long enough
    // it could get "corrected" to something else. Adding it should prevent that.
    addToDictionary(['customword']);

    const result = correctTypos('customword');
    expect(result.wasCorrected).toBe(false);
  });
});
