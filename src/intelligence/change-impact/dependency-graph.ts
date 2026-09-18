import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectProfile } from '../../shared/types/project.js';
import { CapabilityRegistry, type CapabilityId } from '../../application/capability-registry.js';

export interface ImpactReason {
  testFile: string;
  reason: string;
  confidence: number;
}

export interface ImpactAnalysisResult {
  changedFiles: string[];
  impactedTestFiles: string[];
  impactedRoutes: string[];
  impactedEndpoints: string[];
  /** Modules/packages inferred from changed paths (monorepo-aware). */
  affectedModules: string[];
  riskScore: number;
  riskAreas: string[];
  recommendedCapabilities: CapabilityId[];
  reasoningEvidence: ImpactReason[];
  selectionNotes: string[];
}

function normalize(p: string): string {
  return p.replace(/\\/g, '/');
}

function detectModule(relPath: string): string | null {
  const n = normalize(relPath);
  const pkgMatch = n.match(/^(packages|apps|services)\/([^/]+)\//);
  if (pkgMatch) return `${pkgMatch[1]}/${pkgMatch[2]}`;
  if (n.startsWith('src/')) return 'src';
  return null;
}

function riskAreasFromChanges(changed: string[], routes: string[], endpoints: string[]): string[] {
  const areas = new Set<string>();
  const joined = changed.join(' ').toLowerCase();
  if (routes.length) areas.add('ui-routes');
  if (endpoints.length) areas.add('api');
  if (/auth|login|session|oauth|jwt|password/.test(joined)) areas.add('auth');
  if (/payment|checkout|billing|stripe/.test(joined)) areas.add('payment');
  if (/schema|migration|prisma|drizzle|sql/.test(joined)) areas.add('database');
  if (/\.(tsx|jsx|vue|svelte|css|scss)$/.test(joined) || /components?\//.test(joined)) areas.add('ui');
  if (/security|csp|cors|csrf/.test(joined)) areas.add('security');
  if (!areas.size && changed.length) areas.add('general');
  return [...areas];
}

/**
 * Lightweight reverse import scan: if a changed file is imported by a test (or by a module a test targets),
 * include that test. Bounded to keep large-repo scans affordable.
 */
function collectImportRelatedTests(
  changedRelPaths: string[],
  profile: ProjectProfile,
  projectRoot: string,
  maxFiles = 400
): ImpactReason[] {
  const reasons: ImpactReason[] = [];
  const changedBases = new Set(
    changedRelPaths.map((c) => path.basename(normalize(c)).replace(/\.[^.]+$/, ''))
  );
  const changedNorm = new Set(changedRelPaths.map(normalize));

  const candidates = profile.testFiles.slice(0, maxFiles);
  for (const test of candidates) {
    const abs = path.join(projectRoot, test.relativePath);
    let content = '';
    try {
      if (!fs.existsSync(abs)) continue;
      const stat = fs.statSync(abs);
      if (stat.size > 512_000) continue;
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    for (const changed of changedNorm) {
      const base = path.basename(changed).replace(/\.[^.]+$/, '');
      // import './foo' or from '../foo' matching changed basename
      const importHit =
        content.includes(base) &&
        (new RegExp(`from\\s+['"][^'"]*${base}['"]`).test(content) ||
          new RegExp(`require\\(\\s*['"][^'"]*${base}['"]`).test(content) ||
          test.targetedFiles?.some((t) => normalize(t) === changed));

      if (importHit || changedBases.has(base) && content.includes(base)) {
        // Prefer stronger signal when import path-like
        const strong = new RegExp(`from\\s+['"][^'"]*${base}['"]`).test(content);
        if (strong || test.targetedFiles?.some((t) => normalize(t) === changed)) {
          reasons.push({
            testFile: test.relativePath,
            reason: strong
              ? `Test imports module related to changed file ${changed}`
              : `Test targets changed file ${changed}`,
            confidence: strong ? 0.85 : 0.7
          });
          break;
        }
      }
    }
  }

  return reasons;
}

export class DependencyGraph {
  public static findImpactedTests(
    changedRelativePaths: string[],
    profile: ProjectProfile,
    projectRoot?: string
  ): ImpactAnalysisResult {
    const impactedTestFiles = new Set<string>();
    const impactedRoutes = new Set<string>();
    const impactedEndpoints = new Set<string>();
    const affectedModules = new Set<string>();
    const reasoningEvidence: ImpactReason[] = [];
    const selectionNotes: string[] = [];

    for (const changed of changedRelativePaths) {
      const changedNorm = normalize(changed);
      const changedBase = path.basename(changedNorm).replace(/\.[^.]+$/, '');
      const mod = detectModule(changedNorm);
      if (mod) affectedModules.add(mod);

      // 1. Check if the changed file is itself a test file
      const selfTest = profile.testFiles.find((t) => normalize(t.relativePath) === changedNorm);
      if (selfTest) {
        impactedTestFiles.add(selfTest.relativePath);
        reasoningEvidence.push({
          testFile: selfTest.relativePath,
          reason: 'Changed file is itself a test',
          confidence: 1
        });
      }

      // 2. Direct unit test matching (e.g. foo.ts -> foo.test.ts or foo.spec.ts)
      for (const test of profile.testFiles) {
        const testBase = path.basename(test.relativePath);
        const targeted = test.targetedFiles?.map(normalize) || [];
        if (testBase.includes(changedBase) || targeted.includes(changedNorm)) {
          impactedTestFiles.add(test.relativePath);
          reasoningEvidence.push({
            testFile: test.relativePath,
            reason: targeted.includes(changedNorm)
              ? `Test metadata targets ${changedNorm}`
              : `Basename match between ${changedBase} and ${testBase}`,
            confidence: targeted.includes(changedNorm) ? 0.9 : 0.65
          });
        }
      }

      // 3. Match against Routes
      for (const route of profile.routes) {
        if (
          normalize(route.sourceFile || '') === changedNorm ||
          changedNorm.includes(route.path.replace(/^\//, ''))
        ) {
          impactedRoutes.add(route.path);
          for (const test of profile.testFiles.filter((t) => t.level === 'e2e')) {
            if (test.relativePath.includes(route.path.replace(/[^a-zA-Z0-9]+/g, '-'))) {
              impactedTestFiles.add(test.relativePath);
              reasoningEvidence.push({
                testFile: test.relativePath,
                reason: `E2E test associated with impacted route ${route.path}`,
                confidence: 0.6
              });
            }
          }
        }
      }

      // 4. Match against Endpoints
      for (const ep of profile.apiEndpoints) {
        if (
          (ep.sourceFile && normalize(ep.sourceFile) === changedNorm) ||
          changedNorm.includes(ep.path.replace(/^\//, ''))
        ) {
          impactedEndpoints.add(`${ep.method} ${ep.path}`);
          for (const test of profile.testFiles.filter((t) => t.level === 'api')) {
            impactedTestFiles.add(test.relativePath);
            reasoningEvidence.push({
              testFile: test.relativePath,
              reason: `API test selected due to endpoint ${ep.method} ${ep.path}`,
              confidence: 0.7
            });
          }
        }
      }
    }

    // 5. Import-aware scan when project root available
    if (projectRoot && changedRelativePaths.length > 0) {
      const importReasons = collectImportRelatedTests(changedRelativePaths, profile, projectRoot);
      for (const r of importReasons) {
        impactedTestFiles.add(r.testFile);
        reasoningEvidence.push(r);
      }
      if (importReasons.length) {
        selectionNotes.push(`Import scan added ${importReasons.length} test relationship(s).`);
      }
    }

    // Calculate risk score based on number of changes & critical paths
    let riskScore = Math.min(100, changedRelativePaths.length * 15);
    if (impactedRoutes.size > 0) riskScore += 20;
    if (impactedEndpoints.size > 0) riskScore += 20;
    const areas = riskAreasFromChanges(
      changedRelativePaths,
      [...impactedRoutes],
      [...impactedEndpoints]
    );
    if (areas.includes('auth') || areas.includes('payment')) riskScore += 15;
    riskScore = Math.min(100, riskScore);

    const recommendedCapabilities = CapabilityRegistry.planForChanges({
      hasChanges: changedRelativePaths.length > 0,
      uiChanged: areas.includes('ui') || areas.includes('ui-routes'),
      apiChanged: areas.includes('api'),
      authChanged: areas.includes('auth')
    });

    if (changedRelativePaths.length > 0 && impactedTestFiles.size === 0) {
      selectionNotes.push('No mapped tests for changed files — callers should fall back to full suite.');
    }

    // Deduplicate reasoning by testFile keeping highest confidence
    const bestReason = new Map<string, ImpactReason>();
    for (const r of reasoningEvidence) {
      const prev = bestReason.get(r.testFile);
      if (!prev || r.confidence > prev.confidence) bestReason.set(r.testFile, r);
    }

    return {
      changedFiles: changedRelativePaths,
      impactedTestFiles: Array.from(impactedTestFiles),
      impactedRoutes: Array.from(impactedRoutes),
      impactedEndpoints: Array.from(impactedEndpoints),
      affectedModules: Array.from(affectedModules),
      riskScore,
      riskAreas: areas,
      recommendedCapabilities,
      reasoningEvidence: Array.from(bestReason.values()),
      selectionNotes
    };
  }
}
