/**
 * Package identity SSOT — version/name always come from package.json.
 * Never hardcode product version elsewhere in CLI / MCP / Dashboard / handshake.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

interface PackageJsonShape {
  name?: string;
  version?: string;
}

let cached: PackageJsonShape | null = null;

function readPackageJson(): PackageJsonShape {
  if (cached) return cached;
  const pkgPath = path.join(PACKAGE_ROOT, 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  cached = JSON.parse(raw) as PackageJsonShape;
  return cached;
}

/** Absolute path to the @engnadia/veloprove package root */
export function getPackageRoot(): string {
  return PACKAGE_ROOT;
}

export function getPackageVersion(): string {
  return readPackageJson().version || '0.0.0';
}

export const PACKAGE_NAME: string = (() => {
  try {
    return readPackageJson().name || '@engnadia/veloprove';
  } catch {
    return '@engnadia/veloprove';
  }
})();
