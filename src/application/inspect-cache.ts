import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';
import type { FeatureMap } from '../shared/types/requirements.js';

export interface InspectCacheEntry {
  key: string;
  profile: ProjectProfile;
  requirements: DiscoveredRequirement[];
  featureMap: FeatureMap;
  createdAt: number;
}

/**
 * In-memory inspect cache keyed by lockfile + config + package.json hashes.
 * Invalidates automatically when fingerprints change.
 */
export class InspectCache {
  private static entry: InspectCacheEntry | null = null;

  public static fingerprint(projectRoot: string): string {
    const parts: string[] = [];
    for (const rel of [
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lockb',
      'veloprove.config.json',
      'tsconfig.json'
    ]) {
      const abs = path.join(projectRoot, rel);
      try {
        if (fs.existsSync(abs)) {
          const st = fs.statSync(abs);
          parts.push(`${rel}:${st.size}:${st.mtimeMs}`);
        }
      } catch {
        /* ignore */
      }
    }
    // Include a cheap directory mtime sample of src/ if present
    const src = path.join(projectRoot, 'src');
    try {
      if (fs.existsSync(src)) {
        parts.push(`src:${fs.statSync(src).mtimeMs}`);
      }
    } catch {
      /* ignore */
    }
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
  }

  public static get(
    projectRoot: string
  ): { profile: ProjectProfile; requirements: DiscoveredRequirement[]; featureMap: FeatureMap } | null {
    const key = InspectCache.fingerprint(projectRoot);
    if (InspectCache.entry && InspectCache.entry.key === key) {
      return {
        profile: InspectCache.entry.profile,
        requirements: InspectCache.entry.requirements,
        featureMap: InspectCache.entry.featureMap
      };
    }
    return null;
  }

  public static set(
    projectRoot: string,
    data: { profile: ProjectProfile; requirements: DiscoveredRequirement[]; featureMap: FeatureMap }
  ): void {
    InspectCache.entry = {
      key: InspectCache.fingerprint(projectRoot),
      ...data,
      createdAt: Date.now()
    };
  }

  public static invalidate(): void {
    InspectCache.entry = null;
  }
}
