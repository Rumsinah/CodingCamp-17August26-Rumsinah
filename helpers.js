// Shared test helpers — arbitraryTransaction and localStorage shim
// Feature: expense-budget-visualizer

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// localStorage shim (Node / jsdom has no localStorage)
// ---------------------------------------------------------------------------
export const localStorageShim = (() => {
  let store = {};
  return {
    getItem:    (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

// ---------------------------------------------------------------------------
// arbitraryTransaction — reusable fast-check arbitrary
// ---------------------------------------------------------------------------
const CATEGORIES = ['Food', 'Transport', 'Fun'];

export function arbitraryTransaction() {
  return fc.record({
    id:        fc.uuid(),
    name:      fc.stringOf(
                 fc.char().filter((c) => c.trim().length > 0),
                 { minLength: 1, maxLength: 100 }
               ),
    amount:    fc.integer({ min: 1, max: 99999999999 })
                 .map((n) => parseFloat((n / 100).toFixed(2))),
    category:  fc.constantFrom(...CATEGORIES),
    createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  });
}
