#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🔍 VeloProve Pre-Release Package Integrity Validation\n');

try {
  // 1. Build TypeScript first
  console.log('1. Building package (tsc -p tsconfig.build.json)...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✔ Build succeeded.\n');

  // 2. Run TypeScript typecheck
  console.log('2. Typechecking source code...');
  execSync('npm run typecheck', { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✔ Typecheck passed.\n');

  // 3. Run Tests
  console.log('3. Running automated test suites...');
  execSync('npm run test', { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✔ All tests passed.\n');

  // 4. Run npm pack dry-run
  console.log('4. Analyzing npm pack contents...');
  const packOutputRaw = execSync('npm pack --dry-run --json', { cwd: rootDir, encoding: 'utf8' });
  const packData = JSON.parse(packOutputRaw)[0];

  const files = packData.files.map(f => f.path);
  console.log(`   Packaged file count: ${files.length}`);
  console.log(`   Tarball size: ${(packData.size / 1024).toFixed(1)} KB`);
  console.log(`   Unpacked size: ${(packData.unpackedSize / 1024).toFixed(1)} KB\n`);

  // 5. Verify Forbidden Patterns
  const forbiddenPatterns = [
    /^src\//,
    /^tests\//,
    /^\.github\//,
    /^\.cursor\//,
    /^\.veloprove\//,
    /^coverage\//,
    /^\.env/,
    /\.ts$/, // raw TypeScript files (except .d.ts)
    /\.tmp$/,
    /\.log$/
  ];

  const violations = [];
  for (const file of files) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(file)) {
        // Exception: allow .d.ts files inside dist
        if (file.startsWith('dist/') && file.endsWith('.d.ts')) continue;
        violations.push({ file, pattern: pattern.toString() });
      }
    }
  }

  if (violations.length > 0) {
    console.error('❌ FORBIDDEN FILES DETECTED IN PACKAGE:');
    violations.forEach(v => console.error(`   - ${v.file} (matched ${v.pattern})`));
    process.exit(1);
  }

  // 6. Verify Required Files (runtime + AI teach + Docs Chat corpus)
  const requiredFiles = [
    'package.json',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'dist/index.js',
    'dist/index.d.ts',
    'dist/cli/index.js',
    'dist/mcp/server.js',
    // Consumer AI teach (post-install playbook — NOT root AGENTS.md)
    'docs/AGENTS.md',
    'docs/README.md',
    // Docs Chat / vp.ask corpus
    'docs/guides/getting-started.md',
    'docs/guides/faq.md',
    'docs/guides/dashboard.md',
    'docs/guides/features.md',
    'docs/guides/ai-integrations.md',
    'docs/guides/examples.md',
    'docs/guides/trust.md',
    'docs/guides/scheduled-verify.md',
    'docs/reference/cli.md',
    'docs/reference/mcp.md',
    'docs/reference/architecture.md',
    'docs/reference/surface-matrix.md',
    // Brand + marketplace listing assets (ship in npm for badge/copy)
    'docs/assets/veloprove-logo.svg',
    'docs/assets/veloprove-icon.svg',
    'docs/assets/marketplace/README.md',
    'docs/assets/marketplace/no-api-key-badge.svg'
  ];

  const missingFiles = [];
  for (const req of requiredFiles) {
    if (!files.includes(req)) {
      missingFiles.push(req);
    }
  }

  if (missingFiles.length > 0) {
    console.error('❌ REQUIRED FILES MISSING FROM PACKAGE:');
    missingFiles.forEach(m => console.error(`   - ${m}`));
    process.exit(1);
  }

  // 7. Verify CLI Executable Header
  const cliPath = path.join(rootDir, 'dist', 'cli', 'index.js');
  const cliContent = fs.readFileSync(cliPath, 'utf8');
  if (!cliContent.startsWith('#!/usr/bin/env node')) {
    console.error('❌ dist/cli/index.js missing "#!/usr/bin/env node" shebang!');
    process.exit(1);
  }

  // 7b. GitHub README screenshots (repo-only; not in npm tarball)
  const shotDir = path.join(rootDir, 'docs', 'assets', 'screenshots');
  const shots = [
    '01-dashboard-overview.png',
    '02-dashboard-verify.png',
    '03-dashboard-docs-chat.png'
  ];
  const missingShots = shots.filter((f) => !fs.existsSync(path.join(shotDir, f)));
  if (missingShots.length) {
    console.warn(
      '⚠ README screenshots missing (GitHub gallery 404 until recaptured):\n   ' +
        missingShots.map((f) => `docs/assets/screenshots/${f}`).join('\n   ') +
        '\n   Run: node scripts/capture-readme-screenshots.mjs'
    );
  } else {
    console.log('   ✔ README screenshot PNGs present (repo gallery).');
  }

  // 8. Package size limit check (Max 5MB)
  const maxSizeBytes = 5 * 1024 * 1024;
  if (packData.size > maxSizeBytes) {
    console.error(`❌ Package size (${(packData.size / 1024 / 1024).toFixed(2)} MB) exceeds 5MB limit!`);
    process.exit(1);
  }

  // 9. Consumer Project Clean-Room Smoke Test
  console.log('5. Running clean-room consumer smoke test...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloprove-smoke-test-'));
  try {
    // Initialize clean consumer project
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'consumer-smoke-test-app', version: '1.0.0' }, null, 2),
      'utf8'
    );

    // Verify bin execution from compiled dist (version SSOT = package.json)
    const expectedVersion = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
    ).version;
    const binOutput = execSync(`node "${cliPath}" --version`, { cwd: tempDir, encoding: 'utf8' }).trim();
    if (!binOutput.includes(expectedVersion)) {
      throw new Error(`Unexpected CLI version output: ${binOutput} (expected ${expectedVersion})`);
    }

    // Run veloprove doctor in consumer project
    execSync(`node "${cliPath}" doctor`, { cwd: tempDir, encoding: 'utf8' });

    console.log('   ✔ Consumer smoke test passed (compiled CLI binary + doctor).\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // 10. Full consumer pack smoke (pack → install → init --teach → ask → doctor → verify)
  console.log('6. Running consumer pack smoke gate (npm pack → fixture)…');
  execSync('node scripts/pack-smoke.js', { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✔ Pack smoke gate passed.\n');

  console.log('🎉 ALL RELEASE INTEGRITY CHECKS PASSED!\n');
  console.log('✔ No development files or test fixtures in package.');
  console.log('✔ Complete runtime documentation included in docs/');
  console.log('✔ CLI executable shebang verified.');
  console.log('✔ Consumer installation and binary execution verified.');
  console.log('✔ Pack smoke (init/ask/doctor/verify) verified.');
  console.log('✔ Package is ready for npm publish and GitHub Release.\n');
  process.exit(0);

} catch (err) {
  console.error('\n❌ Release check failed:', err.message);
  process.exit(1);
}
