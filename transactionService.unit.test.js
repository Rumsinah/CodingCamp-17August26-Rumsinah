// Unit tests for TransactionService and Formatter
// Feature: expense-budget-visualizer

import { describe, it, expect } from 'vitest';
import { TransactionService, Formatter } from '../js/app.js';

// ─── TransactionService ───────────────────────────────────────────────────

describe('TransactionService', () => {

  describe('createTransaction', () => {
    it('returns an object with the given name, amount (parsed float), and category', () => {
      const tx = TransactionService.createTransaction('Coffee', '4.50', 'Food');
      expect(tx.name).toBe('Coffee');
      expect(tx.amount).toBe(4.5);
      expect(tx.category).toBe('Food');
    });

    it('generates a non-empty id string', () => {
      const tx = TransactionService.createTransaction('Bus', '2.00', 'Transport');
      expect(typeof tx.id).toBe('string');
      expect(tx.id.length).toBeGreaterThan(0);
    });

    it('generates unique ids for consecutive calls', () => {
      const tx1 = TransactionService.createTransaction('A', '1.00', 'Fun');
      const tx2 = TransactionService.createTransaction('B', '2.00', 'Fun');
      expect(tx1.id).not.toBe(tx2.id);
    });

    it('sets createdAt as a positive integer', () => {
      const before = Date.now();
      const tx = TransactionService.createTransaction('X', '1.00', 'Food');
      const after = Date.now();
      expect(tx.createdAt).toBeGreaterThanOrEqual(before);
      expect(tx.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('computeBalance', () => {
    it('returns 0 for an empty array', () => {
      expect(TransactionService.computeBalance([])).toBe(0);
    });

    it('returns 0 for null/undefined input', () => {
      expect(TransactionService.computeBalance(null)).toBe(0);
      expect(TransactionService.computeBalance(undefined)).toBe(0);
    });

    it('sums a single-entry array', () => {
      const txs = [{ id: '1', name: 'A', amount: 10, category: 'Food', createdAt: 1 }];
      expect(TransactionService.computeBalance(txs)).toBe(10);
    });

    it('sums multiple amounts', () => {
      const txs = [
        { id: '1', name: 'A', amount: 10.00, category: 'Food',      createdAt: 1 },
        { id: '2', name: 'B', amount: 5.50,  category: 'Transport', createdAt: 2 },
        { id: '3', name: 'C', amount: 3.25,  category: 'Fun',       createdAt: 3 },
      ];
      expect(TransactionService.computeBalance(txs)).toBeCloseTo(18.75);
    });
  });

  describe('computeCategoryTotals', () => {
    it('returns all-zero totals for an empty array', () => {
      expect(TransactionService.computeCategoryTotals([])).toEqual({ Food: 0, Transport: 0, Fun: 0 });
    });

    it('accumulates amounts by category', () => {
      const txs = [
        { id: '1', name: 'A', amount: 10, category: 'Food',      createdAt: 1 },
        { id: '2', name: 'B', amount: 5,  category: 'Transport', createdAt: 2 },
        { id: '3', name: 'C', amount: 3,  category: 'Food',      createdAt: 3 },
      ];
      const totals = TransactionService.computeCategoryTotals(txs);
      expect(totals.Food).toBeCloseTo(13);
      expect(totals.Transport).toBeCloseTo(5);
      expect(totals.Fun).toBe(0);
    });

    it('handles null/undefined input by returning zeros', () => {
      expect(TransactionService.computeCategoryTotals(null)).toEqual({ Food: 0, Transport: 0, Fun: 0 });
    });
  });
});

// ─── Formatter ────────────────────────────────────────────────────────────

describe('Formatter', () => {

  describe('formatCurrency', () => {
    it('formats a positive integer correctly', () => {
      expect(Formatter.formatCurrency(1234)).toBe('$1,234.00');
    });

    it('formats a positive float correctly', () => {
      expect(Formatter.formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('formats zero as $0.00', () => {
      expect(Formatter.formatCurrency(0)).toBe('$0.00');
    });

    it('formats a negative value with leading minus sign', () => {
      const result = Formatter.formatCurrency(-10);
      expect(result).toContain('-');
      expect(result).toContain('$');
    });

    it('always ends with exactly two decimal digits', () => {
      const result = Formatter.formatCurrency(5);
      expect(result).toMatch(/\.\d{2}$/);
    });
  });

  describe('formatAmount', () => {
    it('formats a positive amount without sign', () => {
      expect(Formatter.formatAmount(4.5)).toBe('4.50');
    });

    it('formats zero as 0.00', () => {
      expect(Formatter.formatAmount(0)).toBe('0.00');
    });

    it('formats a negative amount with a leading minus', () => {
      expect(Formatter.formatAmount(-10)).toBe('-10.00');
    });
  });

  describe('truncate', () => {
    it('returns text unchanged when length ≤ maxLen', () => {
      expect(Formatter.truncate('Hello', 10)).toBe('Hello');
    });

    it('returns text unchanged when length equals maxLen exactly', () => {
      expect(Formatter.truncate('abcde', 5)).toBe('abcde');
    });

    it('truncates and appends ellipsis when length > maxLen', () => {
      const result = Formatter.truncate('Hello World', 5);
      expect(result).toBe('Hello\u2026');
      expect(result.length).toBe(6);
    });

    it('uses default maxLen of 40', () => {
      const short = 'a'.repeat(40);
      expect(Formatter.truncate(short)).toBe(short);

      const long = 'a'.repeat(41);
      const result = Formatter.truncate(long);
      expect(result).toBe('a'.repeat(40) + '\u2026');
    });

    it('handles an empty string', () => {
      expect(Formatter.truncate('', 5)).toBe('');
    });
  });
});
