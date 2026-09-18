import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';
import type { TestPlan, TestRunResult } from '../shared/types/tests.js';
import type { FlakyTestReport } from '../shared/types/release.js';

export class LocalStorage {
  private workspaceGuard: WorkspaceGuard;
  private baseDir: string;

  constructor(workspaceGuard: WorkspaceGuard) {
    this.workspaceGuard = workspaceGuard;
    this.baseDir = path.join(this.workspaceGuard.getRoot(), '.veloprove');
    this.initDirectories();
  }

  private initDirectories(): void {
    const dirs = [
      this.baseDir,
      path.join(this.baseDir, 'plans'),
      path.join(this.baseDir, 'runs'),
      path.join(this.baseDir, 'artifacts'),
      path.join(this.baseDir, 'reports'),
      path.join(this.baseDir, 'cache')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public saveProjectProfile(profile: ProjectProfile): void {
    const file = path.join(this.baseDir, 'project-profile.json');
    fs.writeFileSync(file, JSON.stringify(profile, null, 2), 'utf8');
  }

  public getProjectProfile(): ProjectProfile | null {
    const file = path.join(this.baseDir, 'project-profile.json');
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  public saveRequirements(requirements: DiscoveredRequirement[]): void {
    const file = path.join(this.baseDir, 'requirements.json');
    fs.writeFileSync(file, JSON.stringify(requirements, null, 2), 'utf8');
  }

  public getRequirements(): DiscoveredRequirement[] {
    const file = path.join(this.baseDir, 'requirements.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  public saveTestPlan(plan: TestPlan): void {
    const file = path.join(this.baseDir, 'plans', `${plan.planId}.json`);
    fs.writeFileSync(file, JSON.stringify(plan, null, 2), 'utf8');
    // Also save as latest
    fs.writeFileSync(path.join(this.baseDir, 'plans', 'latest.json'), JSON.stringify(plan, null, 2), 'utf8');
  }

  public getTestPlan(planId: string): TestPlan | null {
    const file = path.join(this.baseDir, 'plans', `${planId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  public getLatestTestPlan(): TestPlan | null {
    return this.getTestPlan('latest');
  }

  public saveTestRun(run: TestRunResult): void {
    const file = path.join(this.baseDir, 'runs', `${run.runId}.json`);
    fs.writeFileSync(file, JSON.stringify(run, null, 2), 'utf8');
    // Save as latest
    fs.writeFileSync(path.join(this.baseDir, 'runs', 'latest.json'), JSON.stringify(run, null, 2), 'utf8');
  }

  public getTestRun(runId: string): TestRunResult | null {
    const file = path.join(this.baseDir, 'runs', `${runId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  public getLatestTestRun(): TestRunResult | null {
    return this.getTestRun('latest');
  }

  public getAllTestRuns(): TestRunResult[] {
    const runsDir = path.join(this.baseDir, 'runs');
    if (!fs.existsSync(runsDir)) return [];
    const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.json') && f !== 'latest.json');
    return files
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')) as TestRunResult;
        } catch {
          return null;
        }
      })
      .filter((r): r is TestRunResult => r !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public saveFlakyHistory(flakyReport: FlakyTestReport[]): void {
    const file = path.join(this.baseDir, 'cache', 'flaky-tests.json');
    fs.writeFileSync(file, JSON.stringify(flakyReport, null, 2), 'utf8');
  }

  public getFlakyHistory(): FlakyTestReport[] {
    const file = path.join(this.baseDir, 'cache', 'flaky-tests.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  public getArtifactPath(filename: string): string {
    return path.join(this.baseDir, 'artifacts', filename);
  }
}
