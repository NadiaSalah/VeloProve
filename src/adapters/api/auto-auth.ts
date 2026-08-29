import type { QAForgeConfig } from '../../shared/types/config.js';
import type { DynamicVariableStore } from './dynamic-variables.js';

export class AutoAuthManager {
  public static async authenticate(
    config: QAForgeConfig['api'],
    variableStore: DynamicVariableStore
  ): Promise<string | null> {
    if (!config?.autoAuth?.loginEndpoint) {
      return null;
    }

    const { loginEndpoint, credentials, tokenPath } = config.autoAuth;
    const baseURL = config.baseURL || 'http://localhost:3000';
    const targetUrl = loginEndpoint.startsWith('http') ? loginEndpoint : `${baseURL}${loginEndpoint}`;

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!res.ok) {
        console.warn(`[QAForge] Auto-auth failed with HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      const token = (data as any)[tokenPath || 'token'] || (data as any)['access_token'] || (data as any)['jwt'];

      if (token) {
        variableStore.set('AUTH_TOKEN', token);
        variableStore.set('authToken', token);
        return String(token);
      }
    } catch (err) {
      console.warn('[QAForge] Auto-auth request error:', err);
    }

    return null;
  }
}
