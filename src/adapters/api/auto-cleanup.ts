import type { DynamicVariableStore } from './dynamic-variables.js';

export interface CleanupAction {
  id: string;
  method: 'DELETE' | 'POST' | 'PUT';
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  description: string;
}

export class AutoCleanupManager {
  private actions: CleanupAction[] = [];

  public registerCleanup(action: CleanupAction): void {
    this.actions.push(action);
  }

  public async executeCleanup(variableStore: DynamicVariableStore): Promise<{ total: number; succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    // Execute in reverse order of creation
    const pending = [...this.actions].reverse();
    this.actions = [];

    for (const action of pending) {
      try {
        const url = variableStore.interpolate(action.url);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(action.headers || {})
        };

        const token = variableStore.get('AUTH_TOKEN');
        if (token && !headers['Authorization']) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, {
          method: action.method,
          headers,
          body: action.body ? JSON.stringify(action.body) : undefined
        });

        if (res.ok || res.status === 404) {
          succeeded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { total: pending.length, succeeded, failed };
  }
}
