/**
 * Framework adapter interface for Twin discovery (JS/TS first; others postponed).
 * Twin continues to use ProjectProfile today — adapters are optional enrichment hooks.
 */
import type { ProjectProfile } from '../shared/types/project.js';
import type { TwinEdge, TwinNode } from '../shared/types/project-twin.js';

export interface TwinFrameworkAdapter {
  /** Stable id e.g. `nodejs`, `react`, `express` */
  id: string;
  /** True when this adapter should run for the profile */
  matches(profile: ProjectProfile): boolean;
  /** Optional extra nodes/edges OBSERVED from framework conventions */
  enrich?(
    profile: ProjectProfile,
    projectRoot: string
  ): { nodes?: TwinNode[]; edges?: TwinEdge[]; warnings?: string[] };
}

/** Built-in JS/TS no-op adapters — declare intent; enrichment lands later. */
export const BUILTIN_TWIN_ADAPTERS: TwinFrameworkAdapter[] = [
  {
    id: 'nodejs',
    matches: (p) =>
      p.languages.includes('javascript') ||
      p.languages.includes('typescript') ||
      (p.frameworks || []).some((f) => /node/i.test(f))
  },
  {
    id: 'react',
    matches: (p) => (p.frameworks || []).some((f) => /react/i.test(f))
  },
  {
    id: 'express',
    matches: (p) => (p.frameworks || []).some((f) => /express/i.test(f))
  }
];

export function selectTwinAdapters(profile: ProjectProfile): TwinFrameworkAdapter[] {
  return BUILTIN_TWIN_ADAPTERS.filter((a) => a.matches(profile));
}
