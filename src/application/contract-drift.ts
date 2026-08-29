import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';

export interface ContractDriftItem {
  endpoint: string;
  method: string;
  driftType: 'missing_in_spec' | 'missing_in_code' | 'schema_mismatch' | 'auth_mismatch';
  description: string;
  severity: 'high' | 'medium' | 'low';
  remedyAction: string;
}

export interface ContractDriftReport {
  totalEndpointsChecked: number;
  driftDetectedCount: number;
  drifts: ContractDriftItem[];
  compatibilityScore: number; // 0 - 100
  timestamp: string;
}

export class ContractDriftService {
  public static detectDrift(
    profile: ProjectProfile,
    requirements: DiscoveredRequirement[]
  ): ContractDriftReport {
    const drifts: ContractDriftItem[] = [];
    const openApiReqs = requirements.filter(r => r.source === 'openapi');

    const normalizePath = (p: string): string => {
      return p
        .trim()
        .toLowerCase()
        .replace(/\{[^}]+\}/g, ':param')
        .replace(/:[a-zA-Z0-9_-]+/g, ':param')
        .replace(/\/+/g, '/')
        .replace(/\/$/, '');
    };

    // 1. Check endpoints in code vs documented OpenAPI endpoints
    for (const ep of profile.apiEndpoints) {
      const epNorm = normalizePath(ep.path);
      const isDocumented = openApiReqs.some(r =>
        r.relatedEndpoints.some(target => {
          const [m, p] = target.split(' ');
          return m.toUpperCase() === ep.method.toUpperCase() && normalizePath(p || target) === epNorm;
        }) || r.title.toLowerCase().includes(epNorm)
      );

      if (!isDocumented && openApiReqs.length > 0) {
        drifts.push({
          endpoint: ep.path,
          method: ep.method,
          driftType: 'missing_in_spec',
          description: `Endpoint ${ep.method} ${ep.path} exists in source code but is missing from OpenAPI specification.`,
          severity: 'medium',
          remedyAction: `Add ${ep.method} ${ep.path} to openapi.json or generate documentation.`
        });
      }
    }

    // 2. Check documented endpoints missing in code
    for (const req of openApiReqs) {
      for (const target of req.relatedEndpoints) {
        const [method, epPath] = target.split(' ');
        const targetNorm = normalizePath(epPath || target);
        const existsInCode = profile.apiEndpoints.some(
          e => e.method.toUpperCase() === (method || 'GET').toUpperCase() && normalizePath(e.path) === targetNorm
        );

        if (!existsInCode && profile.apiEndpoints.length > 0) {
          drifts.push({
            endpoint: epPath || target,
            method: method || 'GET',
            driftType: 'missing_in_code',
            description: `Documented endpoint ${target} was not found in active application routes.`,
            severity: 'high',
            remedyAction: `Implement route handler for ${target} or remove obsolete endpoint from spec.`
          });
        }
      }
    }

    const totalEndpoints = Math.max(1, profile.apiEndpoints.length + openApiReqs.length);
    const score = Math.max(0, Math.round(((totalEndpoints - drifts.length) / totalEndpoints) * 100));

    return {
      totalEndpointsChecked: totalEndpoints,
      driftDetectedCount: drifts.length,
      drifts,
      compatibilityScore: score,
      timestamp: new Date().toISOString()
    };
  }
}
