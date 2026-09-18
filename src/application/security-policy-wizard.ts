import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export type SecurityPolicyFramework = 'owasp-asvs' | 'soc2' | 'hipaa' | 'baseline';

export interface SecurityPolicyInitOptions {
  framework?: SecurityPolicyFramework;
  outputPath?: string;
  mergeIntoConfig?: boolean;
}

export interface SecurityPolicyInitResult {
  framework: SecurityPolicyFramework;
  policyPath: string;
  configUpdated: boolean;
  configPath?: string;
  summary: string;
}

const POLICY_BODIES: Record<SecurityPolicyFramework, Record<string, unknown>> = {
  baseline: {
    version: 1,
    framework: 'baseline',
    safeMode: true,
    allowProduction: false,
    categories: {
      authentication: true,
      authorization: true,
      forms_inputs: true,
      injection: true,
      api_security: true,
      sessions_tokens: true,
      file_uploads: true
    },
    sessionTheft: {
      cookieFlags: true,
      urlSessionIds: true,
      fixation: true,
      clientStorage: true,
      logoutInvalidation: true
    }
  },
  'owasp-asvs': {
    version: 1,
    framework: 'owasp-asvs',
    level: 2,
    safeMode: true,
    allowProduction: false,
    categories: {
      authentication: true,
      authorization: true,
      forms_inputs: true,
      injection: true,
      api_security: true,
      sessions_tokens: true,
      file_uploads: true
    },
    asvs: {
      v2_authentication: true,
      v3_session_management: true,
      v4_access_control: true,
      v5_validation: true,
      v13_api: true
    },
    notes: 'Mapped to OWASP ASVS L2 controls for local non-destructive probes.'
  },
  soc2: {
    version: 1,
    framework: 'soc2',
    safeMode: true,
    allowProduction: false,
    trustServices: ['security', 'availability'],
    categories: {
      authentication: true,
      authorization: true,
      sessions_tokens: true,
      api_security: true,
      injection: true,
      forms_inputs: true,
      file_uploads: true
    },
    notes: 'SOC2-oriented control checklist for CC6 access and change management evidence.'
  },
  hipaa: {
    version: 1,
    framework: 'hipaa',
    safeMode: true,
    allowProduction: false,
    categories: {
      authentication: true,
      authorization: true,
      sessions_tokens: true,
      api_security: true,
      injection: true,
      forms_inputs: true,
      file_uploads: false
    },
    phi: {
      redactSecrets: true,
      encryptInTransitRequired: true,
      auditLogoutInvalidation: true
    },
    notes: 'HIPAA-oriented technical safeguard starter — not a compliance certification.'
  }
};

/**
 * Interactive / CLI security policy wizard — writes a starter policy file
 * and optionally merges safe defaults into veloprove.config.json.
 */
export class SecurityPolicyWizard {
  public static initPolicy(
    guard: WorkspaceGuard,
    options: SecurityPolicyInitOptions = {}
  ): SecurityPolicyInitResult {
    const framework = options.framework || 'baseline';
    const root = guard.getRoot();
    const policyPath = path.resolve(root, options.outputPath || 'veloprove.security.json');
    const body = {
      ...POLICY_BODIES[framework],
      generatedAt: new Date().toISOString(),
      generator: 'veloprove security --init-policy'
    };

    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(policyPath, JSON.stringify(body, null, 2), 'utf8');

    let configUpdated = false;
    let configPath: string | undefined;

    if (options.mergeIntoConfig !== false) {
      configPath = path.join(root, 'veloprove.config.json');
      let existing: Record<string, unknown> = {};
      if (fs.existsSync(configPath)) {
        try {
          existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch {
          existing = {};
        }
      }
      const security = {
        ...(typeof existing.security === 'object' && existing.security ? (existing.security as object) : {}),
        enabled: true,
        safeMode: true,
        allowProduction: false,
        environment: 'test',
        policyFile: path.relative(root, policyPath).replace(/\\/g, '/')
      };
      const next = { ...existing, security };
      fs.writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf8');
      configUpdated = true;
    }

    return {
      framework,
      policyPath: path.relative(root, policyPath).replace(/\\/g, '/'),
      configUpdated,
      configPath: configPath ? path.relative(root, configPath).replace(/\\/g, '/') : undefined,
      summary: `Created ${framework} security policy at ${path.relative(root, policyPath).replace(/\\/g, '/')}`
    };
  }

  public static listFrameworks(): SecurityPolicyFramework[] {
    return ['baseline', 'owasp-asvs', 'soc2', 'hipaa'];
  }
}
