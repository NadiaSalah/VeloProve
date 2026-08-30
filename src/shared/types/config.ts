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
  security?: {
    enabled?: boolean;
    safeMode?: boolean;
    environment?: 'test' | 'staging' | 'production' | 'local';
    allowProduction?: boolean;
    auth?: {
      enabled?: boolean;
      testRateLimit?: boolean;
      testSessionExpiry?: boolean;
      testPasswordReset?: boolean;
      testJwt?: boolean;
      maxSafeAttempts?: number;
    };
    authorization?: {
      enabled?: boolean;
      testIdor?: boolean;
      testRoles?: boolean;
      testProtectedRoutes?: boolean;
    };
    inputs?: {
      enabled?: boolean;
      sqlInjection?: boolean;
      noSqlInjection?: boolean;
      xss?: boolean;
      htmlInjection?: boolean;
      commandInjection?: boolean;
      pathTraversal?: boolean;
      templateInjection?: boolean;
      crlfInjection?: boolean;
      prototypePollution?: boolean;
    };
    uploads?: {
      enabled?: boolean;
      maxFixtureSizeMb?: number;
    };
  };
}
