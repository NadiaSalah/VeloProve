/**
 * Security-related Twin surface hooks — reuse prior audit/security outputs when present.
 * Does not re-run scanners; attaches OBSERVED/STALE refs only.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { TwinDriftItem } from '../shared/types/project-twin.js';

const CANDIDATES = [
  'security-report.json',
  'security-latest.json',
  'owasp-report.json',
  'audit-report.json',
  'malware-report.json'
];

export function collectSecuritySurfaceHints(veloproveDir: string): {
  items: TwinDriftItem[];
  warnings: string[];
} {
  const items: TwinDriftItem[] = [];
  const warnings: string[] = [];
  if (!fs.existsSync(veloproveDir)) return { items, warnings };

  for (const name of CANDIDATES) {
    const abs = path.join(veloproveDir, name);
    if (!fs.existsSync(abs)) continue;
    let findingCount = 0;
    try {
      const raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as Record<string, unknown>;
      if (Array.isArray(raw.findings)) findingCount = raw.findings.length;
      else if (Array.isArray(raw.issues)) findingCount = raw.issues.length;
      else if (typeof raw.findingCount === 'number') findingCount = raw.findingCount;
    } catch {
      /* unreadable — still note presence */
    }
    items.push({
      category: 'security-surface:prior-report',
      summary: `Prior security artifact ${name} present (${findingCount} finding(s) parsed) — OBSERVED file, not live re-audit`,
      severity: findingCount > 0 ? 'medium' : 'low',
      evidenceClass: 'STALE',
      path: path.join('.veloprove', name)
    });
    warnings.push(
      `Security Twin hook: found ${name}; re-run veloprove security/audit to refresh (Twin does not invent live scores).`
    );
  }

  return { items, warnings };
}
