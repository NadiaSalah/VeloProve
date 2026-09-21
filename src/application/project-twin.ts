/**
 * Project Twin builder — composes inspect SSOT + optional impact/drift wraps.
 * Does not invent a parallel scanner.
 */
import path from 'node:path';
import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement, FeatureMap } from '../shared/types/requirements.js';
import type { ImpactAnalysisResult } from '../intelligence/change-impact/dependency-graph.js';
import { InspectCache } from './inspect-cache.js';
import {
  TWIN_SCHEMA_VERSION,
  type TwinDriftFacet,
  type TwinEdge,
  type TwinEvidenceClass,
  type TwinEvidenceRef,
  type TwinImpactCertainty,
  type TwinImpactFacet,
  type TwinImpactItem,
  type TwinInspectResult,
  type TwinLatestDocument,
  type TwinNode
} from '../shared/types/project-twin.js';
import { markStaleIfFingerprintMismatch } from './twin-drift-aggregator.js';
import { analyzePackageSurface } from './twin-package-surface.js';
import { selectTwinAdapters } from './twin-framework-adapters.js';
import {
  createRunId,
  okResult,
  type OperationResult
} from '../shared/types/operation.js';

function ev(
  id: string,
  cls: TwinEvidenceRef['class'],
  summary: string,
  pathHint?: string,
  kind?: string
): TwinEvidenceRef {
  return { id, class: cls, summary, path: pathHint, kind };
}

