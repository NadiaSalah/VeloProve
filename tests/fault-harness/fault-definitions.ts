/**
 * Typed fault definitions for the Trust Hardening fault harness.
 * Mutations operate on a disposable copy of fixtures/fault-harness/baseline.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { FailureClassification } from '../../src/shared/types/diagnostics.js';

/** Broader harness labels when the engine has no exact enum yet. */
export type HarnessClassification =
  | FailureClassification
  | 'ENV_ISSUE'
  | 'SECRET_FINDING'
  | 'RELEASE_BLOCKED'
  | 'COVERAGE_GAP'
  | 'GIT_IMPACT'
  | 'BISECT_CANDIDATE'
  | 'VALIDATION_BUG'
  | 'DETECTION_ONLY'
  | 'A11Y_FINDING';

export type FaultDetectionMode =
  | 'diagnose'
  | 'audit-secret'
  | 'release'
  | 'mutation-present'
  | 'heal-locator'
  | 'git-impact'
  | 'bisect'
  | 'coverage-gap'
  | 'a11y-label';

export interface FaultDefinition {
  id: string;
  kind: string;
  enabled: boolean;
  expectedClassification: HarnessClassification;
  detectionMode: FaultDetectionMode;
  expectHeal?: boolean;
  expectAutoFix?: boolean;
  mutate: (fixtureDir: string) => void;
  restore?: (fixtureDir: string) => void;
  mutationMarker: string;
  mutationFile: string;
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

/** Catalog of FAULT-001..016 — all enabled for CI metrics. */
export const FAULT_DEFINITIONS: FaultDefinition[] = [
  {
    id: 'FAULT-001',
    kind: 'logic',
    enabled: true,
    expectedClassification: 'APPLICATION_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/math.js',
    mutationMarker: 'return a - b',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/math.js'),
        `/** FAULT-001: inverted add */\nexport function add(a, b) {\n  return a - b;\n}\nexport function health() { return { ok: true }; }\n`
      );
    }
  },
  {
    id: 'FAULT-002',
    kind: 'validation',
    enabled: true,
    expectedClassification: 'APPLICATION_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/validate.js',
    mutationMarker: 'return true',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/validate.js'),
        `/** FAULT-002: accept malformed email */\nexport function isValidEmail() { return true; }\nexport function acceptContact(payload) {\n  return { ok: true, status: 200, email: payload?.email };\n}\n`
      );
    }
  },
  {
    id: 'FAULT-003',
    kind: 'routing',
    enabled: true,
    expectedClassification: 'APPLICATION_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/products.js',
    mutationMarker: 'UNKNOWN_AS_FIRST',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/products.js'),
        `export const PRODUCTS = [
  { id: 'travel-pack', name: 'Travel Pack', price: 49 },
  { id: 'day-bag', name: 'Day Bag', price: 29 }
];

export function searchProducts(query) {
  const q = String(query || '').toLowerCase();
  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
}

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/** FAULT-003: UNKNOWN_AS_FIRST */
export function getProductOrDefault(id) {
  return getProduct(id) || PRODUCTS[0];
}

export function notFoundMessage() {
  return 'Product not found';
}

export function searchLabel() {
  return 'Search products';
}
`
      );
    }
  },
  {
    id: 'FAULT-004',
    kind: 'authentication',
    enabled: true,
    expectedClassification: 'APPLICATION_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/auth.js',
    mutationMarker: 'empty password accepted',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/auth.js'),
        `/** FAULT-004: empty password accepted */\nexport function login(username, password) {\n  if (!username) return { ok: false, status: 401, error: 'username required' };\n  // empty password accepted\n  return { ok: true, status: 200, user: username };\n}\nexport function getProfile(role) {\n  return { role: role || 'user', secret: false };\n}\n`
      );
    }
  },
  {
    id: 'FAULT-005',
    kind: 'authorization',
    enabled: true,
    expectedClassification: 'APPLICATION_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/auth.js',
    mutationMarker: 'ADMIN_EXPOSE',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/auth.js'),
        `/** FAULT-005: ADMIN_EXPOSE */\nexport function login(username, password) {\n  if (!username || !password || String(password).length === 0) {\n    return { ok: false, status: 401, error: 'password required' };\n  }\n  return { ok: true, status: 200, user: username, role: 'user' };\n}\n\nexport function getProfile(role) {\n  // ADMIN_EXPOSE FAULT-005\n  return { role: "admin", secret: true, requested: role };\n}\n`
      );
    }
  },
  {
    id: 'FAULT-006',
    kind: 'API status/schema',
    enabled: true,
    expectedClassification: 'APPLICATION_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/validate.js',
    mutationMarker: 'status: 200',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/validate.js'),
        `/** FAULT-006: 200 on invalid contact */\nexport function isValidEmail() { return false; }\nexport function acceptContact(payload) {\n  return { ok: true, status: 200, email: payload?.email };\n}\n`
      );
    }
  },
  {
    id: 'FAULT-007',
    kind: 'error rendering',
    enabled: true,
    expectedClassification: 'TEST_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/products.js',
    mutationMarker: 'NO_NOT_FOUND',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/products.js'),
        `export const PRODUCTS = [
  { id: 'travel-pack', name: 'Travel Pack', price: 49 },
  { id: 'day-bag', name: 'Day Bag', price: 29 }
];

export function searchProducts(query) {
  const q = String(query || '').toLowerCase();
  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
}

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

export function getProductOrDefault(id) {
  return getProduct(id);
}

export function notFoundMessage() {
  // NO_NOT_FOUND FAULT-007
  return '';
}

export function searchLabel() {
  return 'Search products';
}
`
      );
      write(
        path.join(dir, 'src/ui.html'),
        `<!DOCTYPE html>\n<html lang="en"><body>\n<!-- NO_NOT_FOUND FAULT-007 -->\n<label for="search">Search products</label>\n<input id="search" type="search" />\n</body></html>\n`
      );
    }
  },
  {
    id: 'FAULT-008',
    kind: 'accessibility',
    enabled: true,
    expectedClassification: 'A11Y_FINDING',
    detectionMode: 'a11y-label',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/ui.html',
    mutationMarker: 'NO_LABEL',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/ui.html'),
        `<!DOCTYPE html>\n<html lang="en"><body>\n<!-- NO_LABEL FAULT-008 -->\n<input id="search" type="search" name="search" />\n</body></html>\n`
      );
      write(
        path.join(dir, 'src/products.js'),
        read(path.join(dir, 'src/products.js')).replace(/return ['"]Search products['"];/, "return ''; // NO_LABEL")
      );
    }
  },
  {
    id: 'FAULT-009',
    kind: 'stale E2E locator',
    enabled: true,
    expectedClassification: 'TEST_BUG',
    detectionMode: 'heal-locator',
    expectHeal: true,
    expectAutoFix: false,
    mutationFile: 'tests/e2e-product.spec.js',
    mutationMarker: '.travel-pack-btn',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/products.js'),
        `export const PRODUCTS = [{ id: 'adventure-kit', name: 'Adventure Kit', price: 49 }];\n`
      );
      write(
        path.join(dir, 'tests/e2e-product.spec.js'),
        `// @veloprove-generated\nexport async function openTravelPack(page) {\n  await page.locator('.travel-pack-btn').click();\n}\n`
      );
    }
  },
  {
    id: 'FAULT-010',
    kind: 'controlled flake',
    enabled: true,
    expectedClassification: 'FLAKY_TEST',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/math.js',
    mutationMarker: 'FLAKE_DELAY',
    mutate: (dir) => {
      const p = path.join(dir, 'src/math.js');
      write(
        p,
        read(p) +
          `\n/** FAULT-010 controlled flake */\nexport async function flakyAdd(a, b) {\n  // FLAKE_DELAY\n  await new Promise((r) => setTimeout(r, Math.random() > 0.5 ? 0 : 50));\n  return a + b;\n}\n`
      );
    }
  },
  {
    id: 'FAULT-011',
    kind: 'safe hostile input',
    enabled: true,
    expectedClassification: 'APPLICATION_BUG',
    detectionMode: 'diagnose',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/validate.js',
    mutationMarker: 'HOSTILE_OK',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/validate.js'),
        `/** FAULT-011: hostile input accepted */\nexport function isValidEmail() { return true; }\nexport function acceptContact(payload) {\n  // HOSTILE_OK\n  return { ok: true, status: 200, raw: payload?.email };\n}\nexport function sanitize(input) { return input; }\n`
      );
    }
  },
  {
    id: 'FAULT-012',
    kind: 'fake secret',
    enabled: true,
    expectedClassification: 'SECRET_FINDING',
    detectionMode: 'audit-secret',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/config.js',
    mutationMarker: 'api_key',
    mutate: (dir) => {
      write(
        path.join(dir, 'src/config.js'),
        "/** FAULT-012 fake secret - not real */\nconst api_key = 'vp_test_fake_secret_token_0123456789';\nexport const config = { api_key };\n"
      );
    }
  },
  {
    id: 'FAULT-013',
    kind: 'Git impact',
    enabled: true,
    expectedClassification: 'GIT_IMPACT',
    detectionMode: 'git-impact',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/products.js',
    mutationMarker: 'GIT_IMPACT_MUTATION',
    mutate: (dir) => {
      const p = path.join(dir, 'src/products.js');
      const next = read(p).replace('Travel Pack', 'Adventure Kit /* GIT_IMPACT_MUTATION FAULT-013 */');
      write(p, next);
    }
  },
  {
    id: 'FAULT-014',
    kind: 'bisect sequence',
    enabled: true,
    expectedClassification: 'BISECT_CANDIDATE',
    detectionMode: 'bisect',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/products.js',
    mutationMarker: 'BISECT_MARKER',
    mutate: (dir) => {
      const p = path.join(dir, 'src/products.js');
      write(p, read(p) + '\n// BISECT_MARKER FAULT-014\n');
    }
  },
  {
    id: 'FAULT-015',
    kind: 'uncovered branch',
    enabled: true,
    expectedClassification: 'COVERAGE_GAP',
    detectionMode: 'coverage-gap',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/math.js',
    mutationMarker: 'UNCOVERED_BRANCH',
    mutate: (dir) => {
      const p = path.join(dir, 'src/math.js');
      write(
        p,
        read(p) +
          '\nexport function reviewsErrorBranch() { throw new Error("UNCOVERED_BRANCH"); }\n'
      );
    }
  },
  {
    id: 'FAULT-016',
    kind: 'release blocker',
    enabled: true,
    expectedClassification: 'RELEASE_BLOCKED',
    detectionMode: 'release',
    expectHeal: false,
    expectAutoFix: false,
    mutationFile: 'src/math.js',
    mutationMarker: 'return a - b',
    mutate: (dir) => {
      write(path.join(dir, 'src/math.js'), `export function add(a, b) { return a - b; }\n`);
    }
  }
];

export function getEnabledFaults(): FaultDefinition[] {
  return FAULT_DEFINITIONS.filter((f) => f.enabled);
}
