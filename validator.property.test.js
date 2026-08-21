// Feature: expense-budget-visualizer, Property 1: Whitespace-only names are invalid
// Validates: Requirements 1.3, 8.1

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { Validator } from '../js/app.js';

describe('Validator', () => {
  describe('isValidName', () => {
    it('Property 1: rejects every string composed entirely of whitespace characters', () => {
      // Generator produces strings of length ≥ 1 containing only space, tab, or newline.
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 }),
          (s) => Validator.isValidName(s) === false
        ),
        { numRuns: 100 }
      );
    });
  });
});
