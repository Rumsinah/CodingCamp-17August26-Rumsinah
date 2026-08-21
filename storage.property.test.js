// Feature: expense-budget-visualizer, Property 4: Transaction list persistence round-trip
// Validates: Requirements 6.1, 6.2, 6.3

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { StorageService } from '../js/app.js';

// ---------------------------------------------------------------------------
// localStorage shim for Node / jsdom environment
// Vitest runs in Node where localStorage is not available. Provide a minimal
// in-memory shim that behaves like the browser API.
// ---------------------------------------------------------------------------
const localStorageShim = (() => {
  let store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

// ---------------------------------------------------------------------------
// Arbitrary: a single valid Transaction object
// ---------------------------------------------------------------------------
const CATEGORIES = ['Food', 'Transport', 'Fun'];

function arbitraryTransaction() {
  return fc.record({
    id: fc.uuid(),
    // Names: at least 1 non-whitespace char, at most 100 chars
    name: fc.stringOf(
      fc.char().filter((c) => c.trim().length > 0),
      { minLength: 1, maxLength: 100 }
    ),
    // Amounts in the valid range [0.01, 999999999.99], serialized as numbers
    amount: fc
      .integer({ min: 1, max: 99999999999 })
      .map((n) => parseFloat((n / 100).toFixed(2))),
    category: fc.constantFrom(...CATEGORIES),
    createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StorageService', () => {
  beforeEach(() => {
    // Install shim on globalThis so StorageService.load/save can access it
    globalThis.localStorage = localStorageShim;
    localStorageShim.clear();
  });

  afterEach(() => {
    localStorageShim.clear();
  });

  describe('Property 4: localStorage round-trip', () => {
    it('serializing with save then loading back produces a deep-equal array', () => {
      // Feature: expense-budget-visualizer, Property 4: Transaction list persistence round-trip
      fc.assert(
        fc.property(
          fc.array(arbitraryTransaction()),
          (txArray) => {
            // Save the array
            const saveResult = StorageService.save(txArray);
            if (!saveResult.success) return false; // save must succeed

            // Load it back
            const loadResult = StorageService.load();
            if (loadResult.error !== null) return false; // load must not error

            const loaded = loadResult.data;
            if (!Array.isArray(loaded)) return false;
            if (loaded.length !== txArray.length) return false;

            // Deep-equal check: every field of every transaction must match
            for (let i = 0; i < txArray.length; i++) {
              const orig = txArray[i];
              const back = loaded[i];
              if (
                back.id !== orig.id ||
                back.name !== orig.name ||
                back.amount !== orig.amount ||
                back.category !== orig.category ||
                back.createdAt !== orig.createdAt
              ) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('load returns an empty array when nothing has been saved', () => {
      const result = StorageService.load();
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('load returns an error for corrupt JSON', () => {
      localStorageShim.setItem('ebv_transactions', '{ not valid json [[[');
      const result = StorageService.load();
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('load discards data that is not an array', () => {
      localStorageShim.setItem('ebv_transactions', JSON.stringify({ key: 'value' }));
      const result = StorageService.load();
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('load discards data where a transaction entry has a missing field', () => {
      const corrupt = [{ id: '1', name: 'Coffee', amount: 4.5 }]; // missing category & createdAt
      localStorageShim.setItem('ebv_transactions', JSON.stringify(corrupt));
      const result = StorageService.load();
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('save returns success:true and load returns the same data', () => {
      const txArray = [
        { id: 'abc', name: 'Lunch', amount: 12.50, category: 'Food', createdAt: 1720000000000 },
      ];
      const saveResult = StorageService.save(txArray);
      expect(saveResult.success).toBe(true);
      expect(saveResult.error).toBeNull();

      const loadResult = StorageService.load();
      expect(loadResult.error).toBeNull();
      expect(loadResult.data).toEqual(txArray);
    });
  });
});
