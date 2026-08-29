import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredRequirement } from '../../shared/types/requirements.js';
import type { ProjectProfile } from '../../shared/types/project.js';
import { PrdParser } from './prd-parser.js';
import { OpenApiParser } from './openapi-parser.js';

export class RequirementDiscovery {
  public static discover(projectProfile: ProjectProfile): DiscoveredRequirement[] {
    const root = projectProfile.root;
    const requirements: DiscoveredRequirement[] = [];

    // 1. Scan for PRDs and Markdown specs
    const docCandidates = [
      'PRD.md',
      'README.md',
      'SPEC.md',
      'REQUIREMENTS.md',
      'docs/PRD.md',
      'docs/spec.md'
    ];

    for (const cand of docCandidates) {
      const fullPath = path.join(root, cand);
      if (fs.existsSync(fullPath)) {
        const found = PrdParser.parseFile(fullPath, root);
        requirements.push(...found);
      }
    }

    // 2. Scan for OpenAPI specs
    const apiCandidates = [
      'openapi.json',
      'swagger.json',
      'api-spec.json',
      'docs/openapi.json'
    ];

    for (const cand of apiCandidates) {
      const fullPath = path.join(root, cand);
      if (fs.existsSync(fullPath)) {
        const { requirements: apiReqs, endpoints } = OpenApiParser.parseFile(fullPath, root);
        requirements.push(...apiReqs);
        // Enrich project profile endpoints
        for (const ep of endpoints) {
          if (!projectProfile.apiEndpoints.some(e => e.method === ep.method && e.path === ep.path)) {
            projectProfile.apiEndpoints.push(ep);
          }
        }
      }
    }

    // 3. Fallback: If no requirements found from docs, derive from routes and endpoints
    if (requirements.length === 0) {
      let index = 1;
      for (const route of projectProfile.routes) {
        requirements.push({
          id: `REQ-ROUTE-${String(index++).padStart(3, '0')}`,
          title: `Render ${route.path} page`,
          description: `Verify that ${route.path} loads and renders expected UI components without errors.`,
          source: 'route',
          sourceLocation: { file: route.sourceFile },
          priority: route.path === '/' ? 'critical' : 'medium',
          confidence: 0.75,
          category: 'functional',
          relatedModules: [route.sourceFile],
          relatedRoutes: [route.path],
          relatedEndpoints: [],
          testCoverageStatus: 'uncovered'
        });
      }

      for (const ep of projectProfile.apiEndpoints) {
        requirements.push({
          id: `REQ-API-${ep.method}-${String(index++).padStart(3, '0')}`,
          title: `${ep.method} ${ep.path}`,
          description: `Validate ${ep.method} ${ep.path} contract, parameter validation, and response.`,
          source: 'route',
          sourceLocation: { file: ep.sourceFile || '' },
          priority: ep.authRequired ? 'critical' : 'high',
          confidence: 0.8,
          category: ep.authRequired ? 'security' : 'functional',
          relatedModules: ep.sourceFile ? [ep.sourceFile] : [],
          relatedRoutes: [],
          relatedEndpoints: [`${ep.method} ${ep.path}`],
          testCoverageStatus: 'uncovered'
        });
      }
    }

    // 4. Map requirements to existing tests
    for (const req of requirements) {
      for (const testFile of projectProfile.testFiles) {
        const testName = testFile.relativePath.toLowerCase();
        const reqTitle = req.title.toLowerCase();
        if (testName.includes(reqTitle) || req.relatedModules.some(m => testFile.targetedFiles.includes(m))) {
          req.testCoverageStatus = 'covered';
          req.assignedTestIds = req.assignedTestIds || [];
          req.assignedTestIds.push(testFile.relativePath);
        }
      }
    }

    return requirements;
  }
}
