export interface QAForgeConfig {
  test?: {
    unit?: 'vitest' | 'jest' | 'none';
    e2e?: 'playwright' | 'none';
    api?: 'native' | 'vitest' | 'playwright';
  };
  browser?: {
    baseURL?: string;
    headless?: boolean;
    browser?: 'chromium' | 'firefox' | 'webkit';
    screenshotOnFailure?: boolean;
    trace?: 'off' | 'on' | 'retain-on-failure';
    video?: 'off' | 'on' | 'retain-on-failure';
  };
  api?: {
    baseURL?: string;
    openApiDoc?: string;
    authType?: 'bearer' | 'apiKey' | 'basic' | 'cookie' | 'none';
    autoAuth?: {
      loginEndpoint: string;
      credentials: Record<string, string>;
      tokenPath: string;
    };
    autoCleanup?: boolean;
  };
  safety?: {
    allowGeneratedTestWrites?: boolean;
    allowTestHealing?: boolean;
    allowSourceWrites?: boolean;
  };
  devServer?: {
    command?: string;
    port?: number;
    healthEndpoint?: string;
    timeoutMs?: number;
    reuseExisting?: boolean;
  };
}
