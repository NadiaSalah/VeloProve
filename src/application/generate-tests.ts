import fs from 'node:fs';
import path from 'node:path';
import type { TestPlan, GeneratedTestFile, OverwritePolicy } from '../shared/types/tests.js';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import { TestCodeGenerator } from '../domain/tests/test-generator.js';

export interface GenerateTestsOptions {
  planId?: string;
  testCaseIds?: string[];
  overwritePolicy?: OverwritePolicy;
}

export interface GenerateTestsResult {
  generatedFiles: GeneratedTestFile[];
  skippedFiles: string[];
  writtenCount: number;
}

export class GenerateTestsService {
  public static async generate(
    plan: TestPlan,
    guard: WorkspaceGuard,
    options: GenerateTestsOptions = {}
  ): Promise<GenerateTestsResult> {
    const overwritePolicy = options.overwritePolicy || 'generated-only';
    const testCasesToGenerate = options.testCaseIds && options.testCaseIds.length > 0
      ? plan.testCases.filter(tc => options.testCaseIds!.includes(tc.id))
      : plan.testCases;

    const generatedFiles: GeneratedTestFile[] = [];
    const skippedFiles: string[] = [];
    let writtenCount = 0;

    for (const tc of testCasesToGenerate) {
      const generated = TestCodeGenerator.generateTestFile(tc, guard.getRoot());
      const absoluteTarget = guard.resolveSafePath(generated.relativePath);
      const exists = fs.existsSync(absoluteTarget);

      let canWrite = false;
      if (!exists) {
        canWrite = true;
      } else if (overwritePolicy === 'explicit') {
        canWrite = true;
      } else if (overwritePolicy === 'generated-only') {
        // Check if existing file has @qaforge-generated header
        try {
          const existingContent = fs.readFileSync(absoluteTarget, 'utf8');
          if (existingContent.includes('@qaforge-generated')) {
            canWrite = true;
          } else {
            skippedFiles.push(generated.relativePath);
          }
        } catch {
          skippedFiles.push(generated.relativePath);
        }
      } else {
        // 'never'
        skippedFiles.push(generated.relativePath);
      }

      if (canWrite) {
        guard.ensureDirectory(path.dirname(absoluteTarget));
        fs.writeFileSync(absoluteTarget, generated.content, 'utf8');
        generatedFiles.push(generated);
        writtenCount++;
      }
    }

    return {
      generatedFiles,
      skippedFiles,
      writtenCount
    };
  }
}
