export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
export type WorkspaceType = 'npm-workspaces' | 'pnpm-workspaces' | 'yarn-workspaces' | 'turborepo' | 'single';

export type FrameworkType = 
  | 'react' 
  | 'vue' 
  | 'svelte' 
  | 'nextjs' 
  | 'vite' 
  | 'nodejs' 
  | 'express' 
  | 'fastify' 
  | 'nestjs' 
  | 'vanilla'
  | 'custom'
  | string;

export interface CustomFrameworkDefinition {
  frameworkName: string;
  version?: string;
  fileExtensions?: string[];
  routeConvention?: {
    directory?: string;
    pagePattern?: string;
    apiPattern?: string;
    extractRouteFromPath?: boolean;
    routeMethodExtractorRegex?: string;
  };
  componentPattern?: string;
  testRunner?: TestFrameworkType;
  devServer?: {
    command?: string;
    defaultPort?: number;
    urlPattern?: string;
  };
  specialInstructions?: string[];
}

export type TestFrameworkType = 'vitest' | 'jest' | 'playwright' | 'none';

export interface RouteDefinition {
  path: string;
  sourceFile: string;
  type: 'page' | 'api' | 'layout' | 'component';
  isDynamic?: boolean;
  params?: string[];
  authRequired?: boolean;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  sourceFile?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header' | 'body';
    required?: boolean;
    type?: string;
  }>;
  requestBodySchema?: Record<string, unknown>;
  responseSchemas?: Record<string, Record<string, unknown>>;
  authRequired?: boolean;
  authType?: 'bearer' | 'apiKey' | 'basic' | 'cookie' | 'none';
}

export interface SourceModule {
  path: string;
  relativePath: string;
  language: 'typescript' | 'javascript';
  hasTests: boolean;
  imports: string[];
  exports: string[];
  isComponent?: boolean;
  isService?: boolean;
  isStore?: boolean;
  isUtil?: boolean;
}

export interface TestModule {
  path: string;
  relativePath: string;
  runner: TestFrameworkType;
  level: 'unit' | 'integration' | 'e2e' | 'component' | 'api';
  testCount?: number;
  targetedFiles: string[];
}

export interface ApplicationTarget {
  name: string;
  root: string;
  framework: FrameworkType;
  buildTool?: string;
  devCommand?: string;
  defaultPort?: number;
  routes: RouteDefinition[];
  apiEndpoints: ApiEndpoint[];
}

export interface ProjectCapability {
  name: string;
  supported: boolean;
  details?: string;
}

export interface ProjectWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  file?: string;
}

export interface ProjectProfile {
  root: string;
  projectName: string;
  packageManager: PackageManager;
  workspaceType: WorkspaceType;
  languages: ('typescript' | 'javascript')[];
  frameworks: FrameworkType[];
  buildTools: string[];
  testFrameworks: TestFrameworkType[];
  apps: ApplicationTarget[];
  routes: RouteDefinition[];
  apiEndpoints: ApiEndpoint[];
  sourceFiles: SourceModule[];
  testFiles: TestModule[];
  capabilities: ProjectCapability[];
  warnings: ProjectWarning[];
  customFramework?: CustomFrameworkDefinition;
  scanTimestamp: string;
}
