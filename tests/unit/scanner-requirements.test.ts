import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
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
    const samplePrdContent = `# Product Requirements Document (PRD)

### REQ-01: User Authentication & Session Security
Users must be able to log in with secure password and retrieve JWT tokens.
Priority: high
Category: security

### REQ-02: Test Case Generation & Planning
The engine must analyze routes and automatically construct prioritized risk-scored test plans.
Priority: critical
Category: e2e

### REQ-03: Real-Time Webhook Alert Dispatcher
Send immediate test alerts to Slack, Discord, and Teams.
Priority: medium
Category: integration
`;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qaforge-prd-test-'));
    try {
      const prdPath = path.join(tempDir, 'PRD.md');
      fs.writeFileSync(prdPath, samplePrdContent, 'utf8');

      const reqs = PrdParser.parseFile(prdPath, tempDir);
      expect(reqs.length).toBeGreaterThanOrEqual(3);

      const firstReq = reqs[0];
      expect(firstReq.id).toMatch(/^REQ-/);
      expect(firstReq.title).toBeDefined();
      expect(firstReq.priority).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should build structured feature map from discovered requirements', () => {
    const profile = ProjectScanner.scan(root);
    const samplePrdContent = `# PRD
### REQ-01: User Authentication
Users must be able to authenticate.
Priority: high
Category: auth
`;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qaforge-featmap-test-'));
    try {
      const prdPath = path.join(tempDir, 'PRD.md');
      fs.writeFileSync(prdPath, samplePrdContent, 'utf8');

      const reqs = PrdParser.parseFile(prdPath, tempDir);
      const featureMap = FeatureMapBuilder.build(reqs, profile);

      expect(featureMap.features.length).toBeGreaterThan(0);
      expect(featureMap.features[0].useCases.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
