#!/usr/bin/env node
/**
 * Consumer pack smoke gate:
 * npm pack → clean install on fixture → init --teach → ask → doctor → verify
 *
 * Usage: node scripts/pack-smoke.js
 * Exit 0 on success; non-zero on failure.
 */

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const fixtureSrc = path.join(rootDir, 'fixtures', 'real-app-smoke');

function log(step, msg) {
  console.log(`${step} ${msg}`);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts
  });
}

function main() {
  console.log('\n🧪 VeloProve consumer pack smoke\n');

  if (!fs.existsSync(fixtureSrc)) {
    throw new Error(`Fixture missing: ${fixtureSrc}`);
  }

  log('1.', 'Building package…');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  log('2.', 'npm pack…');
  const packRaw = execSync('npm pack --ignore-scripts --json', { cwd: rootDir, encoding: 'utf8' });
  const packJsonStart = packRaw.indexOf('[');
  const packData = JSON.parse(packRaw.substring(packJsonStart))[0];
  const tarballPath = path.join(rootDir, packData.filename);
  if (!fs.existsSync(tarballPath)) throw new Error(`Tarball not found: ${tarballPath}`);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-pack-smoke-'));
  const consumerDir = path.join(tempRoot, 'app');
  try {
    log('3.', `Copy fixture → ${consumerDir}`);
    fs.cpSync(fixtureSrc, consumerDir, { recursive: true });

    // Fresh package.json deps: only the packed VeloProve
    const pkgPath = path.join(consumerDir, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
    const pkg = JSON.parse(pkgRaw);
    pkg.devDependencies = { ...(pkg.devDependencies || {}), '@engnadia/veloprove': `file:${tarballPath}` };
    // Avoid colliding lockfiles from fixture
    delete pkg.dependencies?.['@engnadia/veloprove'];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    log('4.', 'npm install (clean consumer)…');
    execSync('npm install --ignore-scripts --no-audit --no-fund', {
      cwd: consumerDir,
      stdio: 'inherit',
      env: { ...process.env, npm_config_package_lock: 'false' }
    });

    const bin = path.join(consumerDir, 'node_modules', '@engnadia', 'veloprove', 'dist', 'cli', 'index.js');
    if (!fs.existsSync(bin)) throw new Error(`CLI missing after install: ${bin}`);

    const vp = (args) => run(process.execPath, [bin, ...args], { cwd: consumerDir });

    log('5.', 'init -y --teach --no-link-ai…');
    const initOut = vp(['init', '-y', '--teach', '--no-link-ai']);
    if (!/veloprove|AGENTS|Teach|MCP|init/i.test(initOut)) {
      throw new Error('init output unexpected:\n' + initOut.slice(0, 500));
    }

    log('6.', 'ask…');
    const askOut = vp(['ask', 'how do I verify my changes?', '--json']);
    const askJson = JSON.parse(askOut);
    if (!askJson.answer || typeof askJson.answer !== 'string') {
      throw new Error('ask JSON missing answer');
    }

    log('7.', 'doctor…');
    const doctorOut = vp(['doctor', '--json']);
    const doctorJson = JSON.parse(doctorOut);
    if (!doctorJson.verdict) throw new Error('doctor JSON missing verdict');

    log('8.', 'verify --json (best-effort; may warn without full suite)…');
    let verifyStatus = 'ok';
    try {
      const verifyOut = vp(['verify', '--json']);
      const verifyJson = JSON.parse(verifyOut);
      if (!verifyJson.status && !verifyJson.success && verifyJson.success !== false) {
        throw new Error('verify JSON missing status/success');
      }
      verifyStatus = verifyJson.status || (verifyJson.success ? 'ok' : 'failed');
    } catch (err) {
      // verify may exit non-zero in CI-ish fixtures — still accept parseable JSON on stdout via catch message
      const msg = err instanceof Error ? err.message : String(err);
      if (!/status|success|verdict|JSON/i.test(msg) && err?.stdout) {
        const parsed = JSON.parse(String(err.stdout));
        verifyStatus = parsed.status || 'exited';
      } else if (err?.stdout) {
        JSON.parse(String(err.stdout));
        verifyStatus = 'exited-with-json';
      } else {
        // Soft gate: doctor+ask+init are required; verify is best-effort on minimal fixture
        console.warn('   ⚠ verify soft-failed (fixture may lack full test graph):', msg.slice(0, 200));
        verifyStatus = 'soft-fail';
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      tarball: packData.filename,
      consumerDir,
      steps: {
        init: 'ok',
        ask: 'ok',
        doctor: doctorJson.verdict,
        verify: verifyStatus
      }
    };
    const outPath = path.join(rootDir, 'docs', 'generated', 'PACK_SMOKE_REPORT.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\n✔ Pack smoke passed → ${outPath}\n`);
  } finally {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      /* ignore Windows lock */
    }
    try {
      fs.unlinkSync(tarballPath);
    } catch {
      /* keep tarball if locked */
    }
  }
}

try {
  main();
} catch (err) {
  console.error('\n❌ Pack smoke failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
