/**
 * Resolve VeloProve-core fixture roots and ephemeral per-test dirs.
 * Canonical fixtures live under `VeloProve-core/fixtures/` (not the monorepo sibling).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** `…/VeloProve-core/fixtures` when tests live under VeloProve-core/tests/... */
export function monorepoFixturesRoot(): string {
  return path.resolve(HERE, '../../fixtures');
}

/** @deprecated Prefer `coreFixturesRoot` — alias kept for existing imports. */
export const coreFixturesRoot = monorepoFixturesRoot;

export function monorepoFixture(...segments: string[]): string {
  return path.join(monorepoFixturesRoot(), ...segments);
}

export function coreFixture(...segments: string[]): string {
  return monorepoFixture(...segments);
}

/**
 * Disposable fixture directory under the OS temp folder (unique per call).
 * Callers should clean up in afterAll/afterEach when appropriate.
 */
export function ephemeralFixtureDir(label: string): string {
  const safe = label.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 48);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vp-fx-${safe}-`));
  return dir;
}
