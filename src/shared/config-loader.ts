import fs from 'node:fs';
import path from 'node:path';
import type { QAForgeConfig } from '../shared/types/config.js';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export const DEFAULT_CONFIG: QAForgeConfig = {
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
  devServer: {
    port: 5173,
    healthEndpoint: '/',
    timeoutMs: 30000,
    reuseExisting: true
  }
};

export class ConfigLoader {
  private workspaceGuard: WorkspaceGuard;

  constructor(workspaceGuard: WorkspaceGuard) {
    this.workspaceGuard = workspaceGuard;
  }

  public async loadConfig(): Promise<QAForgeConfig> {
    const root = this.workspaceGuard.getRoot();
    const jsonPath = path.join(root, 'qaforge.config.json');

    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        return this.mergeConfig(DEFAULT_CONFIG, parsed);
      } catch (err) {
        console.warn(`[QAForge] Warning: Failed to parse ${jsonPath}, falling back to defaults`, err);
      }
    }

    return DEFAULT_CONFIG;
  }

  private mergeConfig(defaults: QAForgeConfig, overrides: Partial<QAForgeConfig>): QAForgeConfig {
    return {
      test: { ...defaults.test, ...overrides.test },
      browser: { ...defaults.browser, ...overrides.browser },
      api: { ...defaults.api, ...overrides.api },
      safety: { ...defaults.safety, ...overrides.safety },
      devServer: { ...defaults.devServer, ...overrides.devServer }
    };
  }
}
