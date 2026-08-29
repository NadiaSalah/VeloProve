import fs from 'node:fs';
import path from 'node:path';
import type { ProjectProfile, ApplicationTarget } from '../../shared/types/project.js';
import { StackDetector } from './stack-detector.js';
import { RouteScanner } from './route-scanner.js';
import { SourceMapper } from './source-mapper.js';

export class ProjectScanner {
  public static scan(projectRoot: string): ProjectProfile {
    const stack = StackDetector.detect(projectRoot);
    const { routes, apiEndpoints } = RouteScanner.scan(projectRoot);
    const { sourceFiles, testFiles } = SourceMapper.scan(projectRoot);

    const apps: ApplicationTarget[] = [
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

    // Detect monorepo sub-applications (packages/*, apps/*, services/*, libs/*)
    const monorepoDirs = ['apps', 'packages', 'services', 'libs'];
    for (const folder of monorepoDirs) {
      const parentDir = path.join(projectRoot, folder);
      if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
        try {
          const subEntries = fs.readdirSync(parentDir, { withFileTypes: true });
          for (const entry of subEntries) {
            if (entry.isDirectory()) {
              const subRoot = path.join(parentDir, entry.name);
              const subPkgPath = path.join(subRoot, 'package.json');
              if (fs.existsSync(subPkgPath)) {
                try {
                  const subPkg = JSON.parse(fs.readFileSync(subPkgPath, 'utf8'));
                  const subStack = StackDetector.detect(subRoot);
                  apps.push({
                    name: subPkg.name || `${folder}/${entry.name}`,
                    root: path.relative(projectRoot, subRoot),
                    framework: subStack.frameworks[0] || 'nodejs',
                    buildTool: subStack.buildTools[0],
                    devCommand: subStack.devCommand,
                    defaultPort: subStack.defaultPort,
                    routes: [],
                    apiEndpoints: []
                  });
                } catch {
                  // ignore sub-pkg read error
                }
              }
            }
          }
        } catch {
          // ignore directory read error
        }
      }
    }

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
