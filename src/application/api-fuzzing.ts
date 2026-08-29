import type { ApiEndpoint } from '../shared/types/project.js';
import type { ApiTestStep } from '../adapters/api/api-runner.js';

export interface FuzzProbeResult {
  endpoint: string;
  method: string;
  probeType: 'boundary' | 'type_mismatch' | 'auth_bypass' | 'injection_probe' | 'missing_fields';
  testStep: ApiTestStep;
  riskDescription: string;
}

export class ApiFuzzingService {
  public static generateFuzzProbes(endpoints: ApiEndpoint[]): FuzzProbeResult[] {
    const probes: FuzzProbeResult[] = [];

    for (const ep of endpoints) {
      const method = ep.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) continue;

      // 1. Auth Bypass Probe if auth required
      if (ep.authRequired) {
        probes.push({
          endpoint: ep.path,
          method: ep.method,
          probeType: 'auth_bypass',
          riskDescription: 'Verify endpoint returns 401/403 when no authentication header is supplied.',
          testStep: {
            id: `FUZZ-AUTH-${method}-${ep.path.replace(/[^a-zA-Z0-9]+/g, '-')}`,
            name: `Security Probe: Unauthorized access should be blocked`,
            method,
            path: ep.path,
            headers: {}, // explicitly empty auth
            expectedStatus: 401
          }
        });
      }

      // 2. Missing Payload / Empty JSON Probe on POST/PUT
      if (method === 'POST' || method === 'PUT') {
        probes.push({
          endpoint: ep.path,
          method: ep.method,
          probeType: 'missing_fields',
          riskDescription: 'Verify endpoint returns 400 Bad Request on empty or malformed payload.',
          testStep: {
            id: `FUZZ-EMPTY-${method}-${ep.path.replace(/[^a-zA-Z0-9]+/g, '-')}`,
            name: `Validation Probe: Empty payload returns 400`,
            method,
            path: ep.path,
            body: {},
            expectedStatus: 400
          }
        });

        // 3. Injection / Boundary probe
        probes.push({
          endpoint: ep.path,
          method: ep.method,
          probeType: 'injection_probe',
          riskDescription: 'Verify endpoint handles unexpected string length and special chars safely.',
          testStep: {
            id: `FUZZ-INJECT-${method}-${ep.path.replace(/[^a-zA-Z0-9]+/g, '-')}`,
            name: `Boundary Probe: Special character injection handling`,
            method,
            path: ep.path,
            body: {
              testPayload: "' OR '1'='1' --",
              overflow: 'A'.repeat(5000)
            },
            expectedStatus: 400
          }
        });
      }
    }

    return probes;
  }
}
