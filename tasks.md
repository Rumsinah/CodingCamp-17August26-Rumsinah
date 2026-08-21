# Implementation Plan: Expense and Budget Visualizer

## Overview

Implement the Expense and Budget Visualizer as a zero-dependency, single-origin web application consisting of three files: `index.html`, `css/style.css`, and `js/app.js`. All state lives in a module-level array, persisted to `localStorage`. Chart.js is loaded from CDN and degrades gracefully on failure.

---

## Tasks

- [x] 1. Scaffold project files and HTML structure
  - [x] 1.1 Create `index.html` with full semantic HTML structure
    - Add `<header>` with `<h1>` and `#balance-display` inside `#balance-section`
    - Add `<main>` with two columns: `#form-section` (Input_Form) and `#chart-section` (`#chart-canvas`, `#chart-placeholder`)
    - Add `#transaction-section` containing `#transaction-list` (`role="list"`) and `#list-placeholder`
    - Add `#notification-area` with `aria-live="polite"`
    - Add `<link>` to `css/style.css`
    - Add Chart.js CDN `<script>` with `onerror="window.__chartJsFailed = true"` loaded before `js/app.js`
    - Add `<script src="js/app.js">` as last body element
    - _Requirements: 7.1, 7.4_

  - [x] 1.2 Build the Input_Form markup inside `#form-section`
    - `<form id="input-form" novalidate>`
    - `#field-name` (`type="text"`, `maxlength="100"`), `#error-name` (`role="alert"`, `aria-live="polite"`)
    - `#field-amount` (`type="text"`, `inputmode="decimal"`), `#error-amount` (`role="alert"`, `aria-live="polite"`)
    - `#field-category` (`<select>`) with placeholder option and Food / Transport / Fun options, `#error-category` (`role="alert"`, `aria-live="polite"`)
    - Submit button `Add Transaction`
    - _Requirements: 1.1, 1.2, 8.4, 8.5_

  - [x] 1.3 Create `css/style.css` with baseline layout and visual styles
    - Two-column responsive layout for `<main>` (form left, chart right)
    - Scrollable `#transaction-section` with fixed max-height
    - Balance display typography (prominent, top of page)
    - Toast/banner styles for `#notification-area` (fixed position, auto-dismiss class)
    - Category color variables matching `CATEGORY_COLORS` (`#F87171`, `#60A5FA`, `#34D399`)
    - Accessible focus indicators for all interactive elements
    - _Requirements: 2.3, 4.1, 7.2_

  - [x] 1.4 Create `js/app.js` with module-level state, constants, and empty stubs
    - Declare `let transactions = []`
    - Declare `const STORAGE_KEY = 'ebv_transactions'`
    - Declare `const CATEGORY_COLORS` map
    - Create empty object stubs for `Validator`, `StorageService`, `TransactionService`, `Formatter`, `ChartManager`, `NotificationService`
    - Add `DOMContentLoaded` listener calling `init()` (stub)
    - _Requirements: 7.1_

- [x] 2. Implement `Validator`
  - [x] 2.1 Implement `Validator.isValidName`, `Validator.isValidAmount`, `Validator.isValidCategory`, and `Validator.validate`
    - `isValidName`: rejects empty-after-trim and strings > 100 chars
    - `isValidAmount`: accepts numeric strings in `[0.01, 999999999.99]`; rejects zero, negative, non-numeric, out-of-range
    - `isValidCategory`: accepts only `'Food' | 'Transport' | 'Fun'`
    - `validate`: calls all three helpers, returns `{ valid, errors }` object
    - _Requirements: 1.3, 8.1, 8.2, 8.3_

  - [x] 2.2 Write property test — Property 1: Whitespace-only names are invalid
    - **Property 1: Whitespace-only names are invalid**
    - Generator: `fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 })`
    - Assert `Validator.isValidName(s) === false` for all generated strings
    - Tag comment: `// Feature: expense-budget-visualizer, Property 1: Whitespace-only names are invalid`
    - **Validates: Requirements 1.3, 8.1**

