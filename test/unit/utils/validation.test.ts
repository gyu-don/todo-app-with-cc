import { describe, it, expect } from 'vitest';
import {
  validateTodoInput,
  validateId,
  validateTodoCount,
  ValidationResult,
} from '../../../src/utils/validation';
import { TODO_CONSTRAINTS } from '../../../src/models/todo';

describe('Validation Utilities', () => {
  describe('validateTodoInput()', () => {
    describe('Title Validation', () => {
      it('should return valid for valid title', () => {
        const result = validateTodoInput({ title: 'Valid Todo' });

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject when title is missing', () => {
        const result = validateTodoInput({});

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('title');
      });

      it('should reject when title is not a string', () => {
        const result = validateTodoInput({ title: 123 as any });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('string');
      });

      it('should reject when title is empty string', () => {
        const result = validateTodoInput({ title: '' });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty');
      });

      it('should accept title with 1 character (minimum)', () => {
        const result = validateTodoInput({ title: 'a' });

        expect(result.valid).toBe(true);
      });

      it('should accept title with 500 characters (maximum)', () => {
        const title = 'a'.repeat(500);
        const result = validateTodoInput({ title });

        expect(result.valid).toBe(true);
      });

      it('should reject title with 501 characters (exceeds maximum)', () => {
        const title = 'a'.repeat(501);
        const result = validateTodoInput({ title });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('500');
      });

      it('should reject title with control characters (\\x00-\\x1F)', () => {
        const titlesWithControlChars = [
          'Invalid\x00Title', // NULL character
          'Invalid\x01Title', // SOH
          'Invalid\x0ATitle', // Line feed
          'Invalid\x0DTitle', // Carriage return
          'Invalid\x1FTitle', // Unit separator
        ];

        titlesWithControlChars.forEach((title) => {
          const result = validateTodoInput({ title });
          expect(result.valid).toBe(false);
          expect(result.error).toContain('control');
        });
      });

      it('should reject title with DEL character (\\x7F)', () => {
        const result = validateTodoInput({ title: 'Invalid\x7FTitle' });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('control');
      });

      it('should accept title with valid special characters', () => {
        const validTitles = [
          'Todo with spaces',
          'Todo-with-hyphens',
          'Todo_with_underscores',
          'Todo.with.periods',
          'Todo (with parentheses)',
          'Todo 日本語',
          'Todo émojis 🎉',
        ];

        validTitles.forEach((title) => {
          const result = validateTodoInput({ title });
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('Completed Validation', () => {
      it('should accept valid boolean completed value (true)', () => {
        const result = validateTodoInput({
          title: 'Test',
          completed: true,
        });

        expect(result.valid).toBe(true);
      });

      it('should accept valid boolean completed value (false)', () => {
        const result = validateTodoInput({
          title: 'Test',
          completed: false,
        });

        expect(result.valid).toBe(true);
      });

      it('should accept missing completed field (optional)', () => {
        const result = validateTodoInput({ title: 'Test' });

        expect(result.valid).toBe(true);
      });

      it('should reject non-boolean completed value (string)', () => {
        const result = validateTodoInput({
          title: 'Test',
          completed: 'true' as any,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('boolean');
      });

      it('should reject non-boolean completed value (number)', () => {
        const result = validateTodoInput({
          title: 'Test',
          completed: 1 as any,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('boolean');
      });

      it('should reject null completed value', () => {
        const result = validateTodoInput({
          title: 'Test',
          completed: null as any,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('boolean');
      });
    });

    describe('Multiple Field Validation', () => {
      it('should validate both title and completed together', () => {
        const result = validateTodoInput({
          title: 'Valid Todo',
          completed: true,
        });

        expect(result.valid).toBe(true);
      });

      it('should report first validation error when multiple errors exist', () => {
        const result = validateTodoInput({
          title: '', // Invalid: empty
          completed: 'invalid' as any, // Invalid: not boolean
        });

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Edge Cases', () => {
      it('should handle undefined input', () => {
        const result = validateTodoInput(undefined as any);

        expect(result.valid).toBe(false);
      });

      it('should handle null input', () => {
        const result = validateTodoInput(null as any);

        expect(result.valid).toBe(false);
      });

      it('should handle empty object', () => {
        const result = validateTodoInput({});

        expect(result.valid).toBe(false);
        expect(result.error).toContain('title');
      });

      it('should ignore extra fields', () => {
        const result = validateTodoInput({
          title: 'Valid',
          extraField: 'ignored' as any,
        });

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateId()', () => {
    describe('Valid UUID v4', () => {
      it('should accept valid UUID v4 format', () => {
        const validIds = [
          '550e8400-e29b-41d4-a716-446655440000',
          '123e4567-e89b-42d3-a456-426614174000', // Fixed: v4 (4 in version position)
          'c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd',
          '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        ];

        validIds.forEach((id) => {
          expect(validateId(id)).toBe(true);
        });
      });

      it('should accept UUID v4 with uppercase letters', () => {
        expect(validateId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      });

      it('should accept UUID v4 with mixed case', () => {
        expect(validateId('550e8400-E29b-41D4-a716-446655440000')).toBe(true);
      });
    });

    describe('Invalid UUIDs', () => {
      it('should reject UUID with wrong version (not v4)', () => {
        // UUID v1 example (version digit should be 4)
        expect(validateId('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
      });

      it('should reject UUID with invalid variant', () => {
        // Invalid variant (should be 8, 9, a, or b in the 3rd group)
        expect(validateId('550e8400-e29b-41d4-0716-446655440000')).toBe(false);
      });

      it('should reject string that is too short', () => {
        expect(validateId('550e8400-e29b-41d4-a716')).toBe(false);
      });

      it('should reject string that is too long', () => {
        expect(
          validateId('550e8400-e29b-41d4-a716-446655440000-extra')
        ).toBe(false);
      });

      it('should reject UUID without hyphens', () => {
        expect(validateId('550e8400e29b41d4a716446655440000')).toBe(false);
      });

      it('should reject UUID with wrong hyphen positions', () => {
        expect(validateId('550e84-00e29b-41d4a-716446655440000')).toBe(false);
      });

      it('should reject non-hexadecimal characters', () => {
        expect(validateId('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(validateId('')).toBe(false);
      });

      it('should reject random string', () => {
        expect(validateId('not-a-uuid')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle undefined', () => {
        expect(validateId(undefined as any)).toBe(false);
      });

      it('should handle null', () => {
        expect(validateId(null as any)).toBe(false);
      });

      it('should handle number', () => {
        expect(validateId(123 as any)).toBe(false);
      });

      it('should handle object', () => {
        expect(validateId({} as any)).toBe(false);
      });
    });
  });

  describe('validateTodoCount()', () => {
    it('should return valid when count is below limit (0 todos)', () => {
      const result = validateTodoCount(0);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid when count is below limit (1 todo)', () => {
      const result = validateTodoCount(1);

      expect(result.valid).toBe(true);
    });

    it('should return valid when count is below limit (499 todos)', () => {
      const result = validateTodoCount(499);

      expect(result.valid).toBe(true);
    });

    it('should return invalid when count reaches limit (500 todos)', () => {
      const result = validateTodoCount(500);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('500');
      expect(result.error).toContain('limit');
    });

    it('should return invalid when count exceeds limit (501 todos)', () => {
      const result = validateTodoCount(501);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should use TODO_CONSTRAINTS.MAX_TODO_COUNT constant', () => {
      // Verify that the limit is configurable via constants
      expect(TODO_CONSTRAINTS.MAX_TODO_COUNT).toBe(500);

      const result = validateTodoCount(TODO_CONSTRAINTS.MAX_TODO_COUNT);
      expect(result.valid).toBe(false);
    });

    describe('Edge Cases', () => {
      it('should handle negative count', () => {
        const result = validateTodoCount(-1);

        // Negative count is technically valid (no limit reached)
        // In real usage, this shouldn't happen
        expect(result.valid).toBe(true);
      });

      it('should handle very large count', () => {
        const result = validateTodoCount(1000000);

        expect(result.valid).toBe(false);
      });
    });
  });

  describe('ValidationResult Type', () => {
    it('should return correct structure for valid input', () => {
      const result: ValidationResult = validateTodoInput({ title: 'Test' });

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });

    it('should return correct structure for invalid input', () => {
      const result: ValidationResult = validateTodoInput({});

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('error');
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.error).toBe('string');
    });
  });
});
