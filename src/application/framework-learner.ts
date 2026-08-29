import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { CustomFrameworkDefinition, RouteDefinition, ApiEndpoint } from '../shared/types/project.js';

export interface LearnFrameworkRequest {
  instructions?: string;
  manifestPath?: string;
  definition?: CustomFrameworkDefinition;
}

export interface LearnFrameworkResult {
  learned: boolean;
  frameworkName: string;
  configPath: string;
  definition: CustomFrameworkDefinition;
  inferredRoutesCount: number;
  inferredApisCount: number;
  summary: string;
}

export class FrameworkLearnerService {
  /**
   * Discovers and parses custom framework definitions from AGENTS.md,
   * qaforge.framework.json, qaforge.config.json or explicit agent prompts.
   */
  public static loadCustomFramework(guard: WorkspaceGuard): CustomFrameworkDefinition | null {
    const root = guard.getRoot();

    // 1. Check qaforge.framework.json
    const dedicatedConfig = path.join(root, 'qaforge.framework.json');
    if (fs.existsSync(dedicatedConfig)) {
      try {
        return JSON.parse(fs.readFileSync(dedicatedConfig, 'utf8'));
      } catch {
        // ignore invalid JSON
      }
    }

    // 2. Check .qaforge/framework.json
    const localStoreConfig = path.join(guard.getQAForgeDirectory(), 'framework.json');
    if (fs.existsSync(localStoreConfig)) {
      try {
        return JSON.parse(fs.readFileSync(localStoreConfig, 'utf8'));
      } catch {
        // ignore invalid JSON
      }
    }

    // 3. Parse AGENTS.md or AGENT.md or CLAUDE.md if available
    const agentFiles = ['AGENTS.md', 'AGENT.md', 'CLAUDE.md', 'FRAMEWORK.md', '.cursorrules'];
    for (const filename of agentFiles) {
      const agentFilePath = path.join(root, filename);
      if (fs.existsSync(agentFilePath)) {
        const content = fs.readFileSync(agentFilePath, 'utf8');
        const parsed = this.parseFromMarkdown(content);
        if (parsed) {
          return parsed;
        }
      }
    }

    return null;
  }

  /**
   * Teaches QAForge a new framework dynamically and persists the definition.
   */
  public static learn(guard: WorkspaceGuard, request: LearnFrameworkRequest = {}): LearnFrameworkResult {
    let definition: CustomFrameworkDefinition;

    if (request.definition) {
      definition = request.definition;
    } else if (request.instructions) {
      definition = this.parseFromMarkdown(request.instructions) || {
        frameworkName: 'CustomAgentFramework',
        routeConvention: {
          directory: 'src/pages',
          extractRouteFromPath: true
        },
        devServer: {
          command: 'npm run dev',
          defaultPort: 3000
        },
        specialInstructions: [request.instructions]
      };
    } else {
      const discovered = this.loadCustomFramework(guard);
      if (!discovered) {
        throw new Error('No custom framework definition found in AGENTS.md, qaforge.framework.json, or instructions.');
      }
      definition = discovered;
    }

    // Persist to qaforge.framework.json in project root and .qaforge directory
    const targetFile = path.join(guard.getRoot(), 'qaforge.framework.json');
    fs.writeFileSync(targetFile, JSON.stringify(definition, null, 2), 'utf8');

    const localTarget = path.join(guard.getQAForgeDirectory(), 'framework.json');
    fs.writeFileSync(localTarget, JSON.stringify(definition, null, 2), 'utf8');

    const scanned = this.scanWithCustomFramework(guard, definition);

    return {
      learned: true,
      frameworkName: definition.frameworkName || 'CustomFramework',
      configPath: path.relative(guard.getRoot(), targetFile).replace(/\\/g, '/'),
      definition,
      inferredRoutesCount: scanned.routes.length,
      inferredApisCount: scanned.apiEndpoints.length,
      summary: `Successfully learned custom framework "${definition.frameworkName}". Discovered ${scanned.routes.length} route(s) and ${scanned.apiEndpoints.length} endpoint(s).`
    };
  }