- [x] 3. Implement `StorageService`
  - [x] 3.1 Implement `StorageService.load` and `StorageService.save`
    - `load`: wraps `localStorage.getItem` + `JSON.parse` in `try/catch`; validates that result is an array and each entry has `{ id, name, amount, category, createdAt }`; discards corrupt data; returns `{ data, error }`
    - `save`: wraps `localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))` in `try/catch`; catches `QuotaExceededError`; returns `{ success, error }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Implement `TransactionService` and `Formatter`
  - [x] 4.1 Implement `TransactionService.createTransaction`, `computeBalance`, and `computeCategoryTotals`
    - `createTransaction(name, amount, category)`: returns `{ id: crypto.randomUUID(), name, amount: parseFloat(amount), category, createdAt: Date.now() }`
    - `computeBalance(transactions)`: returns arithmetic sum of all `amount` fields; returns `0` for empty array
    - `computeCategoryTotals(transactions)`: returns `{ Food: n, Transport: n, Fun: n }` with each category summed
    - _Requirements: 4.1, 4.5, 5.1_

  - [x] 4.6 Implement `Formatter.formatCurrency`, `formatAmount`, and `truncate`
    - `formatCurrency(n)`: returns `"$x,xxx.xx"` or `"-$x,xxx.xx"` using `Intl.NumberFormat` or equivalent; always two decimal places
    - `formatAmount(n)`: two decimal places, leading minus for negative, no sign for positive
    - `truncate(text, maxLen = 40)`: returns `text` unchanged when `text.length <= maxLen`; returns `text.slice(0, maxLen) + '…'` otherwise
    - _Requirements: 2.2, 4.1, 4.6_

- [x] 5. Checkpoint — core logic verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement `NotificationService` and `ChartManager`
  - [x] 6.1 Implement `NotificationService.warn` and `NotificationService.error`
    - Append a toast `<div>` to `#notification-area` with appropriate ARIA role
    - Auto-dismiss after 4 000 ms using `setTimeout` + element removal
    - `warn` uses a visually distinct warning style; `error` uses an error style
    - _Requirements: 6.4, 6.5, 7.5_

  - [x] 6.2 Implement `ChartManager.render` and `ChartManager.destroy`
    - `render(categoryTotals)`: if `window.__chartJsFailed` is set, show `#chart-placeholder` with "Chart unavailable" and return early
    - On first call, create a new `Chart` instance on `#chart-canvas` with `type: 'pie'`, fixed `CATEGORY_COLORS`, and legend config
    - On subsequent calls, update `chart.data.datasets[0].data` and call `chart.update()` (no destroy/recreate)
    - `destroy()`: call `chart.destroy()`, set `_instance = null`, show `#chart-placeholder` "No data available"
    - _Requirements: 5.2, 5.3, 5.6, 5.7, 7.5_

- [x] 7. Implement UI rendering functions
  - [x] 7.1 Implement `renderBalanceDisplay`
    - Read `transactions` module-level array
    - Call `TransactionService.computeBalance`, format with `Formatter.formatCurrency`
    - Write result to `#balance-display` text content
    - _Requirements: 4.1, 4.5, 4.6_

  - [x] 7.2 Implement `renderTransactionList`
    - Sort a copy of `transactions` descending by `createdAt`
    - If empty: show `#list-placeholder`, empty `#transaction-list`, return
    - Otherwise: hide `#list-placeholder`; for each transaction create a `<li>` with truncated name, formatted amount, category label, and a delete `<button>` with `aria-label="Delete [name]"`
    - Attach `click` listener on each delete button calling the delete handler
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_

  - [x] 7.3 Implement `renderChart`
    - Compute `categoryTotals` via `TransactionService.computeCategoryTotals`
    - If no transactions: call `ChartManager.destroy()` and return
    - Otherwise: call `ChartManager.render(categoryTotals)`
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7_

  - [x] 7.4 Implement `renderAll`
    - Call `renderTransactionList()`, `renderBalanceDisplay()`, `renderChart()` in order
    - _Requirements: 3.4, 3.5, 4.2, 4.3, 5.4, 5.5_

