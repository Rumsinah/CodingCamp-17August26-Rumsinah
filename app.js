// =============================================================================
// Expense & Budget Visualizer — js/app.js
// =============================================================================

// ---------------------------------------------------------------------------
// Module-level state and constants
// ---------------------------------------------------------------------------

/** @type {import('./app').Transaction[]} */
let transactions = [];

const STORAGE_KEY = 'ebv_transactions';

/** Fixed color per category — never derived from data */
const CATEGORY_COLORS = {
  Food:      '#F87171',   // red-400
  Transport: '#60A5FA',   // blue-400
  Fun:       '#34D399',   // emerald-400
};

// ---------------------------------------------------------------------------
// Validator
// Pure functions; no DOM access. Returns a structured result object so the
// UI layer can display per-field messages.
// ---------------------------------------------------------------------------

/**
 * @typedef {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }} ValidationResult
 */

const Validator = {
  /**
   * Validates raw form field values before a transaction is created.
   * @param {string} name
   * @param {string} amountRaw  — raw string from <input type="text">
   * @param {string} category
   * @returns {ValidationResult}
   */
  validate(name, amountRaw, category) {
    const errors = {};

    if (!Validator.isValidName(name)) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        errors.name = 'Item name is required.';
      } else {
        errors.name = 'Item name must be 100 characters or fewer.';
      }
    }

    if (!Validator.isValidAmount(amountRaw)) {
      const trimmed = (amountRaw || '').trim();
      if (trimmed === '') {
        errors.amount = 'Amount is required.';
      } else if (isNaN(Number(trimmed)) || trimmed === '') {
        errors.amount = 'Amount must be a valid number.';
      } else {
        const n = parseFloat(trimmed);
        if (n <= 0) {
          errors.amount = 'Amount must be greater than zero.';
        } else if (n < 0.01) {
          errors.amount = 'Amount must be at least 0.01.';
        } else {
          errors.amount = 'Amount must not exceed 999,999,999.99.';
        }
      }
    }

    if (!Validator.isValidCategory(category)) {
      errors.category = 'Please select a valid category (Food, Transport, or Fun).';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Returns true only for strings that are not empty after trimming and ≤ 100 chars.
   * @param {string} name
   * @returns {boolean}
   */
  isValidName(name) {
    if (typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= 100;
  },

  /**
   * Returns true only for numeric values in [0.01, 999999999.99].
   * @param {string} amountRaw
   * @returns {boolean}
   */
  isValidAmount(amountRaw) {
    if (typeof amountRaw !== 'string' && typeof amountRaw !== 'number') return false;
    const trimmed = String(amountRaw).trim();
    if (trimmed === '') return false;
    // Reject strings with characters that aren't part of a plain decimal number
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
    const n = parseFloat(trimmed);
    if (isNaN(n)) return false;
    return n >= 0.01 && n <= 999999999.99;
  },

  /**
   * Returns true only for 'Food' | 'Transport' | 'Fun'.
   * @param {string} category
   * @returns {boolean}
   */
  isValidCategory(category) {
    return category === 'Food' || category === 'Transport' || category === 'Fun';
  },
};

// ---------------------------------------------------------------------------
// StorageService
// Wraps all localStorage access. Catches SecurityError, SyntaxError, and
// QuotaExceededError.
// ---------------------------------------------------------------------------

const StorageService = {
  /**
   * Loads and parses the transaction list from localStorage.
   * Validates that the result is an array and each entry has the required
   * Transaction shape. Discards the entire stored value if corrupt.
   * @returns {{ data: Transaction[] | null, error: string | null }}
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        // Nothing stored yet — not an error
        return { data: [], error: null };
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return { data: null, error: 'Stored data is not a valid transaction list.' };
      }

      // Validate each entry has the required Transaction shape
      const VALID_CATEGORIES = new Set(['Food', 'Transport', 'Fun']);
      for (const entry of parsed) {
        if (
          entry === null ||
          typeof entry !== 'object' ||
          typeof entry.id !== 'string' ||
          typeof entry.name !== 'string' ||
          typeof entry.amount !== 'number' ||
          !VALID_CATEGORIES.has(entry.category) ||
          typeof entry.createdAt !== 'number'
        ) {
          return { data: null, error: 'Stored transaction data is corrupt and could not be loaded.' };
        }
      }

      return { data: parsed, error: null };
    } catch (err) {
      // Covers SecurityError (private-browsing), SyntaxError (corrupt JSON)
      return { data: null, error: 'Could not load saved data: ' + err.message };
    }
  },

  /**
   * Serializes and writes the transaction list to localStorage.
   * Catches QuotaExceededError and other storage errors.
   * @param {Transaction[]} transactions
   * @returns {{ success: boolean, error: string | null }}
   */
  save(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      return { success: true, error: null };
    } catch (err) {
      // Covers QuotaExceededError, SecurityError
      return { success: false, error: 'Could not save data: ' + err.message };
    }
  },
};

