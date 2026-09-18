import fs from 'node:fs';
import path from 'node:path';
import type { TestPlan, GeneratedTestFile, OverwritePolicy } from '../shared/types/tests.js';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import { TestCodeGenerator } from '../domain/tests/test-generator.js';
import { observeLiveApiBatch, pathHintForTestCase } from './api-live-grounding.js';
import { LocalFixturesPackService } from './local-fixtures-pack.js';

export interface GenerateTestsOptions {
  planId?: string;
  testCaseIds?: string[];
  overwritePolicy?: OverwritePolicy;
  /** Probe live local API before writing assertions (GET only) */
  liveGround?: boolean;
  baseURL?: string;
  /** Write/refresh tests/fixtures/veloprove pack */
  writeFixtures?: boolean;
}

export interface GenerateTestsResult {
  generatedFiles: GeneratedTestFile[];
  skippedFiles: string[];
  writtenCount: number;
  groundedCount: number;
  fixturesDir?: string;
}

export class GenerateTestsService {
  public static async generate(
    plan: TestPlan,
    guard: WorkspaceGuard,
    options: GenerateTestsOptions = {}
  ): Promise<GenerateTestsResult> {
    const overwritePolicy = options.overwritePolicy || 'generated-only';
    const liveGround = options.liveGround !== false;
    const writeFixtures = options.writeFixtures !== false;
    const testCasesToGenerate = options.testCaseIds && options.testCaseIds.length > 0
      ? plan.testCases.filter(tc => options.testCaseIds!.includes(tc.id))
      : plan.testCases;

    const generatedFiles: GeneratedTestFile[] = [];
    const skippedFiles: string[] = [];
    let writtenCount = 0;
    let groundedCount = 0;

    let fixturesDir: string | undefined;
    if (writeFixtures) {
      const pack = LocalFixturesPackService.ensurePack(guard);
      fixturesDir = pack.relativeDir;
    }

    // Batch live ground all API paths once
    const observations = liveGround
      ? await observeLiveApiBatch({
          baseURL: options.baseURL,
          paths: testCasesToGenerate
            .filter((tc) => tc.type === 'api')
            .map((tc) => pathHintForTestCase(tc))
        })
      : new Map();

    const groundedSamples: Array<{ name: string; json?: unknown }> = [];

    for (const tc of testCasesToGenerate) {
      const enriched = { ...tc };
      if (liveGround && tc.type === 'api') {
        const pathHint = pathHintForTestCase(tc);
        const obs = observations.get(pathHint);
        if (obs?.grounded) {
          enriched.observedStatus = obs.status;
          enriched.observedPath = pathHint;
          enriched.observedUrl = obs.url;
          enriched.observedContentType = obs.contentType;
          enriched.observedJsonKeys = obs.jsonKeys;
          groundedCount++;
          if (obs.bodyPreview && obs.jsonKeys?.length) {
            try {
              groundedSamples.push({
                name: `grounded-${pathHint.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40)}`,
                json: JSON.parse(obs.bodyPreview)
              });
            } catch {
              /* preview truncated */
            }
          }
        }
      }

      if (writeFixtures && (tc.type === 'api' || tc.type === 'e2e')) {
        enriched.fixturePath = `${fixturesDir}/sample-user.json`;
      }

      const generated = TestCodeGenerator.generateTestFile(enriched, guard.getRoot());
      const absoluteTarget = guard.resolveSafePath(generated.relativePath);
      const exists = fs.existsSync(absoluteTarget);

      let canWrite = false;
      if (!exists) {
        canWrite = true;
      } else if (overwritePolicy === 'explicit') {
        canWrite = true;
      } else if (overwritePolicy === 'generated-only') {
        try {
          const existingContent = fs.readFileSync(absoluteTarget, 'utf8');
          if (existingContent.includes('@veloprove-generated')) {
            canWrite = true;
          } else {
            skippedFiles.push(generated.relativePath);
          }
        } catch {
          skippedFiles.push(generated.relativePath);
        }
      } else {
        skippedFiles.push(generated.relativePath);
      }

      if (canWrite) {
        guard.ensureDirectory(path.dirname(absoluteTarget));
        fs.writeFileSync(absoluteTarget, generated.content, 'utf8');
        generatedFiles.push(generated);
        writtenCount++;
      }
    }

    if (writeFixtures && groundedSamples.length > 0) {
      LocalFixturesPackService.ensurePack(guard, groundedSamples.slice(0, 8));
    }

    return {
      generatedFiles,
      skippedFiles,
      writtenCount,
      groundedCount,
      fixturesDir
    };
  }
}
