// test/unit/handlers/reorder.test.ts
import { describe, it, expect, vi } from 'vitest';
import { reorderHandler } from '../../../src/handlers/reorder';

function createMockContext({ id, newPosition }: { id: string; newPosition: number }) {
  return {
    req: {
      param: vi.fn().mockReturnValue(id),
      json: vi.fn().mockResolvedValue({ newPosition }),
    },
    env: {
      TODO_KV: {},
    },
    json: vi.fn((body, status) => ({ body, status })),
    finalized: false,
    error: undefined,
    event: undefined,
    executionCtx: undefined,
    // Add other required Context properties as needed for type compatibility
  } as any;
}

describe('reorderHandler', () => {
  it('should return 400 for invalid UUID', async () => {
    const c = createMockContext({ id: 'invalid', newPosition: 1 });
    const result = await reorderHandler(c);
    expect(result.status).toBe(400);
    if (result.body && typeof result.body === 'object' && 'error' in result.body) {
      expect(result.body.error).toBe('Invalid todoId format');
    }
  });

  it('should return 400 for invalid newPosition', async () => {
    const c = createMockContext({ id: '550e8400-e29b-41d4-a716-446655440000', newPosition: -1 });
    const result = await reorderHandler(c);
    expect(result.status).toBe(400);
    if (result.body && typeof result.body === 'object' && 'error' in result.body) {
      expect(result.body.error).toBe('Invalid newPosition');
    }
  });

  // More tests can be added for not found, out of range, and success cases
});
