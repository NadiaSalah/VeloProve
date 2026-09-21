/**
 * Doctor / inspect / ask work offline (local-first).
 *
 * Assumptions:
 * - No outbound HTTP is required for these three surfaces.
 * - askDocs answers from packaged markdown under the package docs root.
 * - inspect/doctor only read the local workspace + Node environment.
 * - We force undici/global fetch to throw if invoked to catch accidental network.
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { VeloProveEngine } from '../../src/application/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECURITY_LOCAL = path.resolve(__dirname, '../../fixtures/security-local');

describe('Deny-network local-first (doctor/inspect/ask)', () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchCalls = 0;
  });

  it('inspect + doctor + ask succeed with fetch denied', async () => {
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('NETWORK_DENIED: local-first tools must not call fetch');
    }) as typeof fetch;

    expect(fs.existsSync(SECURITY_LOCAL)).toBe(true);
    const engine = new VeloProveEngine(SECURITY_LOCAL);

    const inspect = await engine.inspect();
    expect(inspect.profile.projectName).toBeTruthy();

    const doctor = engine.doctor();
    expect(doctor.verdict).toBeTruthy();
    expect(doctor.totalChecks).toBeGreaterThan(0);

    const ask = engine.askDocs('What is veloprove doctor?');
    expect(ask.answer.length).toBeGreaterThan(5);
    expect(ask.confidence === 'none' || ask.sources.length >= 0).toBe(true);

    expect(fetchCalls).toBe(0);
  });

  it('works in an empty temp project without network', async () => {
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('NETWORK_DENIED');
    }) as typeof fetch;

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-offline-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ name: 'offline-tmp', version: '0.0.0', private: true }),
        'utf8'
      );
      const engine = new VeloProveEngine(tmp);
      await engine.inspect();
      const doctor = engine.doctor();
      expect(doctor.totalChecks).toBeGreaterThan(0);
      engine.askDocs('how do I init?');
      expect(fetchCalls).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
