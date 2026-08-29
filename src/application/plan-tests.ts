import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';
import type { TestPlan, PlannedTestCase, TestLevel, TestCasePriority } from '../shared/types/tests.js';
import { RiskScorer } from '../domain/risk/risk-scorer.js';

export interface PlanTestsOptions {
  scope?: 'all' | 'uncovered' | 'critical' | 'e2e' | 'api' | 'unit' | 'changed';
  maxTests?: number;
  includeE2E?: boolean;
  includeAPI?: boolean;
  impactedTestFiles?: string[];
}

export class PlanTestsService {
  public static createPlan(
    profile: ProjectProfile,
    requirements: DiscoveredRequirement[],
    options: PlanTestsOptions = {}
  ): TestPlan {
    const planId = `plan-${Date.now()}`;
    const testCases: PlannedTestCase[] = [];
    const coverageGaps: string[] = [];
    const detectedFeatures = new Set<string>();

    const defaultRunner: import('../shared/types/project.js').TestFrameworkType = profile.testFrameworks.includes('vitest')
      ? 'vitest'
      : profile.testFrameworks.includes('jest')
      ? 'jest'
      : 'vitest';

    const hasPlaywright = profile.testFrameworks.includes('playwright');

    // 1. Plan for Discovered Requirements
    for (const req of requirements) {
      const riskScore = RiskScorer.calculateRequirementRisk(req);
      const isUncovered = req.testCoverageStatus === 'uncovered';

      if (isUncovered) {
        coverageGaps.push(`${req.id}: ${req.title}`);
      }

      let testLevel: TestLevel = 'unit';
      let runner: import('../shared/types/project.js').TestFrameworkType = defaultRunner;

      if (req.source === 'openapi' || req.relatedEndpoints.length > 0) {
        testLevel = 'api';
      } else if (req.relatedRoutes.length > 0 || req.category === 'auth') {
        if (hasPlaywright && options.includeE2E !== false) {
          testLevel = 'e2e';
          runner = 'playwright';
        } else {
          testLevel = 'integration';
        }
      }

      const priority: TestCasePriority = req.priority;
      detectedFeatures.add(req.title.split(' ')[0] || 'Core');

      testCases.push({
        id: `TC-${req.id}`,
        title: `Validate ${req.title}`,
        description: req.description,
        type: testLevel,
        priority,
        requirementIds: [req.id],
        targetFiles: req.relatedModules.length > 0 ? req.relatedModules : req.relatedRoutes,
        runner,
        reason: `Spec verification for ${req.id} (Risk Score: ${riskScore})`,
        expectedBehavior: req.description.split('\n')[0] || req.title,
        category: req.category || 'functional',
        steps: req.acceptanceCriteria && req.acceptanceCriteria.length > 0
          ? req.acceptanceCriteria
          : [`Execute test against ${req.title}`, 'Verify status and assertion outcomes'],
        riskScore
      });
    }

    // 2. Plan for Routes if uncovered
    if (options.includeE2E !== false) {
      for (const route of profile.routes) {
        const routeRisk = RiskScorer.calculateRouteRisk(route);
        const existingTest = profile.testFiles.find(t => t.targetedFiles.includes(route.sourceFile));

        if (!existingTest) {
          testCases.push({
            id: `TC-ROUTE-${route.path.replace(/[^a-zA-Z0-9]+/g, '-')}`,
            title: `E2E Flow for Route ${route.path}`,
            description: `Verify that route ${route.path} renders and interactive elements are responsive.`,
            type: 'e2e',
            priority: route.path === '/' ? 'critical' : 'medium',
            requirementIds: [],
            targetFiles: [route.sourceFile],
            runner: hasPlaywright ? 'playwright' : defaultRunner,
            reason: `Frontend route smoke check for ${route.path}`,
            expectedBehavior: `Page at ${route.path} renders without fatal errors.`,
            category: 'functional',
            steps: [`Navigate to baseURL + "${route.path}"`, 'Check page title and key role locators'],
            riskScore: routeRisk
          });
        }
      }
    }

    // 3. Plan for API Endpoints if uncovered
    if (options.includeAPI !== false) {
      for (const ep of profile.apiEndpoints) {
        const epRisk = RiskScorer.calculateEndpointRisk(ep);
        testCases.push({
          id: `TC-API-${ep.method}-${ep.path.replace(/[^a-zA-Z0-9]+/g, '-')}`,
          title: `API Check: ${ep.method} ${ep.path}`,
          description: `Verify response contract and status code for ${ep.method} ${ep.path}.`,
          type: 'api',
          priority: ep.authRequired ? 'critical' : 'high',
          requirementIds: [],
          targetFiles: ep.sourceFile ? [ep.sourceFile] : [],
          runner: defaultRunner,
          reason: `API endpoint validation for ${ep.method} ${ep.path}`,
          expectedBehavior: `Returns valid HTTP status code and response matching schema.`,
          category: ep.authRequired ? 'security' : 'functional',
          steps: [`Send ${ep.method} request to "${ep.path}"`, 'Assert response code and content-type'],
          riskScore: epRisk
        });
      }
    }

    // 4. Apply scope filtering if specified
    let filteredTestCases = testCases;
    if (options.scope && options.scope !== 'all') {
      if (options.scope === 'critical') {
        filteredTestCases = testCases.filter(tc => tc.priority === 'critical');
      } else if (options.scope === 'uncovered') {
        const gapIds = new Set(coverageGaps.map(g => g.split(':')[0]));
        filteredTestCases = testCases.filter(tc => tc.requirementIds.some(id => gapIds.has(id)) || tc.id.startsWith('TC-ROUTE-') || tc.id.startsWith('TC-API-'));
      } else if (options.scope === 'e2e') {
        filteredTestCases = testCases.filter(tc => tc.type === 'e2e');
      } else if (options.scope === 'api') {
        filteredTestCases = testCases.filter(tc => tc.type === 'api');
      } else if (options.scope === 'unit') {
        filteredTestCases = testCases.filter(tc => tc.type === 'unit' || tc.type === 'integration' || tc.type === 'component');
      } else if (options.scope === 'changed') {
        if (options.impactedTestFiles && options.impactedTestFiles.length > 0) {
          const impactedSet = new Set(options.impactedTestFiles.map(f => f.toLowerCase()));
          const matched = testCases.filter(tc =>
            tc.targetFiles.some(tf => impactedSet.has(tf.toLowerCase()) || Array.from(impactedSet).some(imp => imp.includes(tf.toLowerCase()) || tf.toLowerCase().includes(imp)))
          );
          filteredTestCases = matched.length > 0 ? matched : testCases.slice(0, 5);
        }
      }
    }

    // Filter by maxTests / options if specified
    const sortedTestCases = filteredTestCases.sort((a, b) => b.riskScore - a.riskScore);
    const finalTestCases = options.maxTests ? sortedTestCases.slice(0, options.maxTests) : sortedTestCases;

    const byLevel: Record<TestLevel, number> = {
      unit: 0,
      component: 0,
      integration: 0,
      api: 0,
      e2e: 0,
      static: 0
    };
    const byPriority: Record<TestCasePriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const tc of finalTestCases) {
      byLevel[tc.type] = (byLevel[tc.type] || 0) + 1;
      byPriority[tc.priority] = (byPriority[tc.priority] || 0) + 1;
    }

    return {
      planId,
      summary: {
        totalTests: finalTestCases.length,
        byLevel,
        byPriority,
        criticalCount: byPriority.critical,
        estimatedExecutionTimeSec: Math.ceil(finalTestCases.length * 1.5)
      },
      detectedFeatures: Array.from(detectedFeatures),
      risks: [
        {
          area: 'Authentication & Security',
          score: 85,
          reasons: ['Protected routes and API token validation need continuous testing']
        },
        {
          area: 'Data Mutation Endpoints',
          score: 75,
          reasons: ['POST/PUT/DELETE operations require auto-cleanup and rollback protection']
        }
      ],
      testCases: finalTestCases,
      coverageGaps,
      createdAt: new Date().toISOString()
    };
  }
}
