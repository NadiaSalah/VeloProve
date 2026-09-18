import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { OpenApiParser } from '../../src/intelligence/requirement-discovery/openapi-parser.js';
import { MockNetworkGenerator } from '../../src/application/mock-network.js';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import type { ProjectProfile } from '../../src/shared/types/project.js';
import { RunHistoryService } from '../../src/application/run-history.js';
import type { HistoryPoint } from '../../src/application/run-history.js';

describe('OpenAPI → mock example', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-oas-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('extracts example responses into ApiEndpoint and MSW handlers', () => {
    const spec = {
      openapi: '3.0.0',
      paths: {
        '/api/users': {
          get: {
            summary: 'List users',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    example: { users: [{ id: 1, name: 'Ada' }] }
                  }
                }
              }
            }
          }
        }
      }
    };
    const specPath = path.join(tmp, 'openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(spec), 'utf8');

    const { endpoints } = OpenApiParser.parseFile(specPath, tmp);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].exampleResponse).toEqual({ users: [{ id: 1, name: 'Ada' }] });

    const guard = new WorkspaceGuard(tmp);
    const profile = {
      projectName: 'demo',
      apiEndpoints: endpoints
    } as ProjectProfile;

    const mocks = MockNetworkGenerator.generate(profile, [], guard);
    const handlers = fs.readFileSync(mocks.generatedFiles[0].filePath, 'utf8');
    expect(handlers).toContain('Ada');
    expect(handlers).toContain('OpenAPI example');
  });
});

describe('Branch velocity / MTTR', () => {
  it('computes MTTR and regression alerts across branches', () => {
    const points: HistoryPoint[] = [
      {
        runId: 'r3',
        timestamp: '2026-09-17T12:00:00.000Z',
        total: 10,
        passed: 10,
        failed: 0,
        durationMs: 100,
        passRate: 100,
        status: 'passed',
        branch: 'main'
      },
      {
        runId: 'r2',
        timestamp: '2026-09-17T10:00:00.000Z',
        total: 10,
        passed: 5,
        failed: 5,
        durationMs: 100,
        passRate: 50,
        status: 'failed',
        branch: 'main'
      },
      {
        runId: 'r1',
        timestamp: '2026-09-17T08:00:00.000Z',
        total: 10,
        passed: 10,
        failed: 0,
        durationMs: 100,
        passRate: 100,
        status: 'passed',
        branch: 'main'
      },
      {
        runId: 'f1',
        timestamp: '2026-09-17T11:00:00.000Z',
        total: 10,
        passed: 2,
        failed: 8,
        durationMs: 100,
        passRate: 20,
        status: 'failed',
        branch: 'feature'
      }
    ];

    const stats = RunHistoryService.computeBranchStats(points);
    const main = stats.find((s) => s.branch === 'main')!;
    expect(main.mttrHours).toBe(2);
    expect(main.velocityDelta).toBe(50);
    expect(main.regressionAlert).toBe(false);

    const feature = stats.find((s) => s.branch === 'feature')!;
    expect(feature.failStreak).toBe(1);

    // Simulate a sharp drop on feature
    const drop: HistoryPoint[] = [
      {
        runId: 'f2',
        timestamp: '2026-09-17T12:00:00.000Z',
        total: 10,
        passed: 1,
        failed: 9,
        durationMs: 100,
        passRate: 10,
        status: 'failed',
        branch: 'feature'
      },
      {
        runId: 'f0',
        timestamp: '2026-09-17T10:00:00.000Z',
        total: 10,
        passed: 10,
        failed: 0,
        durationMs: 100,
        passRate: 100,
        status: 'passed',
        branch: 'feature'
      }
    ];
    const featStats = RunHistoryService.computeBranchStats(drop).find((s) => s.branch === 'feature')!;
    expect(featStats.velocityDelta).toBe(-90);
    expect(featStats.regressionAlert).toBe(true);
  });
});
