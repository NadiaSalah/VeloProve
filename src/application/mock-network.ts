import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';

export interface GeneratedMockFile {
  filePath: string;
  relativePath: string;
  handlerCount: number;
  framework: 'msw' | 'fetch-mock' | 'playwright-route';
}

export interface MockNetworkResult {
  generatedFiles: GeneratedMockFile[];
  totalHandlers: number;
  outputDir: string;
}

export class MockNetworkGenerator {
  public static generate(
    profile: ProjectProfile,
    requirements: DiscoveredRequirement[],
    guard: WorkspaceGuard
  ): MockNetworkResult {
    const root = guard.getRoot();
    const mocksDir = path.join(root, 'src', 'mocks');
    if (!fs.existsSync(mocksDir)) {
      fs.mkdirSync(mocksDir, { recursive: true });
    }

    const endpoints = profile.apiEndpoints;
    const handlersCode: string[] = [];

    for (const ep of endpoints) {
      const method = ep.method.toLowerCase();
      const mockData = {
        id: 'mock_1',
        name: 'Mock Response Item',
        status: 'active',
        timestamp: new Date().toISOString()
      };

      handlersCode.push(`  // Mock handler for ${ep.method} ${ep.path}
  http.${method}('${ep.path}', () => {
    return HttpResponse.json(${JSON.stringify(mockData, null, 4)});
  }),`);
    }

    if (handlersCode.length === 0) {
      handlersCode.push(`  // Default fallback mock handler
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', mocked: true });
  }),`);
    }

    const mswHandlersContent = `import { http, HttpResponse } from 'msw';

export const handlers = [
${handlersCode.join('\n\n')}
];
`;

    const handlersFile = path.join(mocksDir, 'handlers.ts');
    fs.writeFileSync(handlersFile, mswHandlersContent, 'utf8');

    const browserSetupContent = `import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);
`;
    const browserFile = path.join(mocksDir, 'browser.ts');
    fs.writeFileSync(browserFile, browserSetupContent, 'utf8');

    return {
      generatedFiles: [
        {
          filePath: handlersFile,
          relativePath: path.relative(root, handlersFile).replace(/\\/g, '/'),
          handlerCount: Math.max(1, endpoints.length),
          framework: 'msw'
        },
        {
          filePath: browserFile,
          relativePath: path.relative(root, browserFile).replace(/\\/g, '/'),
          handlerCount: 0,
          framework: 'msw'
        }
      ],
      totalHandlers: Math.max(1, endpoints.length),
      outputDir: path.relative(root, mocksDir).replace(/\\/g, '/')
    };
  }
}