// ---------------------------------------------------------------------------
// TransactionService
// Pure business-logic functions over the transaction array.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} name
 * @property {number} amount
 * @property {'Food'|'Transport'|'Fun'} category
 * @property {number} createdAt
 */

const TransactionService = {
  /**
   * Creates a new Transaction object with a generated id and timestamp.
   * @param {string} name
   * @param {string} amount  — raw string; parseFloat applied internally
   * @param {'Food'|'Transport'|'Fun'} category
   * @returns {Transaction}
   */
  createTransaction(name, amount, category) {
    return {
      id: crypto.randomUUID(),
      name,
      amount: parseFloat(amount),
      category,
      createdAt: Date.now(),
    };
  },

  /**
   * Sums all transaction amounts. Returns 0 for an empty array.
   * @param {Transaction[]} transactions
   * @returns {number}
   */
  computeBalance(transactions) {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  },

  /**
   * Aggregates totals per category.
   * @param {Transaction[]} transactions
   * @returns {{ Food: number, Transport: number, Fun: number }}
   */
  computeCategoryTotals(transactions) {
    const totals = { Food: 0, Transport: 0, Fun: 0 };
    if (!transactions) return totals;
    for (const t of transactions) {
      if (t.category in totals) {
        totals[t.category] += t.amount;
      }
    }
    return totals;
  },
};

// ---------------------------------------------------------------------------
// Formatter
// Pure string-formatting utilities.
// ---------------------------------------------------------------------------

const Formatter = {
  /**
   * Formats a number as a currency string, e.g. "$1,234.56" or "-$10.00".
   * @param {number} amount
   * @returns {string}
   */
  formatCurrency(amount) {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  },

  /**
   * Formats amount for list display: two decimal places, leading minus for
   * negative values, no sign for positive values.
   * @param {number} amount
   * @returns {string}
   */
  formatAmount(amount) {
    const abs = Math.abs(amount).toFixed(2);
    return amount < 0 ? `-${abs}` : abs;
  },

  /**
   * Truncates text to maxLen chars with an ellipsis character.
   * Returns text unchanged when text.length <= maxLen.
   * @param {string} text
   * @param {number} [maxLen=40]
   * @returns {string}
   */
  truncate(text, maxLen = 40) {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '\u2026';
  },
};

// ---------------------------------------------------------------------------
// ChartManager
// Holds a reference to the single Chart.js instance; updates in-place to
// avoid animation flash.
// ---------------------------------------------------------------------------