function buildNodesAndEdges(
  profile: ProjectProfile,
  requirements: DiscoveredRequirement[],
  featureMap: FeatureMap
): { nodes: TwinNode[]; edges: TwinEdge[] } {
  const nodes: TwinNode[] = [];
  const edges: TwinEdge[] = [];

  for (const feature of featureMap.features) {
    const nodeId = `feature:${feature.featureId}`;
    nodes.push({
      id: nodeId,
      kind: 'feature',
      title: feature.title,
      paths: feature.sourceFile ? [feature.sourceFile] : undefined,
      evidence: [
        ev(
          `feat-${feature.featureId}`,
          'OBSERVED',
          `Feature group from FeatureMapBuilder (${feature.useCases.length} use cases)`,
          feature.sourceFile,
          'feature-map'
        )
      ],
      meta: { useCaseCount: feature.useCases.length, description: feature.description }
    });

    if (feature.sourceFile) {
      const srcId = `source:${feature.sourceFile}`;
      edges.push({
        from: nodeId,
        to: srcId,
        kind: 'feature_implements',
        evidenceClass: 'OBSERVED',
        note: 'Feature linked to source via feature map'
      });
    }

    for (const uc of feature.useCases) {
      if (uc.requirementId) {
        edges.push({
          from: nodeId,
          to: `requirement:${uc.requirementId}`,
          kind: 'feature_requires',
          evidenceClass: 'OBSERVED'
        });
      }
    }
  }

  for (const req of requirements) {
    nodes.push({
      id: `requirement:${req.id}`,
      kind: 'requirement',
      title: req.title,
      paths: req.sourceLocation?.file ? [req.sourceLocation.file] : undefined,
      evidence: [
        ev(
          `req-${req.id}`,
          req.source === 'inferred' ? 'INFERRED' : 'OBSERVED',
          `Requirement from ${req.source} (coverage=${req.testCoverageStatus})`,
          req.sourceLocation?.file,
          'requirement'
        )
      ],
      meta: {
        priority: req.priority,
        source: req.source,
        testCoverageStatus: req.testCoverageStatus
      }
    });

    for (const mod of req.relatedModules || []) {
      edges.push({
        from: `requirement:${req.id}`,
        to: `module:${mod}`,
        kind: 'module_contains',
        evidenceClass: 'INFERRED',
        note: 'relatedModules from discovery'
      });
    }
    for (const route of req.relatedRoutes || []) {
      edges.push({
        from: `requirement:${req.id}`,
        to: `route:${route}`,
        kind: 'route_serves',
        evidenceClass: 'OBSERVED'
      });
    }
  }

  for (const src of profile.sourceFiles.slice(0, 2000)) {
    const id = `source:${src.relativePath}`;
    if (!nodes.some((n) => n.id === id)) {
      nodes.push({
        id,
        kind: 'source',
        title: path.basename(src.relativePath),
        paths: [src.relativePath],
        evidence: [ev(`src-${src.relativePath}`, 'VERIFIED', 'Listed by ProjectScanner source map', src.relativePath)]
      });
    }
  }

  for (const test of profile.testFiles.slice(0, 2000)) {
    const id = `test:${test.relativePath}`;
    nodes.push({
      id,
      kind: 'test',
      title: path.basename(test.relativePath),
      paths: [test.relativePath],
      evidence: [
        ev(`test-${test.relativePath}`, 'VERIFIED', `Test file (${test.runner || 'unknown'})`, test.relativePath)
      ],
      meta: { framework: test.runner, level: test.level }
    });

    // Heuristic: basename correlation → PROBABLE feature_tested_by / file link
    const base = path.basename(test.relativePath).replace(/\.(test|spec)\.[^.]+$/i, '');
    for (const src of profile.sourceFiles) {
      const srcBase = path.basename(src.relativePath).replace(/\.[^.]+$/, '');
      if (srcBase && base && (base === srcBase || base.includes(srcBase) || srcBase.includes(base))) {
        edges.push({
          from: `test:${test.relativePath}`,
          to: `source:${src.relativePath}`,
          kind: 'feature_tested_by',
          evidenceClass: 'INFERRED',
          note: 'Basename correlation between test and source'
        });
        break;
      }
    }
  }

  for (const route of profile.routes) {
    const id = `route:${route.path}`;
    nodes.push({
      id,
      kind: 'route',
      title: route.path,
      paths: route.sourceFile ? [route.sourceFile] : undefined,
      evidence: [ev(`route-${route.path}`, 'OBSERVED', `Route (${route.type})`, route.sourceFile)]
    });
    if (route.sourceFile) {
      edges.push({
        from: id,
        to: `source:${route.sourceFile}`,
        kind: 'route_serves',
        evidenceClass: 'OBSERVED'
      });
    }
  }

  for (const ep of profile.apiEndpoints) {
    const id = `endpoint:${ep.method}:${ep.path}`;
    nodes.push({
      id,
      kind: 'endpoint',
      title: `${ep.method} ${ep.path}`,
      paths: ep.sourceFile ? [ep.sourceFile] : undefined,
      evidence: [ev(`ep-${ep.method}-${ep.path}`, 'OBSERVED', 'API endpoint from scanner', ep.sourceFile)]
    });
    if (ep.sourceFile) {
      edges.push({
        from: id,
        to: `source:${ep.sourceFile}`,
        kind: 'endpoint_implements',
        evidenceClass: 'OBSERVED'
      });
    }
  }

  for (const app of profile.apps || []) {
    if (!app.name) continue;
    nodes.push({
      id: `package:${app.name}`,
      kind: 'package',
      title: app.name,
      paths: app.root ? [app.root] : undefined,
      evidence: [ev(`pkg-${app.name}`, 'OBSERVED', 'Workspace package / app from stack detect', app.root)]
    });
  }

  // Cross-package edges (OBSERVED listing order / INFERRED adjacency for workspaces)
  const apps = (profile.apps || []).filter((a) => a.name);
  if (apps.length > 1) {
    for (let i = 0; i < apps.length - 1; i++) {
      edges.push({
        from: `package:${apps[i].name}`,
        to: `package:${apps[i + 1].name}`,
        kind: 'package_depends',
        evidenceClass: 'INFERRED',
        note: 'Workspace package adjacency — deepen with lockfile/workspace graph later'
      });
    }
  }

  // Consumer package.json surface (bin/exports/scripts) — target project, not VeloProve catalog
  const pkgSurface = analyzePackageSurface(profile.root);
  for (const n of pkgSurface.nodes) {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
  }

  // Framework adapter hooks (JS/TS first) — optional enrich
  for (const adapter of selectTwinAdapters(profile)) {
    if (!adapter.enrich) continue;
    const extra = adapter.enrich(profile, profile.root);
    for (const n of extra.nodes || []) {
      if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
    }
    edges.push(...(extra.edges || []));
  }

  return { nodes, edges };
}