- [x] 8. Implement event wiring and form submit handler
  - [x] 8.1 Implement form submit handler
    - Prevent default form submission
    - Read `#field-name`, `#field-amount`, `#field-category` values
    - Call `Validator.validate`; on failure: write per-field error messages to `#error-name`, `#error-amount`, `#error-category`; return without adding
    - On success: clear error spans; check 1 000-transaction limit — if reached, call `NotificationService.warn` and return
    - Call `TransactionService.createTransaction`, push to `transactions`
    - Call `StorageService.save`; on failure: show `NotificationService.warn`
    - Reset `#field-name`, `#field-amount` to `""` and `#field-category` to placeholder
    - Call `renderAll()`
    - _Requirements: 1.3, 1.4, 1.5, 6.1, 6.5, 6.6, 8.4, 8.5_

  - [x] 8.2 Implement delete handler
    - Accept a transaction `id` parameter
    - Find index in `transactions` array, splice it out
    - Call `StorageService.save`; on failure: revert splice, call `NotificationService.error`, call `renderAll()`, return
    - On success: call `renderAll()`
    - _Requirements: 3.2, 3.3, 6.2_

- [x] 9. Implement `init` and app startup
  - [x] 9.1 Implement the `init` function
    - Call `StorageService.load`
    - If `error` is non-null: call `NotificationService.warn` with a user-friendly message; keep `transactions = []`
    - If `data` is a valid array: assign to `transactions`
    - Attach `submit` listener to `#input-form`
    - Call `renderAll()`
    - _Requirements: 6.3, 6.4, 7.3_

- [x] 10. Checkpoint — full integration verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Accessibility and final wiring review
  - [x] 11.1 Audit and fix all accessibility attributes
    - Verify every `<span role="alert" aria-live="polite">` is present on all error spans
    - Verify `#transaction-list` has `role="list"`
    - Verify `#notification-area` has `aria-live="polite"`
    - Verify every delete `<button>` has `aria-label="Delete [item name]"`
    - Verify keyboard Tab order reaches form fields, submit button, and all delete buttons
    - Verify chart legend uses text labels (not color alone) for category identification
    - _Requirements: 2.2, 3.1, 8.5_

  - [x] 11.2 Wire `DOMContentLoaded` → `init` and do final integration smoke check
    - Confirm `init` is called from `DOMContentLoaded` listener
    - Manually trace add-transaction → persist → reload → restore path through code to verify all branches connect
    - Confirm CDN failure flag (`window.__chartJsFailed`) is checked inside `ChartManager.render` at call time (not at parse time)
    - _Requirements: 6.3, 7.4, 7.5_

- [x] 12. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build.
- Property-based tests require `vitest` and `fast-check` (`npm install --save-dev vitest fast-check`); run with `vitest --run`.
- Each property test must run a minimum of 100 iterations and include a `// Feature: expense-budget-visualizer, Property N: ...` comment tag.
- The `arbitraryTransaction()` helper (returning a `fast-check` arbitrary) should be defined once in a shared test-helper file and reused across all property tests.
- All implementation is plain JavaScript — no TypeScript, no bundler, no framework.
- Chart.js is the only runtime dependency and is loaded exclusively from CDN; no `npm install` for Chart.js.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "4.6"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "3.3", "4.2", "4.3", "4.4", "4.5", "4.7", "4.8", "6.1", "6.2"] },
    { "id": 3, "tasks": ["6.3", "6.4", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 4, "tasks": ["7.5", "7.6", "8.1", "8.2"] },
    { "id": 5, "tasks": ["8.3", "8.4", "9.1"] },
    { "id": 6, "tasks": ["9.2", "11.1", "11.2"] }
  ]
}
```
