import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredRequirement } from '../../shared/types/requirements.js';
import type { ApiEndpoint } from '../../shared/types/project.js';

export class OpenApiParser {
  public static parseFile(
    filePath: string,
    root: string
  ): { requirements: DiscoveredRequirement[]; endpoints: ApiEndpoint[] } {
    if (!fs.existsSync(filePath)) return { requirements: [], endpoints: [] };

    const requirements: DiscoveredRequirement[] = [];
    const endpoints: ApiEndpoint[] = [];
    const relPath = path.relative(root, filePath).replace(/\\/g, '/');

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const doc = JSON.parse(raw); // Support JSON openapi

      if (doc.paths) {
        let index = 1;
        for (const [endpointPath, pathItem] of Object.entries<any>(doc.paths)) {
          const methods = ['get', 'post', 'put', 'delete', 'patch'];
          for (const method of methods) {
            if (pathItem[method]) {
              const op = pathItem[method];
              const upperMethod = method.toUpperCase() as ApiEndpoint['method'];
              const opTitle = op.summary || `${upperMethod} ${endpointPath}`;
              const opDesc = op.description || opTitle;

              const reqId = `REQ-API-${upperMethod}-${String(index++).padStart(3, '0')}`;
              
              requirements.push({
                id: reqId,
                title: opTitle,
                description: `${upperMethod} ${endpointPath}: ${opDesc}`,
                source: 'openapi',
                sourceLocation: { file: relPath },
                priority: op.security ? 'critical' : 'high',
                confidence: 0.98,
                category: op.security ? 'security' : 'functional',
                relatedModules: [],
                relatedRoutes: [],
                relatedEndpoints: [`${upperMethod} ${endpointPath}`],
                testCoverageStatus: 'uncovered'
              });

              endpoints.push({
                method: upperMethod,
                path: endpointPath,
                description: opDesc,
                authRequired: !!op.security,
                parameters: op.parameters?.map((p: any) => ({
                  name: p.name,
                  in: p.in,
                  required: p.required,
                  type: p.schema?.type || 'string'
                }))
              });
            }
          }
        }
      }
    } catch {
      // ignore JSON parse errors for non-json or invalid openapi
    }

    return { requirements, endpoints };
  }
}
