// Unit tests for Validator
// Feature: expense-budget-visualizer

import { describe, it, expect } from 'vitest';
import { Validator } from '../js/app.js';

describe('Validator', () => {

  // ─── isValidName ──────────────────────────────────────────────────────────

  describe('isValidName', () => {
    it('accepts a normal name', () => {
      expect(Validator.isValidName('Coffee')).toBe(true);
    });

    it('accepts a name at exactly 100 chars', () => {
      expect(Validator.isValidName('a'.repeat(100))).toBe(true);
    });

    it('rejects an empty string', () => {
      expect(Validator.isValidName('')).toBe(false);
    });

    it('rejects a name that is 101 chars', () => {
      expect(Validator.isValidName('a'.repeat(101))).toBe(false);
    });

    it('rejects a non-string (number)', () => {
      expect(Validator.isValidName(42)).toBe(false);
    });

    it('rejects null', () => {
      expect(Validator.isValidName(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(Validator.isValidName(undefined)).toBe(false);
    });
  });

  // ─── isValidAmount ────────────────────────────────────────────────────────

  describe('isValidAmount', () => {
    it('accepts the minimum valid amount 0.01', () => {
      expect(Validator.isValidAmount('0.01')).toBe(true);
    });

    it('accepts the maximum valid amount 999999999.99', () => {
      expect(Validator.isValidAmount('999999999.99')).toBe(true);
    });

    it('accepts a mid-range value', () => {
      expect(Validator.isValidAmount('42.50')).toBe(true);
    });

    it('rejects zero', () => {
      expect(Validator.isValidAmount('0')).toBe(false);
    });

    it('rejects zero as 0.00', () => {
      expect(Validator.isValidAmount('0.00')).toBe(false);
    });

    it('rejects a negative value', () => {
      expect(Validator.isValidAmount('-5.00')).toBe(false);
    });

    it('rejects a value exceeding the max (1000000000)', () => {
      expect(Validator.isValidAmount('1000000000')).toBe(false);
    });

    it('rejects a non-numeric string', () => {
      expect(Validator.isValidAmount('abc')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(Validator.isValidAmount('')).toBe(false);
    });

    it('rejects undefined', () => {
      expect(Validator.isValidAmount(undefined)).toBe(false);
    });
  });

  // ─── isValidCategory ──────────────────────────────────────────────────────

  describe('isValidCategory', () => {
    it('accepts Food', () => {
      expect(Validator.isValidCategory('Food')).toBe(true);
    });

    it('accepts Transport', () => {
      expect(Validator.isValidCategory('Transport')).toBe(true);
    });

    it('accepts Fun', () => {
      expect(Validator.isValidCategory('Fun')).toBe(true);
    });

    it('rejects lowercase food', () => {
      expect(Validator.isValidCategory('food')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(Validator.isValidCategory('')).toBe(false);
    });

    it('rejects an unrecognised category', () => {
      expect(Validator.isValidCategory('Shopping')).toBe(false);
    });
  });

  // ─── validate (composite) ─────────────────────────────────────────────────

  describe('validate', () => {
    it('returns valid:true for a fully valid input', () => {
      const result = Validator.validate('Coffee', '4.50', 'Food');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('returns valid:false and errors.name when name is blank', () => {
      const result = Validator.validate('', '4.50', 'Food');
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeTruthy();
    });

    it('returns valid:false and errors.amount when amount is zero', () => {
      const result = Validator.validate('Coffee', '0', 'Food');
      expect(result.valid).toBe(false);
      expect(result.errors.amount).toBeTruthy();
    });

    it('returns valid:false and errors.category when category is empty', () => {
      const result = Validator.validate('Coffee', '4.50', '');
      expect(result.valid).toBe(false);
      expect(result.errors.category).toBeTruthy();
    });

    it('returns all three errors when all fields are invalid', () => {
      const result = Validator.validate('', 'bad', '');
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.amount).toBeTruthy();
      expect(result.errors.category).toBeTruthy();
    });

    it('preserves only the relevant error when exactly one field fails', () => {
      const result = Validator.validate('Coffee', '4.50', 'INVALID');
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeFalsy();
      expect(result.errors.amount).toBeFalsy();
      expect(result.errors.category).toBeTruthy();
    });
  });
});
