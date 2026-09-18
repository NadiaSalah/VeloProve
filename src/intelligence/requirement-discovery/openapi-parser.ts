import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredRequirement } from '../../shared/types/requirements.js';
import type { ApiEndpoint } from '../../shared/types/project.js';

function pickExampleFromSchema(schema: Record<string, unknown> | undefined): unknown {
  if (!schema || typeof schema !== 'object') return undefined;
  if ('example' in schema) return schema.example;
  if (schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
      if (prop && typeof prop === 'object' && 'example' in prop) {
        out[key] = prop.example;
      } else if (prop?.default !== undefined) {
        out[key] = prop.default;
      } else if (prop?.type === 'string') {
        out[key] = 'string';
      } else if (prop?.type === 'number' || prop?.type === 'integer') {
        out[key] = 0;
      } else if (prop?.type === 'boolean') {
        out[key] = false;
      } else if (prop?.type === 'array') {
        out[key] = [];
      } else {
        out[key] = null;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  if (schema.type === 'array') {
    const itemEx = pickExampleFromSchema(schema.items as Record<string, unknown> | undefined);
    return itemEx !== undefined ? [itemEx] : [];
  }
  return undefined;
}

function extractExampleResponse(op: Record<string, unknown>): unknown {
  const responses = op.responses as Record<string, unknown> | undefined;
  if (!responses || typeof responses !== 'object') return undefined;

  const preferredKeys = ['200', '201', 'default', ...Object.keys(responses)];
  for (const key of preferredKeys) {
    const resp = responses[key] as Record<string, unknown> | undefined;
    if (!resp || typeof resp !== 'object') continue;
    const content = resp.content as Record<string, unknown> | undefined;
    if (!content || typeof content !== 'object') continue;

    const json =
      (content['application/json'] as Record<string, unknown> | undefined) ||
      (content['application/vnd.api+json'] as Record<string, unknown> | undefined) ||
      (Object.values(content)[0] as Record<string, unknown> | undefined);
    if (!json || typeof json !== 'object') continue;

    if (json.example !== undefined) return json.example;
    if (json.examples && typeof json.examples === 'object') {
      const first = Object.values(json.examples as Record<string, Record<string, unknown>>)[0];
      if (first?.value !== undefined) return first.value;
      if (first?.example !== undefined) return first.example;
    }
    const fromSchema = pickExampleFromSchema(json.schema as Record<string, unknown> | undefined);
    if (fromSchema !== undefined) return fromSchema;
  }
  return undefined;
}

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
        for (const [endpointPath, pathItem] of Object.entries<Record<string, unknown>>(doc.paths)) {
          const methods = ['get', 'post', 'put', 'delete', 'patch'];
          for (const method of methods) {
            if (pathItem[method]) {
              const op = pathItem[method] as Record<string, unknown>;
              const upperMethod = method.toUpperCase() as ApiEndpoint['method'];
              const opTitle = (op.summary as string) || `${upperMethod} ${endpointPath}`;
              const opDesc = (op.description as string) || opTitle;
              const exampleResponse = extractExampleResponse(op);

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

              const parameters = Array.isArray(op.parameters)
                ? (op.parameters as Array<Record<string, unknown>>).map((p) => ({
                    name: String(p.name || ''),
                    in: (p.in as 'query' | 'path' | 'header' | 'body') || 'query',
                    required: Boolean(p.required),
                    type: ((p.schema as Record<string, unknown> | undefined)?.type as string) || 'string'
                  }))
                : undefined;

              endpoints.push({
                method: upperMethod,
                path: endpointPath,
                description: opDesc,
                authRequired: !!op.security,
                parameters,
                exampleResponse
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
