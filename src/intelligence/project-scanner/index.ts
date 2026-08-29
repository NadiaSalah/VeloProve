import type { ProjectProfile } from '../../shared/types/project.js';
import { StackDetector } from './stack-detector.js';
import { RouteScanner } from './route-scanner.js';
import { SourceMapper } from './source-mapper.js';

export class ProjectScanner {
  public static scan(projectRoot: string): ProjectProfile {
    const stack = StackDetector.detect(projectRoot);
    const { routes, apiEndpoints } = RouteScanner.scan(projectRoot);
    const { sourceFiles, testFiles } = SourceMapper.scan(projectRoot);

    const apps = [
      {
        name: stack.projectName,
        root: '.',
        framework: stack.frameworks[0] || 'vanilla',
        buildTool: stack.buildTools[0],
        devCommand: stack.devCommand,
        defaultPort: stack.defaultPort,
        routes,
        apiEndpoints
      }
    ];

    return {
      root: projectRoot,
      projectName: stack.projectName,
      packageManager: stack.packageManager,
      workspaceType: stack.workspaceType,
      languages: stack.languages,
      frameworks: stack.frameworks,
      buildTools: stack.buildTools,
      testFrameworks: stack.testFrameworks,
      apps,
      routes,
      apiEndpoints,
      sourceFiles,
      testFiles,
      capabilities: stack.capabilities,
      warnings: stack.warnings,
      scanTimestamp: new Date().toISOString()
    };
  }
}
