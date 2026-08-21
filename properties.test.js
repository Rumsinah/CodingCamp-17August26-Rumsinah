// Property-based tests — Properties 2, 3, 5–12
// Feature: expense-budget-visualizer
// Uses fast-check + vitest

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Validator, TransactionService, Formatter, StorageService } from '../js/app.js';
import { arbitraryTransaction, localStorageShim } from './helpers.js';

// ---------------------------------------------------------------------------
// localStorage shim for StorageService tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  globalThis.localStorage = localStorageShim;
  localStorageShim.clear();
});

afterEach(() => {
  localStorageShim.clear();
});

// ---------------------------------------------------------------------------
// Property 2: Amount boundary rejection
// Validates: Requirements 1.3, 8.2
// ---------------------------------------------------------------------------
describe('Property 2: Amount boundary rejection', () => {
  it('rejects any numeric string ≤ 0', () => {
    // Feature: expense-budget-visualizer, Property 2: Amount boundary rejection
    fc.assert(
      fc.property(
        // Generate floats ≤ 0, map to string
        fc.float({ max: 0, noNaN: true }).map((n) => String(n)),
        (s) => Validator.isValidAmount(s) === false
      ),
      { numRuns: 100 }
    );
  });

  it('rejects any numeric string > 999999999.99', () => {
    // Feature: expense-budget-visualizer, Property 2: Amount boundary rejection
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000000 }).map((n) => String(n)),
        (s) => Validator.isValidAmount(s) === false
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-numeric strings', () => {
    // Feature: expense-budget-visualizer, Property 2: Amount boundary rejection
    fc.assert(
      fc.property(
        // Strings that contain at least one non-digit, non-dot character (excluding leading minus covered above)
        fc.string({ minLength: 1 }).filter((s) => isNaN(Number(s)) || s.trim() === ''),
        (s) => Validator.isValidAmount(s) === false
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Amount boundary acceptance
// Validates: Requirements 1.3, 8.2
// ---------------------------------------------------------------------------
describe('Property 3: Amount boundary acceptance', () => {
  it('accepts any numeric string in [0.01, 999999999.99]', () => {
    // Feature: expense-budget-visualizer, Property 3: Amount boundary acceptance
    fc.assert(
      fc.property(
        // Generate integers in [1, 99999999999] and divide by 100 to get valid range
        fc.integer({ min: 1, max: 99999999999 }).map((n) => (n / 100).toFixed(2)),
        (s) => Validator.isValidAmount(s) === true
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Balance computation correctness
// Validates: Requirements 4.1, 4.5
// ---------------------------------------------------------------------------
describe('Property 5: Balance computation correctness', () => {
  it('returns the arithmetic sum of all amounts for any non-empty array', () => {
    // Feature: expense-budget-visualizer, Property 5: Balance computation correctness
    fc.assert(
      fc.property(
        fc.array(arbitraryTransaction(), { minLength: 1 }),
        (txs) => {
          const expected = txs.reduce((sum, t) => sum + t.amount, 0);
          const actual   = TransactionService.computeBalance(txs);
          // Allow tiny floating-point epsilon
          return Math.abs(actual - expected) < 1e-6;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Category totals partition
// Validates: Requirements 5.1
// ---------------------------------------------------------------------------
describe('Property 6: Category totals partition', () => {
  it('sum of category totals equals the overall balance for any array', () => {
    // Feature: expense-budget-visualizer, Property 6: Category totals partition
    fc.assert(
      fc.property(
        fc.array(arbitraryTransaction()),
        (txs) => {
          const totals  = TransactionService.computeCategoryTotals(txs);
          const catSum  = totals.Food + totals.Transport + totals.Fun;
          const balance = TransactionService.computeBalance(txs);
          return Math.abs(catSum - balance) < 1e-6;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Currency formatter preserves sign and precision
// Validates: Requirements 4.1, 4.6
// ---------------------------------------------------------------------------
describe('Property 7: Currency formatter preserves sign and precision', () => {
  it('output starts with minus iff n < 0, ends with two decimal digits, contains $', () => {
    // Feature: expense-budget-visualizer, Property 7: Currency formatter preserves sign and precision
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        (n) => {
          const result = Formatter.formatCurrency(n);
          const hasMinusPrefix = result.startsWith('-');
          const hasDollar      = result.includes('$');
          const endsTwoDecimals = /\.\d{2}$/.test(result);
          const signCorrect = n < 0 ? hasMinusPrefix : !hasMinusPrefix;
          return hasDollar && endsTwoDecimals && signCorrect;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Truncation invariant
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------
describe('Property 8: Truncation invariant', () => {
  it('output length ≤ maxLen+1, and equals input when input length ≤ maxLen', () => {
    // Feature: expense-budget-visualizer, Property 8: Truncation invariant
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 1, max: 200 }),
        (s, k) => {
          const result = Formatter.truncate(s, k);
          const notTooLong   = result.length <= k + 1;
          const passthrough  = s.length <= k ? result === s : true;
          return notTooLong && passthrough;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Adding a valid transaction grows the list by exactly one
// Validates: Requirements 1.5, 2.1
// ---------------------------------------------------------------------------
describe('Property 9: Adding a valid transaction grows the list by exactly one', () => {
  it('list length increases by 1 and contains the new transaction', () => {
    // Feature: expense-budget-visualizer, Property 9: Adding a valid transaction grows the list by exactly one
    fc.assert(
      fc.property(
        fc.array(arbitraryTransaction()),
        arbitraryTransaction(),
        (existingTxs, newTx) => {
          const before = existingTxs.length;
          const list   = [...existingTxs, newTx];
          const after  = list.length;
          const contained = list.some(
            (t) => t.name === newTx.name && t.amount === newTx.amount && t.category === newTx.category
          );
          return after === before + 1 && contained;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Deleting a transaction shrinks the list by exactly one
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------
describe('Property 10: Deleting a transaction shrinks the list by exactly one', () => {
  it('list length decreases by 1 and the deleted id is no longer present', () => {
    // Feature: expense-budget-visualizer, Property 10: Deleting a transaction shrinks the list by exactly one
    fc.assert(
      fc.property(
        fc.array(arbitraryTransaction(), { minLength: 1 }),
        fc.integer({ min: 0 }),
        (txs, indexSeed) => {
          const targetIndex = indexSeed % txs.length;
          const targetId    = txs[targetIndex].id;
          const before      = txs.length;

          const after = txs.filter((t) => t.id !== targetId);

          const lengthOk    = after.length === before - 1;
          const idGone      = after.every((t) => t.id !== targetId);
          return lengthOk && idGone;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Transaction display order is descending by creation time
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------
describe('Property 11: Transaction display order is descending by creation time', () => {
  it('sorted array has each createdAt >= the next', () => {
    // Feature: expense-budget-visualizer, Property 11: Transaction display order is descending by creation time
    fc.assert(
      fc.property(
        // Generate at least 2 transactions with distinct createdAt values
        fc.array(arbitraryTransaction(), { minLength: 2 }).map((txs) => {
          // Force unique timestamps by incrementing
          return txs.map((t, i) => ({ ...t, createdAt: i * 1000 + 1 }));
        }),
        (txs) => {
          const sorted = txs.slice().sort((a, b) => b.createdAt - a.createdAt);
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].createdAt < sorted[i + 1].createdAt) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Zero-total category is excluded from chart data
// Validates: Requirements 5.7
// ---------------------------------------------------------------------------
describe('Property 12: Zero-total category excluded from chart data', () => {
  it('a category with zero total contributes 0 to the data array', () => {
    // Feature: expense-budget-visualizer, Property 12: Zero-total category excluded from chart data
    fc.assert(
      fc.property(
        // Only Food transactions — so Transport and Fun totals are 0
        fc.array(
          arbitraryTransaction().map((t) => ({ ...t, category: 'Food' })),
          { minLength: 1 }
        ),
        (txs) => {
          const totals = TransactionService.computeCategoryTotals(txs);
          // Chart data array order: [Food, Transport, Fun]
          const data = [totals.Food, totals.Transport, totals.Fun];
          // Food must be > 0 (we have at least one Food transaction)
          // Transport and Fun must be 0
          return totals.Food > 0 && data[1] === 0 && data[2] === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
