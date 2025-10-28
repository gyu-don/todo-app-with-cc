import { describe, it, expect } from 'vitest';
import { jsonResponse, errorResponse } from '../../../src/utils/response';
import { ERROR_CODES } from '../../../src/models/error';

describe('Response Utilities', () => {
  describe('jsonResponse()', () => {
    it('should create response with correct Content-Type header', () => {
      const data = { message: 'Hello' };
      const response = jsonResponse(data, 200);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create response with correct status code', () => {
      const data = { message: 'Created' };
      const response = jsonResponse(data, 201);

      expect(response.status).toBe(201);
    });

    it('should serialize data to JSON', async () => {
      const data = { id: '123', title: 'Test Todo', completed: false };
      const response = jsonResponse(data, 200);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    it('should handle array data', async () => {
      const data = [
        { id: '1', title: 'Todo 1', completed: false, createdAt: '2025-10-27T10:00:00.000Z' },
        { id: '2', title: 'Todo 2', completed: true, createdAt: '2025-10-27T10:30:00.000Z' },
      ];
      const response = jsonResponse(data, 200);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    it('should handle empty array', async () => {
      const data: any[] = [];
      const response = jsonResponse(data, 200);

      const body = await response.json();
      expect(body).toEqual([]);
    });

    it('should support various status codes', () => {
      const statusCodes = [200, 201, 204, 400, 401, 404, 500];

      statusCodes.forEach((status) => {
        const response = jsonResponse({ test: true }, status);
        expect(response.status).toBe(status);
      });
    });
  });

  describe('errorResponse()', () => {
    it('should create error response with standardized format', async () => {
      const response = errorResponse('VALIDATION_ERROR', 'Invalid input', 400);

      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      });
    });

    it('should set correct Content-Type header', () => {
      const response = errorResponse('NOT_FOUND', 'Todo not found', 404);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should set correct status code', () => {
      const response = errorResponse('UNAUTHORIZED', 'Invalid API key', 401);

      expect(response.status).toBe(401);
    });

    it('should handle VALIDATION_ERROR', async () => {
      const response = errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Title must be between 1 and 500 characters',
        400
      );

      const body = await response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Title');
      expect(response.status).toBe(400);
    });

    it('should handle UNAUTHORIZED error', async () => {
      const response = errorResponse(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid API key',
        401
      );

      const body = await response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(response.status).toBe(401);
    });

    it('should handle NOT_FOUND error', async () => {
      const response = errorResponse(
        ERROR_CODES.NOT_FOUND,
        'Todo item not found',
        404
      );

      const body = await response.json();
      expect(body.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });

    it('should handle METHOD_NOT_ALLOWED error', async () => {
      const response = errorResponse(
        ERROR_CODES.METHOD_NOT_ALLOWED,
        'Method not allowed',
        405
      );

      const body = await response.json();
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
      expect(response.status).toBe(405);
    });

    it('should handle TODO_LIMIT_REACHED error', async () => {
      const response = errorResponse(
        ERROR_CODES.TODO_LIMIT_REACHED,
        'Maximum number of todos (500) reached',
        400
      );

      const body = await response.json();
      expect(body.error.code).toBe('TODO_LIMIT_REACHED');
      expect(response.status).toBe(400);
    });

    it('should handle INTERNAL_ERROR', async () => {
      const response = errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred',
        500
      );

      const body = await response.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('An unexpected error occurred');
      expect(response.status).toBe(500);
    });

    it('should not expose detailed stack traces in error message', async () => {
      const response = errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Internal server error',
        500
      );

      const body = await response.json();
      // エラーメッセージに技術的な詳細（スタックトレース等）が含まれていないことを確認
      expect(body.error.message).not.toContain('at ');
      expect(body.error.message).not.toContain('.ts:');
      expect(body.error.message).not.toContain('Error:');
    });
  });
});
