import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';

export interface BddScenario {
  name: string;
  given: string[];
  when: string[];
  then: string[];
}

export interface BddFeatureFile {
  featureName: string;
  description: string;
  scenarios: BddScenario[];
  featureText: string;
  stepDefinitionsCode: string;
  savedPath?: string;
}

export class BddGeneratorService {
  public static generateFromRequirements(
    guard: WorkspaceGuard,
    requirements: DiscoveredRequirement[],
    outputDir = 'features'
  ): BddFeatureFile[] {
    const results: BddFeatureFile[] = [];

    for (const req of requirements) {
      const featureName = req.title.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      const filename = `${req.id.toLowerCase()}_${featureName.toLowerCase().replace(/\s+/g, '_')}.feature`;

      const scenarios: BddScenario[] = [
        {
          name: `Happy path verification for ${req.title}`,
          given: [`the application is initialized and healthy`, `user has required test permissions`],
          when: [`user executes the primary action for "${req.title}"`],
          then: [`the system should return success status`, `the state should be accurately updated`]
        },
        {
          name: `Edge case & validation error handling for ${req.title}`,
          given: [`the application is running`],
          when: [`an invalid or empty request payload is dispatched`],
          then: [`the system should reject the request gracefully with client error code`]
        }
      ];

      const featureLines = [
        `@req-${req.id} @priority-${req.priority}`,
        `Feature: ${featureName}`,
        `  As a system user or client`,
        `  I want to verify "${req.title}"`,
        `  So that requirements in category "${req.category}" are fully compliant\n`
      ];

      for (const sc of scenarios) {
        featureLines.push(`  Scenario: ${sc.name}`);
        sc.given.forEach(g => featureLines.push(`    Given ${g}`));
        sc.when.forEach(w => featureLines.push(`    When ${w}`));
        sc.then.forEach(t => featureLines.push(`    Then ${t}`));
        featureLines.push('');
      }

      const featureText = featureLines.join('\n');

      // Generate step definition boilerplate
      const stepDefs = `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('the application is initialized and healthy', async function () {
  // Setup step
});

When('user executes the primary action for "${req.title}"', async function () {
  // Action step
});

Then('the system should return success status', async function () {
  // Assertion step
});
`;

      let savedPath: string | undefined;
      if (outputDir) {
        try {
          const resolvedDir = guard.resolveSafePath(outputDir);
          if (!fs.existsSync(resolvedDir)) {
            fs.mkdirSync(resolvedDir, { recursive: true });
          }
          savedPath = path.join(resolvedDir, filename);
          fs.writeFileSync(savedPath, featureText, 'utf8');
        } catch {}
      }

      results.push({
        featureName,
        description: req.description || req.title,
        scenarios,
        featureText,
        stepDefinitionsCode: stepDefs,
        savedPath
      });
    }

    return results;
  }
}
