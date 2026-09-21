/**
 * Twin Drift aggregator — wraps existing drift engines (no parallel scanners).
 */
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';
import type { TwinDriftFacet, TwinDriftItem, TwinEvidenceClass } from '../shared/types/project-twin.js';
import { ContractDriftService, type ContractDriftReport } from './contract-drift.js';
import { FeatureParityAuditorService, type FeatureParityReport } from './feature-parity-auditor.js';
import { EnvDriftAuditorService, type EnvDriftReport } from './env-drift-auditor.js';
import { analyzePackageSurface } from './twin-package-surface.js';
import fs from 'node:fs';
import path from 'node:path';

export interface AggregatedDriftReport {
  items: TwinDriftItem[];
  sources: TwinDriftFacet['sources'];
  contract?: ContractDriftReport;
  parity?: FeatureParityReport;
  env?: EnvDriftReport;
  docsStaleHints: number;
  warnings: string[];
}

function sevMap(s: string): TwinDriftItem['severity'] {
  const u = s.toUpperCase();
  if (u === 'CRITICAL' || u === 'HIGH') return 'high';
  if (u === 'MEDIUM' || u === 'WARNING') return 'medium';
  return 'low';
}

/**
 * Scan README/docs for API path mentions that don't appear in profile endpoints (OBSERVED/STALE hints).
 */
export function analyzeDocsDrift(
  projectRoot: string,
  profile: ProjectProfile
): TwinDriftItem[] {
  const items: TwinDriftItem[] = [];
  const docCandidates = ['README.md', 'docs/README.md', 'FEATURES.md', 'docs/FEATURES.md', 'AGENTS.md'];
  const endpointPaths = new Set(
    profile.apiEndpoints.map((e) => e.path.toLowerCase().replace(/\{[^}]+\}/g, ':param'))
  );

  for (const rel of docCandidates) {
    const abs = path.join(projectRoot, rel);
    if (!fs.existsSync(abs)) continue;
    let text = '';
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const apiMentions = text.match(/\/api\/[a-zA-Z0-9_\-/{}.:]+/g) || [];
    for (const mention of apiMentions.slice(0, 40)) {
      const norm = mention.toLowerCase().replace(/\{[^}]+\}/g, ':param');
      const known = [...endpointPaths].some((p) => p === norm || p.includes(norm) || norm.includes(p));
      if (!known && profile.apiEndpoints.length > 0) {
        items.push({
          category: 'runtime-docs:api-mention',
          summary: `Doc ${rel} mentions ${mention} which was not observed in scanned API endpoints`,
          severity: 'low',
          evidenceClass: 'STALE',
          path: rel
        });
      }
    }
  }
  return items;
}

/**
 * Config / env surface nodes as drift-adjacent OBSERVED issues via EnvDriftAuditor.
 */
export function aggregateDrift(options: {
  guard: WorkspaceGuard;
  profile: ProjectProfile;
  requirements: DiscoveredRequirement[];
  includeParity?: boolean;
  includeEnv?: boolean;
  includeDocs?: boolean;
  featureFilter?: string;
}): AggregatedDriftReport {
  const warnings: string[] = [];
  const items: TwinDriftItem[] = [];
  const sources: TwinDriftFacet['sources'] = [];

  const contract = ContractDriftService.detectDrift(options.profile, options.requirements);
  sources.push('contract-drift-wrap');
  for (const d of contract.drifts) {
    items.push({
      category: `runtime-openapi:${d.driftType}`,
      summary: d.description,
      severity: d.severity,
      evidenceClass: 'OBSERVED',
      path: d.endpoint
    });
  }

  let parity: FeatureParityReport | undefined;
  if (options.includeParity !== false) {
    try {
      parity = FeatureParityAuditorService.audit(options.guard);
      sources.push('feature-parity-wrap');
      for (const issue of parity.issues.slice(0, 50)) {
        items.push({
          category: `runtime-ui:${issue.issueType}`,
          summary: issue.description,
          severity: sevMap(issue.severity),
          evidenceClass: 'OBSERVED',
          path: issue.element.file
        });
      }
    } catch (err) {
      warnings.push(`feature-parity skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let env: EnvDriftReport | undefined;
  if (options.includeEnv !== false) {
    try {
      env = EnvDriftAuditorService.audit(options.guard);
      sources.push('env-drift-wrap');
      for (const issue of env.issues.slice(0, 50)) {
        items.push({
          category: `config-env:${issue.type}`,
          summary: issue.message,
          severity: sevMap(issue.severity),
          evidenceClass: issue.type.includes('LEAK') ? 'VERIFIED' : 'OBSERVED',
          path: issue.sourceFile
        });
      }
    } catch (err) {
      warnings.push(`env-drift skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let docsStaleHints = 0;
  if (options.includeDocs !== false) {
    const docsItems = analyzeDocsDrift(options.guard.getRoot(), options.profile);
    if (docsItems.length) {
      sources.push('docs-wrap');
      docsStaleHints = docsItems.length;
      items.push(...docsItems);
    }
  }

  const pkgSurface = analyzePackageSurface(options.guard.getRoot());
  if (pkgSurface.items.length) {
    sources.push('package-exports-wrap');
    items.push(...pkgSurface.items);
  }

  let filtered = items;
  if (options.featureFilter) {
    const q = options.featureFilter.toLowerCase();
    filtered = items.filter(
      (i) =>
        i.summary.toLowerCase().includes(q) ||
        (i.path || '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }

  return {
    items: filtered,
    sources,
    contract,
    parity,
    env,
    docsStaleHints,
    warnings
  };
}

export function toTwinDriftFacet(agg: AggregatedDriftReport): TwinDriftFacet {
  const scoreParts: number[] = [];
  if (agg.contract) scoreParts.push(agg.contract.compatibilityScore);
  if (agg.parity) scoreParts.push(agg.parity.parityScore);
  if (agg.env) scoreParts.push(agg.env.healthScore);
  const compatibilityScore =
    scoreParts.length > 0
      ? Math.round(scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length)
      : undefined;

  return {
    included: true,
    items: agg.items,
    compatibilityScore,
    sources: agg.sources,
    source: agg.sources.join('+')
  };
}

export function markStaleIfFingerprintMismatch(
  items: TwinDriftItem[],
  previousFingerprint: string | undefined,
  currentFingerprint: string
): TwinDriftItem[] {
  if (!previousFingerprint || previousFingerprint === currentFingerprint) return items;
  return [
    {
      category: 'twin:fingerprint',
      summary: `Twin fingerprint changed (${previousFingerprint.slice(0, 8)}… → ${currentFingerprint.slice(0, 8)}…) — prior Twin snapshot is STALE`,
      severity: 'medium',
      evidenceClass: 'STALE' as TwinEvidenceClass
    },
    ...items
  ];
}
