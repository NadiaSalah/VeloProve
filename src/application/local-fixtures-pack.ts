/**
 * Project-level local fixtures pack (no cloud upload).
 * Writes sample JSON/CSV under tests/fixtures/veloprove for generated tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface FixturesPackResult {
  dir: string;
  relativeDir: string;
  files: string[];
  manifestPath: string;
}

export class LocalFixturesPackService {
  public static ensurePack(
    guard: WorkspaceGuard,
    samples: Array<{ name: string; json?: unknown; csvRows?: string[][] }> = []
  ): FixturesPackResult {
    const relativeDir = 'tests/fixtures/veloprove';
    const dir = guard.resolveSafePath(relativeDir);
    guard.ensureDirectory(dir);
    const files: string[] = [];

    const readme = path.join(dir, 'README.md');
    if (!fs.existsSync(readme)) {
      fs.writeFileSync(
        readme,
        [
          '# VeloProve local fixtures',
          '',
          'Generated locally — never uploaded to a vendor cloud.',
          'Reference from generated API/E2E tests via relative paths under `tests/fixtures/veloprove/`.',
          ''
        ].join('\n'),
        'utf8'
      );
      files.push(readme);
    }

    const sampleUser = path.join(dir, 'sample-user.json');
    if (!fs.existsSync(sampleUser)) {
      fs.writeFileSync(
        sampleUser,
        JSON.stringify({ id: 'user_1', email: 'qa@example.com', role: 'tester' }, null, 2),
        'utf8'
      );
      files.push(sampleUser);
    }

    const sampleCsv = path.join(dir, 'sample-rows.csv');
    if (!fs.existsSync(sampleCsv)) {
      fs.writeFileSync(sampleCsv, 'id,name,status\n1,alpha,active\n2,beta,pending\n', 'utf8');
      files.push(sampleCsv);
    }

    for (const s of samples) {
      const safe = s.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 64) || 'sample';
      if (s.json !== undefined) {
        const p = path.join(dir, `${safe}.json`);
        fs.writeFileSync(p, JSON.stringify(s.json, null, 2), 'utf8');
        files.push(p);
      }
      if (s.csvRows && s.csvRows.length) {
        const p = path.join(dir, `${safe}.csv`);
        fs.writeFileSync(p, s.csvRows.map((r) => r.join(',')).join('\n') + '\n', 'utf8');
        files.push(p);
      }
    }

    const manifestPath = path.join(dir, 'manifest.json');
    const listed = fs.readdirSync(dir).filter((f) => f !== 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: '1',
          relativeDir,
          files: listed,
          updatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf8'
    );
    files.push(manifestPath);

    return { dir, relativeDir, files, manifestPath };
  }
}
