/**
 * Project Twin — machine-readable project model (composition over inspect SSOT).
 * Evidence classes align with CAPABILITY_MANIFEST honesty vocabulary.
 */

export const TWIN_SCHEMA_VERSION = 1 as const;

/** Honesty class for Twin statements — never treat INFERRED as confirmed. */
export type TwinEvidenceClass =
  | 'VERIFIED'
  | 'OBSERVED'
  | 'INFERRED'
  | 'UNKNOWN'
  | 'STALE';

export type TwinNodeKind =
  | 'feature'
  | 'module'
  | 'source'
  | 'test'
  | 'route'
  | 'endpoint'
  | 'requirement'
  | 'package';

export type TwinEdgeKind =
  | 'feature_requires'
  | 'feature_implements'
  | 'feature_tested_by'
  | 'file_imports'
  | 'route_serves'
  | 'endpoint_implements'
  | 'module_contains'
  | 'package_depends';

/** Impact certainty — required when attaching change-impact facet. */
export type TwinImpactCertainty =
  | 'DIRECT'
  | 'TRANSITIVE'
  | 'CONFIRMED'
  | 'PROBABLE'
  | 'UNKNOWN';

export interface TwinEvidenceRef {
  id: string;
  class: TwinEvidenceClass;
  summary: string;
  path?: string;
  kind?: string;
}

export interface TwinNode {
  id: string;
  kind: TwinNodeKind;
  title: string;
  paths?: string[];
  evidence: TwinEvidenceRef[];
  meta?: Record<string, unknown>;
}

export interface TwinEdge {
  from: string;
  to: string;
  kind: TwinEdgeKind;
  evidenceClass: TwinEvidenceClass;
  note?: string;
}

export interface TwinImpactItem {
  targetId: string;
  targetKind: TwinNodeKind | 'test' | 'route' | 'endpoint' | 'module' | 'capability';
  certainty: TwinImpactCertainty;
  reason: string;
  confidence: number;
}

export interface TwinImpactFacet {
  included: boolean;
  changedFiles: string[];
  items: TwinImpactItem[];
  riskScore: number;
  riskAreas: string[];
  selectionNotes: string[];
  /** Honest: wrapped from AnalyzeChanges / DependencyGraph — not a second engine. */
  source: 'changed-wrap';
}

export interface TwinDriftItem {
  category: string;
  summary: string;
  severity: 'high' | 'medium' | 'low';
  evidenceClass: TwinEvidenceClass;
  path?: string;
}

export interface TwinDriftFacet {
  included: boolean;
  items: TwinDriftItem[];
  compatibilityScore?: number;
  /** Honest: wraps existing drift engines (and optional docs hints). */
  sources: Array<
    | 'contract-drift-wrap'
    | 'feature-parity-wrap'
    | 'env-drift-wrap'
    | 'docs-wrap'
    | 'package-exports-wrap'
    | 'security-wrap'
  >;
  /** Joined sources string for compact display. */
  source: string;
}

export interface TwinLatestDocument {
  schemaVersion: typeof TWIN_SCHEMA_VERSION;
  generatedAt: string;
  projectRoot: string;
  fingerprint: string;
  /** Pointers to SSOT — Twin does not fork the profile. */
  refs: {
    projectProfile: '.veloprove/project-profile.json';
    requirements: '.veloprove/requirements.json';
    featureMap?: '.veloprove/feature-map.json';
  };
  summary: {
    features: number;
    sourceFiles: number;
    testFiles: number;
    routes: number;
    apiEndpoints: number;
    requirements: number;
    frameworks: string[];
    workspaceType: string;
    packageManager: string;
  };
  /** Optional build context for branch/HEAD invalidation (OBSERVED when present). */
  buildContext?: {
    gitHead?: string;
  };
  nodes: TwinNode[];
  edges: TwinEdge[];
  facets: {
    impact?: TwinImpactFacet;
    drift?: TwinDriftFacet;
  };
  warnings: string[];
}

export interface TwinBuildOptions {
  withImpact?: boolean;
  withDrift?: boolean;
  /** Force full rebuild even when fingerprint matches. */
  force?: boolean;
  bypassCache?: boolean;
  /** Prefer incremental: reuse prior Twin graph if fingerprint unchanged. */
  incremental?: boolean;
}

export interface TwinInspectResult {
  found: boolean;
  node?: TwinNode;
  edges: TwinEdge[];
  twinGeneratedAt?: string;
}
