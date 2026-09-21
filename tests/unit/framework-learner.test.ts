import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { FrameworkLearnerService } from '../../src/application/framework-learner.js';
import { VeloProveEngine } from '../../src/application/engine.js';
import { ephemeralFixtureDir } from '../helpers/monorepo-fixtures.js';

describe('FrameworkLearnerService (Custom & Uncommon Framework Self-Teaching)', () => {
  const fixtureDir = ephemeralFixtureDir('custom-framework-project');
  let guard: WorkspaceGuard;

  beforeAll(() => {
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
    fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({ name: 'uncommon-stack-app', version: '1.0.0' }));

    // Create custom view files in an uncommon directory e.g. "views/client"
    const viewsDir = path.join(fixtureDir, 'views', 'client');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'home.tsx'), 'export default function Home() { return <h1>Home</h1>; }');
    fs.writeFileSync(path.join(viewsDir, 'dashboard.tsx'), 'export default function Dashboard() { return <h1>Dashboard</h1>; }');

    // Create AGENTS.md with framework instructions
    fs.writeFileSync(
      path.join(fixtureDir, 'AGENTS.md'),
      `# Framework Specification
Custom Framework: MyInHouseEngine
Routes Directory: views/client
Dev Command: npm run serve:custom
Default Port: 8080
`
    );

    guard = new WorkspaceGuard(fixtureDir);
  });

  afterAll(() => {
    try {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    } catch {}
  });

  it('learns custom framework from AGENTS.md and parses routes', () => {
    const result = FrameworkLearnerService.learn(guard);
    expect(result.learned).toBe(true);
    expect(result.frameworkName).toBe('MyInHouseEngine');
    expect(result.inferredRoutesCount).toBe(2);
    expect(fs.existsSync(path.join(fixtureDir, 'veloprove.framework.json'))).toBe(true);
  });

  it('scans routes dynamically through VeloProveEngine inspection', async () => {
    const engine = new VeloProveEngine(fixtureDir);
    const { profile } = await engine.inspect();
    expect(profile.frameworks.some(f => f === 'MyInHouseEngine')).toBe(true);
    expect(profile.routes.some(r => r.path === '/home')).toBe(true);
    expect(profile.routes.some(r => r.path === '/dashboard')).toBe(true);
  });
});
