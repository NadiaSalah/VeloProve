import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface DoctorCheckItem {
  id: string;
  category: 'ENVIRONMENT' | 'PROJECT' | 'CONFIG' | 'TEST_RUNNER' | 'MCP' | 'PERMISSIONS';
  status: 'PASS' | 'WARNING' | 'FAIL' | 'INFO';
  title: string;
  message: string;
  remediation?: string;
}

export interface DoctorReport {
  timestamp: string;
  nodeVersion: string;
  platform: string;
  projectRoot: string;
  packageManager: string;
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  verdict: 'HEALTHY' | 'WARNINGS' | 'CRITICAL_ISSUES';
  checks: DoctorCheckItem[];
}

export class DoctorService {
  public static diagnose(guard: WorkspaceGuard): DoctorReport {
    const root = guard.getRoot();
    const checks: DoctorCheckItem[] = [];

    // 1. Node.js version check
    const currentVersion = process.version;
    const majorVersion = parseInt(currentVersion.replace('v', '').split('.')[0], 10);
    if (majorVersion >= 18) {
      checks.push({
        id: 'node-version',
        category: 'ENVIRONMENT',
        status: 'PASS',
        title: 'Node.js Runtime',
        message: `Node.js ${currentVersion} satisfies requirement (>= 18.0.0)`
      });
    } else {
      checks.push({
        id: 'node-version',
        category: 'ENVIRONMENT',
        status: 'FAIL',
        title: 'Node.js Runtime',
        message: `Node.js ${currentVersion} is unsupported (requires >= 18.0.0)`,
        remediation: 'Upgrade Node.js to v18.0.0 or later (https://nodejs.org)'
      });
    }

    // 2. Package manager detection
    let detectedPkgManager = 'npm';
    if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) detectedPkgManager = 'pnpm';
    else if (fs.existsSync(path.join(root, 'yarn.lock'))) detectedPkgManager = 'yarn';
    else if (fs.existsSync(path.join(root, 'bun.lockb')) || fs.existsSync(path.join(root, 'bun.lock'))) detectedPkgManager = 'bun';

    checks.push({
      id: 'package-manager',
      category: 'ENVIRONMENT',
      status: 'PASS',
      title: 'Package Manager',
      message: `Detected package manager: ${detectedPkgManager}`
    });

    // 3. Project package.json check
    const pkgPath = path.join(root, 'package.json');
    let pkgJson: any = null;
    if (fs.existsSync(pkgPath)) {
      try {
        pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        checks.push({
          id: 'package-json',
          category: 'PROJECT',
          status: 'PASS',
          title: 'Project Manifest',
          message: `Found valid package.json for project: "${pkgJson.name || 'unnamed'}"`
        });
      } catch (err: any) {
        checks.push({
          id: 'package-json',
          category: 'PROJECT',
          status: 'FAIL',
          title: 'Project Manifest',
          message: `Corrupted package.json: ${err.message}`,
          remediation: 'Fix JSON syntax errors in package.json'
        });
      }
    } else {
      checks.push({
        id: 'package-json',
        category: 'PROJECT',
        status: 'WARNING',
        title: 'Project Manifest',
        message: 'No package.json found in current directory',
        remediation: 'Run "npm init -y" or "qaforge init" to initialize project'
      });
    }

    // 4. QAForge Config & Storage check
    const configPath = path.join(root, 'qaforge.config.json');
    const qaDir = path.join(root, '.qaforge');
    if (fs.existsSync(configPath)) {
      checks.push({
        id: 'qaforge-config',
        category: 'CONFIG',
        status: 'PASS',
        title: 'QAForge Configuration',
        message: 'qaforge.config.json is present and recognized'
      });
    } else {
      checks.push({
        id: 'qaforge-config',
        category: 'CONFIG',
        status: 'INFO',
        title: 'QAForge Configuration',
        message: 'qaforge.config.json not found (default configuration will be used)',
        remediation: 'Run "npx qaforge init" to scaffold a customized configuration file'
      });
    }

    if (fs.existsSync(qaDir)) {
      checks.push({
        id: 'qaforge-storage',
        category: 'CONFIG',
        status: 'PASS',
        title: 'Local Storage State',
        message: '.qaforge/ state directory is initialized'
      });
    } else {
      checks.push({
        id: 'qaforge-storage',
        category: 'CONFIG',
        status: 'INFO',
        title: 'Local Storage State',
        message: '.qaforge/ state directory will be created automatically on first run'
      });
    }

    // 5. Test framework availability
    const allDeps = {
      ...(pkgJson?.dependencies || {}),
      ...(pkgJson?.devDependencies || {})
    };

    const detectedRunners: string[] = [];
    if (allDeps['vitest']) detectedRunners.push('Vitest');
    if (allDeps['jest']) detectedRunners.push('Jest');
    if (allDeps['@playwright/test'] || allDeps['playwright']) detectedRunners.push('Playwright');

    if (detectedRunners.length > 0) {
      checks.push({
        id: 'test-runners',
        category: 'TEST_RUNNER',
        status: 'PASS',
        title: 'Installed Test Frameworks',
        message: `Found installed test runner(s): ${detectedRunners.join(', ')}`
      });
    } else {
      checks.push({
        id: 'test-runners',
        category: 'TEST_RUNNER',
        status: 'WARNING',
        title: 'Installed Test Frameworks',
        message: 'No test runners (Vitest, Jest, Playwright) detected in dependencies',
        remediation: 'Run "npm install -D vitest @playwright/test" or let "qaforge generate" scaffold tests'
      });
    }

    // 6. MCP Integration configuration check
    const cursorMcp = path.join(root, '.cursor', 'mcp.json');
    const hasCursorMcp = fs.existsSync(cursorMcp);
    if (hasCursorMcp) {
      checks.push({
        id: 'mcp-integration',
        category: 'MCP',
        status: 'PASS',
        title: 'AI Editor MCP Integration',
        message: 'Found .cursor/mcp.json configuration'
      });
    } else {
      checks.push({
        id: 'mcp-integration',
        category: 'MCP',
        status: 'INFO',
        title: 'AI Editor MCP Integration',
        message: 'No local .cursor/mcp.json found (AI agents can connect via stdio: npx qaforge mcp)',
        remediation: 'Add qaforge MCP entry in .cursor/mcp.json or your editor MCP settings'
      });
    }

    // 7. Filesystem write permissions
    try {
      const testFile = path.join(root, '.qaforge-perm-test.tmp');
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);
      checks.push({
        id: 'fs-permissions',
        category: 'PERMISSIONS',
        status: 'PASS',
        title: 'Filesystem Permissions',
        message: 'Workspace directory is writable'
      });
    } catch (err: any) {
      checks.push({
        id: 'fs-permissions',
        category: 'PERMISSIONS',
        status: 'FAIL',
        title: 'Filesystem Permissions',
        message: `Workspace directory write permission check failed: ${err.message}`,
        remediation: 'Verify file permissions for current user in workspace directory'
      });
    }

    const passedCount = checks.filter(c => c.status === 'PASS').length;
    const warningCount = checks.filter(c => c.status === 'WARNING').length;
    const failedCount = checks.filter(c => c.status === 'FAIL').length;

    let verdict: DoctorReport['verdict'] = 'HEALTHY';
    if (failedCount > 0) verdict = 'CRITICAL_ISSUES';
    else if (warningCount > 0) verdict = 'WARNINGS';

    return {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: `${os.platform()} (${os.arch()})`,
      projectRoot: root,
      packageManager: detectedPkgManager,
      totalChecks: checks.length,
      passedCount,
      warningCount,
      failedCount,
      verdict,
      checks
    };
  }
}
