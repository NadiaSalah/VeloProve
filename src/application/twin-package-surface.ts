/**
 * Target-project surface analyzer — OBSERVED package.json exports/bin/scripts for Twin.
 * Does not scan VeloProve's own catalog; analyzes the consumer project only.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { TwinDriftItem, TwinNode } from '../shared/types/project-twin.js';

export interface PackageSurfaceReport {
  packageName?: string;
  binEntries: string[];
  exportEntries: string[];
  scriptNames: string[];
  nodes: TwinNode[];
  items: TwinDriftItem[];
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Observe package.json bin / exports / scripts as Twin package-surface nodes.
 */
export function analyzePackageSurface(projectRoot: string): PackageSurfaceReport {
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = readJson(pkgPath);
  const items: TwinDriftItem[] = [];
  const nodes: TwinNode[] = [];
  const binEntries: string[] = [];
  const exportEntries: string[] = [];
  const scriptNames: string[] = [];

  if (!pkg) {
    return { binEntries, exportEntries, scriptNames, nodes, items };
  }

  const name = typeof pkg.name === 'string' ? pkg.name : undefined;

  if (typeof pkg.bin === 'string') {
    binEntries.push(pkg.bin);
  } else if (pkg.bin && typeof pkg.bin === 'object') {
    for (const [k, v] of Object.entries(pkg.bin as Record<string, string>)) {
      binEntries.push(`${k}=${v}`);
      const abs = path.join(projectRoot, v);
      if (!fs.existsSync(abs)) {
        items.push({
          category: 'package-exports:bin-missing',
          summary: `package.json bin "${k}" points to missing file ${v}`,
          severity: 'medium',
          evidenceClass: 'OBSERVED',
          path: 'package.json'
        });
      }
    }
  }

  if (typeof pkg.exports === 'string') {
    exportEntries.push(pkg.exports);
  } else if (pkg.exports && typeof pkg.exports === 'object') {
    for (const key of Object.keys(pkg.exports as object)) {
      exportEntries.push(key);
    }
  }

  if (pkg.scripts && typeof pkg.scripts === 'object') {
    scriptNames.push(...Object.keys(pkg.scripts as object));
  }

  if (name) {
    nodes.push({
      id: `package:${name}`,
      kind: 'package',
      title: name,
      paths: ['package.json'],
      evidence: [
        {
          id: `pkg-surface-${name}`,
          class: 'OBSERVED',
          summary: `package.json surface: ${binEntries.length} bin, ${exportEntries.length} exports, ${scriptNames.length} scripts`,
          path: 'package.json',
          kind: 'package-surface'
        }
      ],
      meta: { binEntries, exportEntries, scriptNames }
    });
  }

  return { packageName: name, binEntries, exportEntries, scriptNames, nodes, items };
}