  /**
   * Scans project files using the custom framework conventions.
   */
  public static scanWithCustomFramework(
    guard: WorkspaceGuard,
    definition: CustomFrameworkDefinition
  ): { routes: RouteDefinition[]; apiEndpoints: ApiEndpoint[] } {
    const routes: RouteDefinition[] = [];
    const apiEndpoints: ApiEndpoint[] = [];
    const root = guard.getRoot();

    const targetDir = definition.routeConvention?.directory || 'src';
    const scanPath = path.join(root, targetDir);

    if (!fs.existsSync(scanPath)) {
      return { routes, apiEndpoints };
    }

    const extensions = definition.fileExtensions || ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.php', '.py', '.rb'];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!['node_modules', '.git', 'dist', '.qaforge'].includes(e.name)) {
            walk(full);
          }
        } else if (extensions.some(ext => e.name.endsWith(ext))) {
          const relFromScan = path.relative(scanPath, full).replace(/\\/g, '/');
          const relFromRoot = path.relative(root, full).replace(/\\/g, '/');

          // Extract route path
          const cleanRoute = '/' + relFromScan.replace(/\.[^/.]+$/, '').replace(/\/index$/, '');
          const normalizedRoute = cleanRoute === '/index' || cleanRoute === '' ? '/' : cleanRoute;

          const content = fs.readFileSync(full, 'utf8');

          // Check if file acts as API route
          const isApi = relFromRoot.toLowerCase().includes('api') || /api|endpoint|controller/i.test(e.name);
          if (isApi) {
            const methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            let detectedMethod = false;

            for (const m of methods) {
              if (
                new RegExp(`(?:function|def|export)\\s+${m}\\b`, 'i').test(content) ||
                new RegExp(`\\.(?:${m.toLowerCase()})\\(`, 'i').test(content)
              ) {
                detectedMethod = true;
                apiEndpoints.push({
                  method: m,
                  path: normalizedRoute,
                  sourceFile: relFromRoot,
                  description: `Custom framework endpoint (${definition.frameworkName})`
                });
              }
            }

            if (!detectedMethod) {
              apiEndpoints.push({
                method: 'GET',
                path: normalizedRoute,
                sourceFile: relFromRoot,
                description: `Custom framework endpoint (${definition.frameworkName})`
              });
            }
          } else {
            routes.push({
              path: normalizedRoute,
              sourceFile: relFromRoot,
              type: 'page',
              isDynamic: normalizedRoute.includes(':') || normalizedRoute.includes('[') || normalizedRoute.includes('{')
            });
          }
        }
      }
    };

    walk(scanPath);
    return { routes, apiEndpoints };
  }

  /**
   * Heuristically parses structured YAML/JSON or Markdown blocks inside AGENTS.md
   */
  private static parseFromMarkdown(markdown: string): CustomFrameworkDefinition | null {
    // Look for ```json qaforge-framework or ```json framework block
    const jsonMatch = markdown.match(/```(?:json|qaforge-framework|framework)\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.frameworkName || parsed.routeConvention) {
          return parsed;
        }
      } catch {
        // ignore parse error
      }
    }

    // Heuristic markdown section extraction:
    // e.g. "## Framework: CustomX", "Routes: src/views", "Dev: npm run start:custom"
    const nameMatch = markdown.match(/(?:Framework|Custom Framework|Stack):\s*([A-Za-z0-9_\-]+)/i);
    const routesMatch = markdown.match(/(?:Routes? Directory|Pages? Path|Router):\s*`?([a-zA-Z0-9_\-\/]+)`?/i);
    const devCmdMatch = markdown.match(/(?:Dev Command|Start Command|Run Dev):\s*`?([^`\r\n]+)`?/i);
    const portMatch = markdown.match(/(?:Port|Default Port):\s*([0-9]+)/i);

    if (nameMatch || routesMatch || devCmdMatch) {
      return {
        frameworkName: nameMatch ? nameMatch[1] : 'CustomAgentFramework',
        routeConvention: {
          directory: routesMatch ? routesMatch[1] : 'src/pages',
          extractRouteFromPath: true
        },
        devServer: {
          command: devCmdMatch ? devCmdMatch[1].trim() : 'npm run dev',
          defaultPort: portMatch ? parseInt(portMatch[1], 10) : 3000
        },
        specialInstructions: [markdown.slice(0, 500)]
      };
    }

    return null;
  }
}
