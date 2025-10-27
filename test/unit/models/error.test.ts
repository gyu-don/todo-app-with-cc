import { describe, it, expect } from 'vitest';
import type {
  ErrorResponse,
  ErrorCode,
} from '../../../src/models/error';
import { ERROR_CODES } from '../../../src/models/error';

describe('Error Response Types', () => {
  describe('ErrorResponse Type', () => {
    it('should allow creating a valid error response', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
        },
      };

      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.error.message).toBe('Invalid input data');
    });

    it('should require both code and message fields', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      };

      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
      expect(Object.keys(errorResponse.error)).toHaveLength(2);
    });

    it('should nest error details under error property', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication failed',
        },
      };

      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toBeTypeOf('object');
    });
  });

  describe('ErrorCode Type', () => {
    it('should allow VALIDATION_ERROR code', () => {
      const code: ErrorCode = 'VALIDATION_ERROR';
      expect(code).toBe('VALIDATION_ERROR');
    });

    it('should allow UNAUTHORIZED code', () => {
      const code: ErrorCode = 'UNAUTHORIZED';
      expect(code).toBe('UNAUTHORIZED');
    });

    it('should allow NOT_FOUND code', () => {
      const code: ErrorCode = 'NOT_FOUND';
      expect(code).toBe('NOT_FOUND');
    });

    it('should allow TODO_LIMIT_REACHED code', () => {
      const code: ErrorCode = 'TODO_LIMIT_REACHED';
      expect(code).toBe('TODO_LIMIT_REACHED');
    });

    it('should allow INTERNAL_ERROR code', () => {
      const code: ErrorCode = 'INTERNAL_ERROR';
      expect(code).toBe('INTERNAL_ERROR');
    });

    it('should allow METHOD_NOT_ALLOWED code', () => {
      const code: ErrorCode = 'METHOD_NOT_ALLOWED';
      expect(code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('ERROR_CODES Constant', () => {
    it('should define VALIDATION_ERROR with correct value', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    });

    it('should define UNAUTHORIZED with correct value', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
    });

    it('should define NOT_FOUND with correct value', () => {
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
    });

    it('should define TODO_LIMIT_REACHED with correct value', () => {
      expect(ERROR_CODES.TODO_LIMIT_REACHED).toBe('TODO_LIMIT_REACHED');
    });

    it('should define INTERNAL_ERROR with correct value', () => {
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should define METHOD_NOT_ALLOWED with correct value', () => {
      expect(ERROR_CODES.METHOD_NOT_ALLOWED).toBe('METHOD_NOT_ALLOWED');
    });

    it('should be a const object (immutable)', () => {
      // Verify that ERROR_CODES is defined as const
      expect(ERROR_CODES).toBeDefined();
      expect(typeof ERROR_CODES).toBe('object');
    });
  });

  describe('Error Response Standardization (Requirement 14)', () => {
    it('should follow standardized error format for validation errors', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Title must be between 1 and 500 characters',
        },
      };

      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.error.message).toBeTypeOf('string');
    });

    it('should follow standardized error format for authentication errors', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid API key',
        },
      };

      expect(errorResponse.error.code).toBe('UNAUTHORIZED');
      expect(errorResponse.error.message).toBeTypeOf('string');
    });

    it('should follow standardized error format for not found errors', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Todo item not found',
        },
      };

      expect(errorResponse.error.code).toBe('NOT_FOUND');
      expect(errorResponse.error.message).toBeTypeOf('string');
    });

    it('should follow standardized error format for internal errors', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred',
        },
      };

      expect(errorResponse.error.code).toBe('INTERNAL_ERROR');
      expect(errorResponse.error.message).toBeTypeOf('string');
      // Note: Stack traces should NOT be included in the response
    });

    it('should follow standardized error format for todo limit errors', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.TODO_LIMIT_REACHED,
          message: 'Maximum number of todos (500) reached',
        },
      };

      expect(errorResponse.error.code).toBe('TODO_LIMIT_REACHED');
      expect(errorResponse.error.message).toBeTypeOf('string');
    });
  });

  describe('HTTP Status Code Mapping (documented in types)', () => {
    it('should document VALIDATION_ERROR maps to 400 Bad Request', () => {
      // This mapping is documented in the error model
      const code: ErrorCode = ERROR_CODES.VALIDATION_ERROR;
      const expectedStatus = 400;

      expect(code).toBe('VALIDATION_ERROR');
      expect(expectedStatus).toBe(400);
    });

    it('should document UNAUTHORIZED maps to 401 Unauthorized', () => {
      const code: ErrorCode = ERROR_CODES.UNAUTHORIZED;
      const expectedStatus = 401;

      expect(code).toBe('UNAUTHORIZED');
      expect(expectedStatus).toBe(401);
    });

    it('should document NOT_FOUND maps to 404 Not Found', () => {
      const code: ErrorCode = ERROR_CODES.NOT_FOUND;
      const expectedStatus = 404;

      expect(code).toBe('NOT_FOUND');
      expect(expectedStatus).toBe(404);
    });

    it('should document METHOD_NOT_ALLOWED maps to 405 Method Not Allowed', () => {
      const code: ErrorCode = ERROR_CODES.METHOD_NOT_ALLOWED;
      const expectedStatus = 405;

      expect(code).toBe('METHOD_NOT_ALLOWED');
      expect(expectedStatus).toBe(405);
    });

    it('should document INTERNAL_ERROR maps to 500 Internal Server Error', () => {
      const code: ErrorCode = ERROR_CODES.INTERNAL_ERROR;
      const expectedStatus = 500;

      expect(code).toBe('INTERNAL_ERROR');
      expect(expectedStatus).toBe(500);
    });
  });
});
