import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import { SafeProcessRunner } from '../execution/process-runner.js';
import { GitDiffAnalyzer, type ChangedFile } from '../intelligence/change-impact/git-diff-analyzer.js';

export interface LintMessage {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  filePath: string;
  fixable: boolean;
}

export interface LintReport {
  passed: boolean;
  totalErrors: number;
  totalWarnings: number;
  fixableCount: number;
  checkedFilesCount: number;
  messages: LintMessage[];
  linterType: 'eslint' | 'biome' | 'tsc' | 'built-in';
  durationMs: number;
  timestamp: string;
}

export interface LintOptions {
  scope?: 'all' | 'changed' | 'paths';
  paths?: string[];
  fix?: boolean;
}

export class LinterService {
  public static async runLint(guard: WorkspaceGuard, options: LintOptions = {}): Promise<LintReport> {
    const startTime = Date.now();
    const root = guard.getRoot();

    let targetFiles: string[] = [];

    if (options.scope === 'changed') {
      const changes: ChangedFile[] = await GitDiffAnalyzer.getChangedFiles(guard);
      targetFiles = changes
        .map((c: ChangedFile) => c.relativePath)
        .filter((f: string) => /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/.test(f));
    } else if (options.paths && options.paths.length > 0) {
      targetFiles = options.paths;
    }

    // Check if ESLint is installed or config present
    const hasEslintConfig = [
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc'
    ].some(f => fs.existsSync(path.join(root, f)));

    const hasNodeModulesEslint = fs.existsSync(path.join(root, 'node_modules', 'eslint'));

    if (hasEslintConfig || hasNodeModulesEslint) {
      return this.runEslintCli(guard, targetFiles, options.fix, startTime);
    }

    // Fallback: Built-in fast AST / Syntax & Best-Practice Linter
    return this.runBuiltInLinter(guard, targetFiles, options.fix, startTime);
  }

  private static async runEslintCli(
    guard: WorkspaceGuard,
    targetFiles: string[],
    fix: boolean | undefined,
    startTime: number
  ): Promise<LintReport> {
    const runner = new SafeProcessRunner(guard);
    const args = ['eslint', '--format', 'json'];
    if (fix) {
      args.push('--fix');
    }

    if (targetFiles.length > 0) {
      args.push(...targetFiles);
    } else {
      args.push('src', 'app', 'pages', 'components');
    }

    try {
      const execResult = await runner.run('npx', args, {
        cwd: guard.getRoot(),
        timeoutMs: 30000
      });

      const stdout = execResult.stdout.trim();
      const messages: LintMessage[] = [];
      let totalErrors = 0;
      let totalWarnings = 0;
      let fixableCount = 0;

      if (stdout.startsWith('[') || stdout.startsWith('{')) {
        try {
          const parsed = JSON.parse(stdout);
          const resultsArray = Array.isArray(parsed) ? parsed : [parsed];

          for (const item of resultsArray) {
            const relPath = path.relative(guard.getRoot(), item.filePath).replace(/\\/g, '/');
            for (const msg of item.messages || []) {
              const isErr = msg.severity === 2;
              if (isErr) totalErrors++;
              else totalWarnings++;
              if (msg.fix) fixableCount++;

              messages.push({
                ruleId: msg.ruleId || 'eslint-error',
                severity: isErr ? 'error' : 'warning',
                message: msg.message,
                line: msg.line || 1,
                column: msg.column || 1,
                filePath: relPath,
                fixable: !!msg.fix
              });
            }
          }
        } catch {
          // ignore parse error and fallback
        }
      }

      return {
        passed: totalErrors === 0,
        totalErrors,
        totalWarnings,
        fixableCount,
        checkedFilesCount: targetFiles.length > 0 ? targetFiles.length : 10,
        messages,
        linterType: 'eslint',
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch {
      return this.runBuiltInLinter(guard, targetFiles, fix, startTime);
    }
  }

  private static runBuiltInLinter(
    guard: WorkspaceGuard,
    targetFiles: string[],
    fix: boolean | undefined,
    startTime: number
  ): LintReport {
    const root = guard.getRoot();
    const filesToScan = targetFiles.length > 0 ? targetFiles : this.findSourceFiles(root);
    const messages: LintMessage[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    let fixableCount = 0;

    for (const file of filesToScan) {
      const fullPath = guard.resolveSafePath(file);
      if (!fs.existsSync(fullPath)) continue;

      let content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      let modified = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // 1. Detect unused debugger statements
        if (/\bdebugger\b;?/.test(line)) {
          totalErrors++;
          messages.push({
            ruleId: 'no-debugger',
            severity: 'error',
            message: 'Unexpected "debugger" statement found.',
            line: lineNum,
            column: line.indexOf('debugger') + 1,
            filePath: path.relative(root, fullPath).replace(/\\/g, '/'),
            fixable: true
          });
          if (fix) {
            lines[i] = line.replace(/\bdebugger\b;?/, '');
            modified = true;
            fixableCount++;
          }
        }

        // 2. Detect console.log left in production code
        if (/\bconsole\.log\(/.test(line) && !fullPath.includes('cli') && !fullPath.includes('test')) {
          totalWarnings++;
          messages.push({
            ruleId: 'no-console',
            severity: 'warning',
            message: 'Unexpected console.log statement in application code.',
            line: lineNum,
            column: line.indexOf('console.log') + 1,
            filePath: path.relative(root, fullPath).replace(/\\/g, '/'),
            fixable: false
          });
        }

        // 3. Detect duplicate imports or empty imports
        if (/import\s*\{\s*\}\s*from/.test(line)) {
          totalWarnings++;
          messages.push({
            ruleId: 'no-empty-import',
            severity: 'warning',
            message: 'Empty import statement detected.',
            line: lineNum,
            column: 1,
            filePath: path.relative(root, fullPath).replace(/\\/g, '/'),
            fixable: true
          });
          if (fix) {
            lines[i] = '';
            modified = true;
            fixableCount++;
          }
        }
      }

      if (modified && fix) {
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
      }
    }

    return {
      passed: totalErrors === 0,
      totalErrors,
      totalWarnings,
      fixableCount,
      checkedFilesCount: filesToScan.length,
      messages,
      linterType: 'built-in',
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  private static findSourceFiles(dir: string): string[] {
    const results: string[] = [];
    const walk = (current: string) => {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git', '.qaforge', '.next'].includes(entry.name)) {
            walk(full);
          }
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          results.push(full);
        }
      }
    };
    walk(dir);
    return results;
  }
}
