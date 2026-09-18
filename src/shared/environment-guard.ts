/**
 * Target environment classification for safety gates.
 * Destructive / intrusive probes must not run on production or unknown remotes by default.
 */

export type TargetEnvironment = 'development' | 'test' | 'staging' | 'production' | 'unknown';

export interface EnvironmentAssessment {
  environment: TargetEnvironment;
  confidence: number;
  reasons: string[];
  allowIntrusiveProbes: boolean;
  blockReason?: string;
}

export interface EnvironmentPolicyOptions {
  configured?: 'test' | 'staging' | 'production' | 'local' | 'development';
  baseURL?: string;
  allowProduction?: boolean;
  allowUnknownRemote?: boolean;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal']);

export class EnvironmentGuard {
  public static assess(options: EnvironmentPolicyOptions = {}): EnvironmentAssessment {
    const reasons: string[] = [];
    let environment: TargetEnvironment = 'unknown';
    let confidence = 0.4;

    if (options.configured === 'local' || options.configured === 'development') {
      environment = 'development';
      confidence = 0.85;
      reasons.push(`Config environment=${options.configured}`);
    } else if (options.configured === 'test') {
      environment = 'test';
      confidence = 0.85;
      reasons.push('Config environment=test');
    } else if (options.configured === 'staging') {
      environment = 'staging';
      confidence = 0.9;
      reasons.push('Config environment=staging');
    } else if (options.configured === 'production') {
      environment = 'production';
      confidence = 0.95;
      reasons.push('Config environment=production');
    }

    const url = options.baseURL || '';
    if (url) {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        if (LOCAL_HOSTS.has(host) || host.endsWith('.local')) {
          if (environment === 'unknown') {
            environment = 'development';
            confidence = 0.8;
          }
          reasons.push(`Local host detected: ${host}`);
        } else if (/\bprod\b|production|prd\./i.test(host) || /\.prod\./i.test(host)) {
          environment = 'production';
          confidence = Math.max(confidence, 0.9);
          reasons.push(`Production-like host: ${host}`);
        } else if (/stag|uat|qa\./i.test(host)) {
          if (environment === 'unknown' || environment === 'development') {
            environment = 'staging';
            confidence = Math.max(confidence, 0.75);
          }
          reasons.push(`Staging-like host: ${host}`);
        } else if (environment === 'unknown') {
          environment = 'unknown';
          confidence = 0.5;
          reasons.push(`Remote host without clear env markers: ${host}`);
        }
      } catch {
        reasons.push('Invalid baseURL — treating target as unknown');
        environment = 'unknown';
        confidence = 0.3;
      }
    }

    let allowIntrusiveProbes = true;
    let blockReason: string | undefined;

    if (environment === 'production' && options.allowProduction !== true) {
      allowIntrusiveProbes = false;
      blockReason =
        'Target environment is production and allowProduction is false. Refusing intrusive security tests in accordance with Safe Security Mode.';
    } else if (environment === 'unknown' && url && !EnvironmentGuard.isLocalUrl(url)) {
      if (options.allowUnknownRemote !== true) {
        allowIntrusiveProbes = false;
        blockReason =
          'Unknown remote target blocked by default. Set environment explicitly or allowUnknownRemote=true.';
      }
    }

    return {
      environment,
      confidence,
      reasons,
      allowIntrusiveProbes,
      blockReason
    };
  }

  public static isLocalUrl(url: string): boolean {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return LOCAL_HOSTS.has(host) || host.endsWith('.local');
    } catch {
      return false;
    }
  }

  public static assertIntrusiveAllowed(options: EnvironmentPolicyOptions = {}): EnvironmentAssessment {
    const assessment = EnvironmentGuard.assess(options);
    if (!assessment.allowIntrusiveProbes) {
      throw new Error(`[VeloProve Security] ${assessment.blockReason}`);
    }
    return assessment;
  }
}
