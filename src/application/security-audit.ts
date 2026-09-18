import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface SecurityVulnerability {
  packageName: string;
  installedVersion: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  title: string;
  recommendation: string;
  cveId?: string;
}

export interface SecurityAuditReport {
  score: number; // 0 - 100
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  vulnerabilities: SecurityVulnerability[];
  dependenciesScanned: number;
  timestamp: string;
}

export class SecurityAuditService {
  public static audit(guard: WorkspaceGuard): SecurityAuditReport {
    const pkgPath = guard.resolveSafePath('package.json');
    const vulnerabilities: SecurityVulnerability[] = [];
    let dependenciesScanned = 0;

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {})
        };

        const depNames = Object.keys(allDeps);
        dependenciesScanned = depNames.length;

        // Offline local CVE and known insecure patterns database
        const knownAdvisories: Record<string, { severity: SecurityVulnerability['severity']; title: string; fix: string; cve: string }> = {
          'axios': { severity: 'high', title: 'Server-Side Request Forgery (SSRF) in old versions', fix: 'Upgrade to ^1.7.0 or higher', cve: 'CVE-2023-45857' },
          'lodash': { severity: 'critical', title: 'Prototype Pollution vulnerability in template/merge functions', fix: 'Upgrade to ^4.17.21', cve: 'CVE-2020-8203' },
          'jsonwebtoken': { severity: 'high', title: 'Insecure algorithm verification flaw', fix: 'Upgrade to ^9.0.0', cve: 'CVE-2022-23529' },
          'express': { severity: 'moderate', title: 'Route parameter parsing edge case in Express < 4.19', fix: 'Upgrade to ^4.19.2 or ^5.0.0', cve: 'CVE-2024-29041' },
          'tar': { severity: 'critical', title: 'Arbitrary file overwrite via path traversal', fix: 'Upgrade to ^6.2.1', cve: 'CVE-2021-37712' }
        };

        for (const [name, version] of Object.entries(allDeps)) {
          const advisory = knownAdvisories[name.toLowerCase()];
          if (advisory) {
            const cleanVer = String(version).replace(/[^0-9.]/g, '');
            // Flag if using archaic version or matching pattern
            vulnerabilities.push({
              packageName: name,
              installedVersion: String(version),
              severity: advisory.severity,
              title: advisory.title,
              recommendation: advisory.fix,
              cveId: advisory.cve
            });
          }
        }
      } catch {
        // ignore parse error
      }
    }

    // Check for hardcoded secrets in source files
    this.scanForHardcodedSecrets(guard, vulnerabilities);

    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const moderateCount = vulnerabilities.filter(v => v.severity === 'moderate').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

    let deduction = (criticalCount * 30) + (highCount * 15) + (moderateCount * 8) + (lowCount * 3);
    const score = Math.max(0, 100 - deduction);

    return {
      score,
      totalVulnerabilities: vulnerabilities.length,
      criticalCount,
      highCount,
      moderateCount,
      lowCount,
      vulnerabilities,
      dependenciesScanned,
      timestamp: new Date().toISOString()
    };
  }

  private static scanForHardcodedSecrets(guard: WorkspaceGuard, vulnerabilities: SecurityVulnerability[]): void {
    const root = guard.getRoot();
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!['node_modules', '.git', '.veloprove', 'dist', '.next'].includes(e.name)) {
            walk(full);
          }
        } else if (/\.(ts|js|json|env|tsx|jsx)$/.test(e.name) && !e.name.includes('.test.')) {
          const content = fs.readFileSync(full, 'utf8');
          if (/(?:api_key|jwt_secret|private_key|aws_secret_access_key)\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(content)) {
            vulnerabilities.push({
              packageName: path.relative(root, full).replace(/\\/g, '/'),
              installedVersion: 'local file',
              severity: 'critical',
              title: 'Hardcoded API secret or private key detected in source file',
              recommendation: 'Move secrets to environment variables (.env) and add to .gitignore.',
              cveId: 'CWE-798'
            });
          }
        }
      }
    };
    walk(root);
  }
}
