import fs from 'node:fs';
import path from 'node:path';
import type { SourceModule, TestModule, TestFrameworkType } from '../../shared/types/project.js';

export class SourceMapper {
  public static scan(projectRoot: string): { sourceFiles: SourceModule[]; testFiles: TestModule[] } {
    const sourceFiles: SourceModule[] = [];
    const testFiles: TestModule[] = [];

    const searchDirs = ['src', 'app', 'pages', 'components', 'lib', 'utils', 'services', 'tests', '__tests__'];
    const foundDirs = searchDirs
      .map(d => path.join(projectRoot, d))
      .filter(p => fs.existsSync(p));

    // If none of standard dirs exist, search project root (excluding node_modules, dist, etc.)
    const dirsToSearch = foundDirs.length > 0 ? foundDirs : [projectRoot];

    for (const dir of dirsToSearch) {
      this.walkDirectory(dir, projectRoot, sourceFiles, testFiles);
    }

    // Correlate source files with tests
    for (const src of sourceFiles) {
      const base = path.basename(src.relativePath).replace(/\.[^.]+$/, '');
      src.hasTests = testFiles.some(t => {
        const testBase = path.basename(t.relativePath);
        return testBase.includes(base);
      });
    }

    return { sourceFiles, testFiles };
  }

  private static walkDirectory(
    dir: string,
    root: string,
    sourceFiles: SourceModule[],
    testFiles: TestModule[]
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.veloprove', '.next', 'coverage', 'build'].includes(entry.name)) {
          this.walkDirectory(fullPath, root, sourceFiles, testFiles);
        }
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
        const isTest = this.isTestFile(relPath);

        if (isTest) {
          testFiles.push(this.parseTestFile(fullPath, relPath));
        } else {
          sourceFiles.push(this.parseSourceFile(fullPath, relPath));
        }
      }
    }
  }

  private static isTestFile(relativePath: string): boolean {
    return (
      /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(relativePath) ||
      relativePath.includes('__tests__/') ||
      relativePath.startsWith('tests/') ||
      relativePath.startsWith('e2e/')
    );
  }

  private static parseSourceFile(fullPath: string, relativePath: string): SourceModule {
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      // ignore
    }

    const imports = this.extractImports(content);
    const exports = this.extractExports(content);
    const language = fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') ? 'typescript' : 'javascript';

    const isComponent = /\.(tsx|jsx)$/.test(fullPath) || /export\s+(default\s+)?function\s+[A-Z]/.test(content);
    const isService = relativePath.includes('service') || /class\s+\w+Service/.test(content);
    const isStore = relativePath.includes('store') || /create\s*\(/.test(content);
    const isUtil = relativePath.includes('util') || relativePath.includes('helper');

    return {
      path: fullPath,
      relativePath,
      language,
      hasTests: false,
      imports,
      exports,
      isComponent,
      isService,
      isStore,
      isUtil
    };
  }

  private static parseTestFile(fullPath: string, relativePath: string): TestModule {
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      // ignore
    }

    let runner: TestFrameworkType = 'vitest';
    if (content.includes('@playwright/test') || relativePath.includes('e2e')) {
      runner = 'playwright';
    } else if (content.includes('jest') || content.includes('@jest/globals')) {
      runner = 'jest';
    } else if (/from\s+['"]node:test['"]|require\(['"]node:test['"]\)/.test(content)) {
      runner = 'node:test';
    }

    let level: TestModule['level'] = 'unit';
    if (runner === 'playwright') {
      level = 'e2e';
    } else if (relativePath.includes('api') || relativePath.includes('endpoint')) {
      level = 'api';
    } else if (relativePath.includes('integration')) {
      level = 'integration';
    } else if (/\.(tsx|jsx)$/.test(relativePath)) {
      level = 'component';
    }

    const targetedFiles = this.extractTargetedFiles(content, relativePath);

    return {
      path: fullPath,
      relativePath,
      runner,
      level,
      targetedFiles
    };
  }

  private static extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /(?:import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1] || match[2];
      if (imp && !imports.includes(imp)) {
        imports.push(imp);
      }
    }
    return imports;
  }

  private static extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|type|interface|let|var)\s+([A-Za-z0-9_$]+)/g;
    let match: RegExpExecArray | null;
    while ((match = exportRegex.exec(content)) !== null) {
      if (match[1] && !exports.includes(match[1])) {
        exports.push(match[1]);
      }
    }
    return exports;
  }

  private static extractTargetedFiles(content: string, testRelPath: string): string[] {
    const targets: string[] = [];
    const importRegex = /import\s+.*\s+from\s+['"](\.[^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    const testDir = path.dirname(testRelPath);

    while ((match = importRegex.exec(content)) !== null) {
      const targetRel = path.normalize(path.join(testDir, match[1])).replace(/\\/g, '/');
      targets.push(targetRel);
    }
    return targets;
  }
}