const ChartManager = {
  /** @type {Chart|null} */
  _instance: null,

  /**
   * Creates the pie chart on first call, or updates existing instance.
   * Shows "Chart unavailable" if window.__chartJsFailed is set.
   * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
   */
  render(categoryTotals) {
    const canvas = document.getElementById('chart-canvas');
    const placeholder = document.getElementById('chart-placeholder');

    // CDN failed — show "Chart unavailable" and bail out
    if (window.__chartJsFailed) {
      placeholder.textContent = 'Chart unavailable';
      placeholder.hidden = false;
      canvas.hidden = true;
      return;
    }

    // Normal path — hide placeholder, show canvas
    placeholder.hidden = true;
    canvas.hidden = false;

    const data = [categoryTotals.Food, categoryTotals.Transport, categoryTotals.Fun];

    if (this._instance === null) {
      // First call — create a new Chart instance
      this._instance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: ['Food', 'Transport', 'Fun'],
          datasets: [{
            data,
            backgroundColor: [
              CATEGORY_COLORS.Food,
              CATEGORY_COLORS.Transport,
              CATEGORY_COLORS.Fun,
            ],
          }],
        },
        options: {
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                // Always show text labels alongside color swatches —
                // color alone must never be the sole category identifier.
                // Requirement 5.3, 8.5
                usePointStyle: true,
                generateLabels(chart) {
                  // Return all three categories regardless of whether they
                  // have spending data (Requirement 5.3)
                  const categories = ['Food', 'Transport', 'Fun'];
                  return categories.map((cat, i) => ({
                    text: cat,
                    fillStyle: chart.data.datasets[0].backgroundColor[i],
                    strokeStyle: chart.data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i,
                  }));
                },
              },
            },
          },
        },
      });
    } else {
      // Subsequent calls — update in-place to avoid animation flash
      this._instance.data.datasets[0].data = data;
      this._instance.update();
    }
  },

  /**
   * Destroys the Chart.js instance and shows the "No data available"
   * placeholder.
   */
  destroy() {
    if (this._instance !== null) {
      this._instance.destroy();
      this._instance = null;
    }

    const placeholder = document.getElementById('chart-placeholder');
    const canvas = document.getElementById('chart-canvas');

    placeholder.textContent = 'No data available';
    placeholder.hidden = false;
    canvas.hidden = true;
  },
};

// ---------------------------------------------------------------------------
// NotificationService
// Renders non-blocking toast/banner messages. Auto-dismisses after 4 000 ms.
// ---------------------------------------------------------------------------

const NotificationService = {
  /**
   * Displays a non-blocking warning toast.
   * @param {string} message
   */
  warn(message) {
    NotificationService._show(message, 'toast--warn');
  },

  /**
   * Displays a non-blocking error toast.
   * @param {string} message
   */
  error(message) {
    NotificationService._show(message, 'toast--error');
  },

  /**
   * Internal helper — creates, appends, and schedules removal of a toast.
   * @param {string} message
   * @param {string} modifierClass — 'toast--warn' or 'toast--error'
   */
  _show(message, modifierClass) {
    const area = document.getElementById('notification-area');
    if (!area) return;

    const toast = document.createElement('div');
    toast.className = `toast ${modifierClass}`;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;

    area.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  },
};

// ---------------------------------------------------------------------------
// UI rendering functions
// Stateless — read from module-level `transactions`, write to the DOM.
// Calling them is always safe and idempotent for a given state.
// ---------------------------------------------------------------------------

/** Renders the transaction list (or placeholder when empty). */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  const placeholder = document.getElementById('list-placeholder');

  // Clear current list contents
  list.innerHTML = '';

  if (transactions.length === 0) {
    placeholder.hidden = false;
    return;
  }

  placeholder.hidden = true;

  // Sort a copy descending by createdAt (most recent first)
  const sorted = transactions.slice().sort((a, b) => b.createdAt - a.createdAt);

  for (const t of sorted) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = t.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = Formatter.truncate(t.name);

    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = Formatter.formatAmount(t.amount);

    const categorySpan = document.createElement('span');
    categorySpan.className = 'transaction-category';
    categorySpan.textContent = t.category;
    categorySpan.setAttribute('data-category', t.category);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete';
    deleteBtn.setAttribute('aria-label', `Delete ${t.name}`);
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDelete(t.id));

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  }
}

