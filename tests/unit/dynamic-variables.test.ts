import { describe, it, expect } from 'vitest';
import { DynamicVariableStore } from '../../src/adapters/api/dynamic-variables.js';

describe('Dynamic Variables & API Extraction', () => {
  it('should interpolate template variables correctly', () => {
    const store = new DynamicVariableStore();
    store.set('orderId', 'ord_12345');
    store.set('userId', 99);

    const interpolated = store.interpolate('https://api.example.com/users/{{userId}}/orders/{{orderId}}');
    expect(interpolated).toBe('https://api.example.com/users/99/orders/ord_12345');
  });

  it('should extract nested JSON paths from response payloads', () => {
    const store = new DynamicVariableStore();
    const responseBody = {
      data: {
        token: 'jwt_abc_xyz',
        user: {
          id: 42,
          email: 'test@example.com'
        }
      }
    };

    store.extractFromResponse(responseBody, {
      AUTH_TOKEN: '$.data.token',
      userId: 'data.user.id'
    });

    expect(store.get('AUTH_TOKEN')).toBe('jwt_abc_xyz');
    expect(store.get('userId')).toBe(42);
  });
});
