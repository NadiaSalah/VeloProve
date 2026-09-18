import fs from 'node:fs';
import path from 'node:path';
import type { VeloProveConfig } from '../shared/types/config.js';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export const DEFAULT_CONFIG: VeloProveConfig = {
  test: {
    unit: 'vitest',
    e2e: 'playwright',
    api: 'native'
  },
  browser: {
    baseURL: 'http://localhost:5173',
    headless: true,
    browser: 'chromium',
    screenshotOnFailure: true,
    trace: 'retain-on-failure',
    video: 'off'
  },
  api: {
    baseURL: 'http://localhost:3000',
    autoCleanup: true
  },
  safety: {
    allowGeneratedTestWrites: true,
    allowTestHealing: true,
    allowSourceWrites: false
  },
  execution: {
    timeouts: {
      processMs: 120000,
      browserMs: 60000,
      networkMs: 15000,
      aiMs: 60000,
      scannerMs: 180000
    },
    retry: {
      maxAttempts: 2,
      baseDelayMs: 200,
      maxDelayMs: 2000
    },
    concurrency: 4
  },
  cache: {
    inspect: true
  },
  release: {
    blockOn: ['critical-test-failure', 'high-security-finding'],
    require: {
      criticalFlowsPassing: true
    }
  },
  devServer: {
    port: 5173,
    healthEndpoint: '/',
    timeoutMs: 30000,
    reuseExisting: true
  },
  security: {
    enabled: true,
    safeMode: true,
    environment: 'test',
    allowProduction: false,
    allowUnknownRemote: false,
    auth: {
      enabled: true,
      testRateLimit: true,
      testSessionExpiry: true,
      testPasswordReset: true,
      testJwt: true,
      maxSafeAttempts: 5
    },
    authorization: {
      enabled: true,
      testIdor: true,
      testRoles: true,
      testProtectedRoutes: true
    },
    inputs: {
      enabled: true,
      sqlInjection: true,
      noSqlInjection: true,
      xss: true,
      htmlInjection: true,
      commandInjection: true,
      pathTraversal: true,
      templateInjection: true,
      crlfInjection: true,
      prototypePollution: true
    },
    uploads: {
      enabled: true,
      maxFixtureSizeMb: 2
    }
  }
};

export class ConfigLoader {
  private workspaceGuard: WorkspaceGuard;

  constructor(workspaceGuard: WorkspaceGuard) {
    this.workspaceGuard = workspaceGuard;
  }

  public async loadConfig(): Promise<VeloProveConfig> {
    const root = this.workspaceGuard.getRoot();
    const jsonPath = path.join(root, 'veloprove.config.json');

    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        return this.mergeConfig(DEFAULT_CONFIG, parsed);
      } catch (err) {
        console.warn(`[VeloProve] Warning: Failed to parse ${jsonPath}, falling back to defaults`, err);
      }
    }

    return DEFAULT_CONFIG;
  }

  private mergeConfig(defaults: VeloProveConfig, overrides: Partial<VeloProveConfig>): VeloProveConfig {
    return {
      test: { ...defaults.test, ...overrides.test },
      browser: { ...defaults.browser, ...overrides.browser },
      api: { ...defaults.api, ...overrides.api },
      safety: { ...defaults.safety, ...overrides.safety },
      devServer: { ...defaults.devServer, ...overrides.devServer }
    };
  }
}