/** Reads total balance and writes to #balance-display. */
function renderBalanceDisplay() {
  const balanceEl = document.getElementById('balance-display');
  const balance = TransactionService.computeBalance(transactions);
  balanceEl.textContent = Formatter.formatCurrency(balance);
}

/**
 * Computes category totals and delegates to ChartManager.
 * Calls ChartManager.destroy() when no transactions exist.
 */
function renderChart() {
  if (transactions.length === 0) {
    ChartManager.destroy();
    return;
  }
  const categoryTotals = TransactionService.computeCategoryTotals(transactions);
  ChartManager.render(categoryTotals);
}

/** Calls renderTransactionList, renderBalanceDisplay, and renderChart in order. */
function renderAll() {
  renderTransactionList();
  renderBalanceDisplay();
  renderChart();
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * Handles Input_Form submission: validates, creates transaction, persists,
 * resets form, re-renders.
 * @param {SubmitEvent} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  // Read field values
  const nameField     = document.getElementById('field-name');
  const amountField   = document.getElementById('field-amount');
  const categoryField = document.getElementById('field-category');

  const name     = nameField.value;
  const amount   = amountField.value;
  const category = categoryField.value;

  // Validate
  const { valid, errors } = Validator.validate(name, amount, category);

  // Write (or clear) per-field error messages
  document.getElementById('error-name').textContent     = errors.name     || '';
  document.getElementById('error-amount').textContent   = errors.amount   || '';
  document.getElementById('error-category').textContent = errors.category || '';

  if (!valid) {
    return; // Stop — do not add a transaction
  }

  // Check 1,000-transaction limit (Requirement 6.6)
  if (transactions.length >= 1000) {
    NotificationService.warn('Storage limit reached: cannot add more than 1,000 transactions.');
    return;
  }

  // Create and add the transaction
  const tx = TransactionService.createTransaction(name, amount, category);
  transactions.push(tx);

  // Persist — warn (but keep in-memory state) if save fails (Requirement 6.5)
  const { success, error } = StorageService.save(transactions);
  if (!success) {
    NotificationService.warn(`Your change could not be saved persistently: ${error}`);
  }

  // Reset form fields (Requirement 1.5)
  nameField.value     = '';
  amountField.value   = '';
  categoryField.value = '';

  // Re-render all regions
  renderAll();
}

/**
 * Handles delete button clicks: removes transaction by id, persists, re-renders.
 * On storage failure: reverts splice, shows error notification.
 * @param {string} id  — id of the transaction to delete
 */
function handleDelete(id) {
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return;

  // Remove the transaction from the in-memory array
  const [removed] = transactions.splice(index, 1);

  // Attempt to persist the updated list
  const result = StorageService.save(transactions);

  if (!result.success) {
    // Revert the splice so in-memory state stays consistent with storage
    transactions.splice(index, 0, removed);
    NotificationService.error('Could not save the deletion. Please try again.');
    renderAll();
    return;
  }

  renderAll();
}

// ---------------------------------------------------------------------------
// App initialisation
// ---------------------------------------------------------------------------

/**
 * Bootstraps the application:
 *  1. Loads transactions from localStorage (warns on failure).
 *  2. Attaches the form submit listener.
 *  3. Calls renderAll().
 */
function init() {
  // 1. Load persisted transactions (Requirement 6.3, 6.4)
  const { data, error } = StorageService.load();
  if (error !== null) {
    NotificationService.warn(`Saved data could not be loaded: ${error}`);
    transactions = [];
  } else if (Array.isArray(data)) {
    transactions = data;
  }

  // 2. Wire the form submit handler
  const form = document.getElementById('input-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // 3. Render initial UI
  renderAll();
}

// Entry point — runs after the DOM is ready.
// Guard prevents ReferenceError when app.js is imported in a Node.js test environment.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

// ---------------------------------------------------------------------------
// ES Module export — safe in browsers using <script type="module">;
// consumed by vitest for property-based tests.
// ---------------------------------------------------------------------------
export { Validator, StorageService, TransactionService, Formatter, ChartManager, NotificationService };
