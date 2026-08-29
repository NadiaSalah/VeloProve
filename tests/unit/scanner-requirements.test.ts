import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { ProjectScanner } from '../../src/intelligence/project-scanner/index.js';
import { PrdParser } from '../../src/intelligence/requirement-discovery/prd-parser.js';
import { FeatureMapBuilder } from '../../src/intelligence/feature-map/feature-builder.js';

describe('Project Scanner & Requirement Discovery', () => {
  const root = path.resolve(process.cwd());

  it('should inspect and scan QAForge repository structure', () => {
    const profile = ProjectScanner.scan(root);
    expect(profile.projectName).toBe('qaforge');
    expect(profile.languages).toContain('typescript');
    expect(profile.sourceFiles.length).toBeGreaterThan(0);
  });

  it('should parse requirements from PRD markdown file', () => {
    const prdPath = path.join(root, 'QAFORGE_PRD.md');
    const reqs = PrdParser.parseFile(prdPath, root);
    expect(reqs.length).toBeGreaterThan(5);

    const firstReq = reqs[0];
    expect(firstReq.id).toMatch(/^REQ-/);
    expect(firstReq.title).toBeDefined();
    expect(firstReq.priority).toBeDefined();
  });

  it('should build structured feature map from discovered requirements', () => {
    const profile = ProjectScanner.scan(root);
    const prdPath = path.join(root, 'QAFORGE_PRD.md');
    const reqs = PrdParser.parseFile(prdPath, root);
    const featureMap = FeatureMapBuilder.build(reqs, profile);

    expect(featureMap.features.length).toBeGreaterThan(0);
    expect(featureMap.features[0].useCases.length).toBeGreaterThan(0);
  });
});
