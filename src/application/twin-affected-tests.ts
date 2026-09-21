/**
 * Twin-aware affected test selection — expands scope when confidence is low.
 */
import type { ImpactAnalysisResult } from '../intelligence/change-impact/dependency-graph.js';
import type { TwinImpactCertainty, TwinLatestDocument } from '../shared/types/project-twin.js';

export interface AffectedTestPlan {
  paths: string[];
  expandedToAll: boolean;
  rationale: string[];
  certaintyHistogram: Record<TwinImpactCertainty, number>;
  twinUsed: boolean;
}

const LOW_CERTAINTIES: TwinImpactCertainty[] = ['UNKNOWN', 'PROBABLE', 'TRANSITIVE'];

/**
 * Prefer Twin impact facet test targets; fall back to DependencyGraph impacted tests.
 * If Twin confidence is insufficient (many UNKNOWN/PROBABLE or empty), expand to all tests
 * by returning expandedToAll=true (caller should run scope=all).
 */
export function planAffectedTests(
  impact: ImpactAnalysisResult,
  twin: TwinLatestDocument | null,
  allTestPaths: string[]
): AffectedTestPlan {
  const rationale: string[] = [];
  const histogram: Record<TwinImpactCertainty, number> = {
    DIRECT: 0,
    TRANSITIVE: 0,
    CONFIRMED: 0,
    PROBABLE: 0,
    UNKNOWN: 0
  };

  const pathSet = new Set<string>();

  if (twin?.facets.impact?.included) {
    rationale.push('Using Twin impact facet (wraps changed)');
    for (const item of twin.facets.impact.items) {
      histogram[item.certainty] = (histogram[item.certainty] || 0) + 1;
      if (item.targetKind === 'test' && item.targetId.startsWith('test:')) {
        pathSet.add(item.targetId.slice('test:'.length));
      }
    }
  } else {
    rationale.push('No Twin impact facet — using DependencyGraph impactedTestFiles');
    for (const t of impact.impactedTestFiles) pathSet.add(t);
    // Do not invent Twin certainty for graph-only paths (avoids false expand-to-all on small suites).
  }

  // Always include graph impacted tests (union) — never shrink below graph
  for (const t of impact.impactedTestFiles) pathSet.add(t);

  const low =
    histogram.UNKNOWN + histogram.PROBABLE + histogram.TRANSITIVE;
  const high = histogram.CONFIRMED + histogram.DIRECT;
  const empty = pathSet.size === 0 && impact.changedFiles.length > 0;
  const twinCertaintyAvailable = !!twin?.facets.impact?.included;

  let expandedToAll = false;
  if (empty) {
    expandedToAll = true;
    rationale.push(
      'FALLBACK expand: changed files present but no mapped tests — running full suite (correctness > speed)'
    );
  } else if (
    twinCertaintyAvailable &&
    low > high &&
    pathSet.size < Math.max(3, Math.floor(allTestPaths.length * 0.15))
  ) {
    // Low Twin certainty + narrow path set → expand
    expandedToAll = true;
    rationale.push(
      `FALLBACK expand: low Twin certainty (low=${low} high=${high}) with narrow path set (${pathSet.size}) — expand to all`
    );
  } else if (!twin) {
    rationale.push('Twin snapshot missing — graph-only selection (consider `veloprove twin build --with-impact`)');
  } else {
    rationale.push(`Selected ${pathSet.size} test path(s) with Twin+graph union`);
  }

  return {
    paths: expandedToAll ? [...allTestPaths] : [...pathSet],
    expandedToAll,
    rationale,
    certaintyHistogram: histogram,
    twinUsed: !!twin?.facets.impact?.included
  };
}