function mapImpactCertainty(confidence: number, directFileHit: boolean): TwinImpactCertainty {
  if (directFileHit && confidence >= 0.85) return 'CONFIRMED';
  if (directFileHit) return 'DIRECT';
  if (confidence >= 0.7) return 'PROBABLE';
  if (confidence >= 0.4) return 'TRANSITIVE';
  return 'UNKNOWN';
}

export function buildImpactFacet(impact: ImpactAnalysisResult): TwinImpactFacet {
  const items: TwinImpactItem[] = [];
  const changedSet = new Set(impact.changedFiles.map((c) => c.replace(/\\/g, '/')));

  for (const t of impact.impactedTestFiles) {
    const reason = impact.reasoningEvidence.find((r) => r.testFile === t);
    const conf = reason?.confidence ?? 0.5;
    // High-confidence graph hits count as direct (CONFIRMED/DIRECT); never invent certainty.
    const directHit = conf >= 0.85;
    items.push({
      targetId: `test:${t}`,
      targetKind: 'test',
      certainty: mapImpactCertainty(conf, directHit),
      reason: reason?.reason || 'Impacted test from DependencyGraph',
      confidence: conf
    });
  }

  for (const f of impact.changedFiles) {
    items.push({
      targetId: `source:${f}`,
      targetKind: 'source',
      certainty: 'DIRECT',
      reason: 'File changed in git working tree',
      confidence: 1
    });
  }

  for (const route of impact.impactedRoutes) {
    items.push({
      targetId: `route:${route}`,
      targetKind: 'route',
      certainty: 'PROBABLE',
      reason: 'Route path overlaps changed areas',
      confidence: 0.6
    });
  }

  for (const ep of impact.impactedEndpoints) {
    items.push({
      targetId: `endpoint:${ep}`,
      targetKind: 'endpoint',
      certainty: 'PROBABLE',
      reason: 'Endpoint overlaps changed areas',
      confidence: 0.6
    });
  }

  for (const mod of impact.affectedModules) {
    items.push({
      targetId: `module:${mod}`,
      targetKind: 'module',
      certainty: changedSet.size ? 'DIRECT' : 'UNKNOWN',
      reason: 'Module inferred from changed paths',
      confidence: 0.8
    });
  }

  return {
    included: true,
    changedFiles: impact.changedFiles,
    items,
    riskScore: impact.riskScore,
    riskAreas: impact.riskAreas,
    selectionNotes: impact.selectionNotes || [],
    source: 'changed-wrap'
  };
}

export class ProjectTwinService {
  public static assemble(
    projectRoot: string,
    profile: ProjectProfile,
    requirements: DiscoveredRequirement[],
    featureMap: FeatureMap,
    options: {
      impact?: ImpactAnalysisResult | null;
      driftFacet?: TwinDriftFacet | null;
      warnings?: string[];
      /** Prior Twin — when fingerprint mismatches, drift items get a STALE marker. */
      previousTwin?: TwinLatestDocument | null;
      /** Reuse prior nodes/edges when fingerprint unchanged (incremental). */
      reuseGraph?: boolean;
      gitHead?: string;
    } = {}
  ): TwinLatestDocument {
    const fingerprint = InspectCache.fingerprint(projectRoot);
    const warnings = [...(options.warnings || [])];

    let nodes: TwinNode[];
    let edges: TwinEdge[];
    if (
      options.reuseGraph &&
      options.previousTwin &&
      options.previousTwin.fingerprint === fingerprint
    ) {
      nodes = options.previousTwin.nodes;
      edges = options.previousTwin.edges;
      warnings.push('Incremental Twin: reused graph nodes/edges (fingerprint unchanged).');
    } else {
      ({ nodes, edges } = buildNodesAndEdges(profile, requirements, featureMap));
    }

    const facets: TwinLatestDocument['facets'] = {};
    if (options.impact) {
      facets.impact = buildImpactFacet(options.impact);
    }
    if (options.driftFacet) {
      const withStale = {
        ...options.driftFacet,
        items: markStaleIfFingerprintMismatch(
          options.driftFacet.items,
          options.previousTwin?.fingerprint,
          fingerprint
        )
      };
      facets.drift = withStale;
      if (withStale.items.length === 0) {
        warnings.push(
          'Drift facet included but no drift items found across wrapped engines — score may be vacuous.'
        );
      }
    }

    if (
      options.previousTwin?.buildContext?.gitHead &&
      options.gitHead &&
      options.previousTwin.buildContext.gitHead !== options.gitHead
    ) {
      warnings.push(
        `Branch/HEAD changed since prior Twin (${options.previousTwin.buildContext.gitHead.slice(0, 8)}… → ${options.gitHead.slice(0, 8)}…) — prefer full rebuild.`
      );
    }

    warnings.push(
      'Project Twin MVP: composition over inspect SSOT. INFERRED edges (e.g. basename test↔source) are not confirmed facts.'
    );

    return {
      schemaVersion: TWIN_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      projectRoot,
      fingerprint,
      refs: {
        projectProfile: '.veloprove/project-profile.json',
        requirements: '.veloprove/requirements.json',
        featureMap: '.veloprove/feature-map.json'
      },
      summary: {
        features: featureMap.features.length,
        sourceFiles: profile.sourceFiles.length,
        testFiles: profile.testFiles.length,
        routes: profile.routes.length,
        apiEndpoints: profile.apiEndpoints.length,
        requirements: requirements.length,
        frameworks: profile.frameworks || [],
        workspaceType: profile.workspaceType,
        packageManager: profile.packageManager
      },
      buildContext: options.gitHead ? { gitHead: options.gitHead } : undefined,
      nodes,
      edges,
      facets,
      warnings
    };
  }

