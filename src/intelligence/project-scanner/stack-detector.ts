import fs from 'node:fs';
import path from 'node:path';
import type { 
  PackageManager, 
  WorkspaceType, 
  FrameworkType, 
  TestFrameworkType,
  ProjectCapability,
  ProjectWarning
} from '../../shared/types/project.js';

export interface StackDetectionResult {
  projectName: string;
  packageManager: PackageManager;
  workspaceType: WorkspaceType;
  languages: ('typescript' | 'javascript')[];
  frameworks: FrameworkType[];
  buildTools: string[];
  testFrameworks: TestFrameworkType[];
  devCommand?: string;
  defaultPort?: number;
  capabilities: ProjectCapability[];
  warnings: ProjectWarning[];
}

export class StackDetector {
  public static detect(projectRoot: string): StackDetectionResult {
    const pkgJsonPath = path.join(projectRoot, 'package.json');
    let pkg: Record<string, any> = {};

    if (fs.existsSync(pkgJsonPath)) {
      try {
        pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      } catch {
        // ignore invalid json
      }
    }

    const dependencies = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    };

    const projectName = pkg.name || path.basename(projectRoot);

    // Package Manager
    let packageManager: PackageManager = 'npm';
    if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
      packageManager = 'yarn';
    } else if (fs.existsSync(path.join(projectRoot, 'bun.lockb')) || fs.existsSync(path.join(projectRoot, 'bun.lock'))) {
      packageManager = 'bun';
    }

    // Workspace / Monorepo
    let workspaceType: WorkspaceType = 'single';
    if (fs.existsSync(path.join(projectRoot, 'pnpm-workspace.yaml'))) {
      workspaceType = 'pnpm-workspaces';
    } else if (pkg.workspaces) {
      workspaceType = packageManager === 'yarn' ? 'yarn-workspaces' : 'npm-workspaces';
    } else if (fs.existsSync(path.join(projectRoot, 'turbo.json'))) {
      workspaceType = 'turborepo';
    }

    // Languages
    const languages: ('typescript' | 'javascript')[] = [];
    if (fs.existsSync(path.join(projectRoot, 'tsconfig.json')) || dependencies['typescript']) {
      languages.push('typescript');
    }
    languages.push('javascript');

    // Frameworks
    const frameworks: FrameworkType[] = [];
    if (dependencies['next']) frameworks.push('nextjs');
    if (dependencies['react'] || dependencies['react-dom']) frameworks.push('react');
    if (dependencies['vue']) frameworks.push('vue');
    if (dependencies['svelte']) frameworks.push('svelte');
    if (dependencies['express']) frameworks.push('express');
    if (dependencies['fastify']) frameworks.push('fastify');
    if (dependencies['@nestjs/core']) frameworks.push('nestjs');
    if (dependencies['vite']) frameworks.push('vite');

    // Check for custom framework definition
    let customDef: any = null;
    const customFrameworkConfig = path.join(projectRoot, 'qaforge.framework.json');
    if (fs.existsSync(customFrameworkConfig)) {
      try {
        customDef = JSON.parse(fs.readFileSync(customFrameworkConfig, 'utf8'));
        if (customDef.frameworkName) {
          frameworks.push(customDef.frameworkName);
        }
      } catch {}
    }

    if (frameworks.length === 0) {
      if (dependencies['node'] || pkg.type === 'module' || pkg.main) {
        frameworks.push('nodejs');
      } else {
        frameworks.push('vanilla');
      }
    }

    // Build tools
    const buildTools: string[] = [];
    if (dependencies['vite']) buildTools.push('vite');
    if (dependencies['webpack']) buildTools.push('webpack');
    if (dependencies['tsup']) buildTools.push('tsup');
    if (dependencies['esbuild']) buildTools.push('esbuild');
    if (dependencies['rollup']) buildTools.push('rollup');

    // Test Frameworks
    const testFrameworks: TestFrameworkType[] = [];
    if (dependencies['vitest']) testFrameworks.push('vitest');
    if (dependencies['jest'] || dependencies['@types/jest']) testFrameworks.push('jest');
    if (dependencies['@playwright/test'] || dependencies['playwright']) testFrameworks.push('playwright');

    // Dev command detection
    const scripts = pkg.scripts || {};
    let devCommand: string | undefined;
    if (scripts.dev) devCommand = 'npm run dev';
    else if (scripts.start) devCommand = 'npm start';

    // Port heuristic
    let defaultPort = 3000;
    if (frameworks.includes('vite')) defaultPort = 5173;
    if (frameworks.includes('nextjs')) defaultPort = 3000;

    // Capabilities
    const capabilities: ProjectCapability[] = [
      {
        name: 'playwright-e2e',
        supported: testFrameworks.includes('playwright') || fs.existsSync(path.join(projectRoot, 'playwright.config.ts')),
        details: 'End-to-End browser testing with accessibility locators and auto-heal'
      },
      {
        name: 'unit-testing',
        supported: testFrameworks.includes('vitest') || testFrameworks.includes('jest'),
        details: 'Fast unit and component testing'
      },
      {
        name: 'api-testing',
        supported: frameworks.includes('express') || frameworks.includes('fastify') || frameworks.includes('nextjs') || frameworks.includes('nodejs'),
        details: 'Contract, CRUD and dynamic integration chain testing'
      }
    ];

    const warnings: ProjectWarning[] = [];
    if (testFrameworks.length === 0) {
      warnings.push({
        code: 'NO_TEST_RUNNER',
        message: 'No test runner (Vitest, Jest, Playwright) detected in dependencies.',
        severity: 'medium'
      });
    }

    return {
      projectName,
      packageManager,
      workspaceType,
      languages,
      frameworks,
      buildTools,
      testFrameworks,
      devCommand,
      defaultPort,
      capabilities,
      warnings
    };
  }
}