  public static toOperationResult(twin: TwinLatestDocument): OperationResult<TwinLatestDocument> {
    const warnings = twin.warnings.map((message) => ({
      code: 'TWIN_HONESTY',
      message
    }));
    const evidenceClasses = ProjectTwinService.summarizeEvidenceClasses(twin);
    return okResult('twin.build', twin, {
      warnings,
      runId: createRunId('twin'),
      evidence: [
        {
          id: 'twin-latest',
          kind: 'project-twin',
          summary: `Twin v${twin.schemaVersion}: ${twin.summary.features} features, ${twin.nodes.length} nodes, ${twin.edges.length} edges`,
          path: '.veloprove/twin/latest.json',
          data: { fingerprint: twin.fingerprint, summary: twin.summary, evidenceClasses }
        }
      ],
      metadata: {
        verificationStatus: 'PARTIAL',
        schemaVersion: twin.schemaVersion,
        evidenceClasses
      },
      durationMs: 0
    });
  }

  /** Count evidence classes across node refs + edges (Dashboard / MCP honesty table). */
  public static summarizeEvidenceClasses(twin: TwinLatestDocument): Record<
    TwinEvidenceClass,
    number
  > {
    const counts: Record<TwinEvidenceClass, number> = {
      VERIFIED: 0,
      OBSERVED: 0,
      INFERRED: 0,
      UNKNOWN: 0,
      STALE: 0
    };
    for (const node of twin.nodes) {
      for (const ev of node.evidence) {
        counts[ev.class] = (counts[ev.class] || 0) + 1;
      }
    }
    for (const edge of twin.edges) {
      counts[edge.evidenceClass] = (counts[edge.evidenceClass] || 0) + 1;
    }
    for (const item of twin.facets.drift?.items || []) {
      counts[item.evidenceClass] = (counts[item.evidenceClass] || 0) + 1;
    }
    return counts;
  }

  public static inspectFeature(twin: TwinLatestDocument, featureQuery: string): TwinInspectResult {
    const q = featureQuery.trim().toLowerCase();
    const node =
      twin.nodes.find((n) => n.id.toLowerCase() === q || n.id.toLowerCase() === `feature:${q}`) ||
      twin.nodes.find((n) => n.kind === 'feature' && n.title.toLowerCase().includes(q));

    if (!node) {
      return { found: false, edges: [], twinGeneratedAt: twin.generatedAt };
    }

    const edges = twin.edges.filter((e) => e.from === node.id || e.to === node.id);
    return { found: true, node, edges, twinGeneratedAt: twin.generatedAt };
  }
}
