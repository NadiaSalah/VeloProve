import { CapabilityRegistry, type CapabilityId } from './capability-registry.js';

export interface IntentPlan {
  raw: string;
  interpretedAs: string;
  capabilities: CapabilityId[];
  dangerous: boolean;
  notes: string[];
}

const RULES: Array<{
  patterns: RegExp[];
  capabilities: CapabilityId[];
  label: string;
  dangerous?: boolean;
}> = [
  {
    patterns: [/ready for release/i, /release.?ready/i, /ship it/i, /can we ship/i],
    capabilities: ['doctor', 'inspect', 'changed', 'run', 'diagnose', 'release'],
    label: 'Release readiness assessment'
  },
  {
    patterns: [/what broke/i, /find what broke/i, /after my (last )?change/i, /regression/i],
    capabilities: ['inspect', 'changed', 'run', 'diagnose'],
    label: 'Change regression investigation'
  },
  {
    patterns: [/login|signup|sign.?up|auth|authentication|authorization|session/i],
    capabilities: ['inspect', 'changed', 'run', 'security', 'diagnose'],
    label: 'Authentication / session focused QA'
  },
  {
    patterns: [/xss|injection|csrf|owasp|form.?security|sql.?inject/i],
    capabilities: ['inspect', 'security'],
    label: 'Form / injection security checks',
    dangerous: false
  },
  {
    patterns: [/accessib|a11y|wcag|screen.?reader/i],
    capabilities: ['inspect', 'accessibility'],
    label: 'Accessibility audit'
  },
  {
    patterns: [/verify|full qa|test (this|everything|thoroughly)/i],
    capabilities: ['verify'],
    label: 'Autonomous verify orchestrator'
  },
  {
    patterns: [/heal|fix (the )?test|selector drift|brittle locator/i],
    capabilities: ['diagnose', 'heal', 'run'],
    label: 'Test healing loop'
  },
  {
    patterns: [/coverage|heatmap|prd/i],
    capabilities: ['inspect', 'coverage'],
    label: 'Coverage analysis'
  }
];

/**
 * Deterministic natural-language → capability plan.
 * No LLM execution — keyword/policy mapping only.
 * Destructive capabilities never auto-included.
 */
export class IntentPlanner {
  private static readonly BLOCKED_WITHOUT_CONFIRM: CapabilityId[] = [
    'auto-fix',
    'mutation'
  ];

  public static plan(utterance: string): IntentPlan {
    const raw = (utterance || '').trim();
    const notes: string[] = [];
    if (!raw) {
      return {
        raw,
        interpretedAs: 'Empty intent — defaulting to verify',
        capabilities: ['verify'],
        dangerous: false,
        notes: ['Provide a natural-language QA goal for a more specific plan.']
      };
    }

    const matched = RULES.filter((r) => r.patterns.some((p) => p.test(raw)));
    let capabilities: CapabilityId[] = [];
    let interpretedAs = 'Generic change-aware verify';

    if (matched.length === 0) {
      capabilities = ['verify'];
      notes.push('No specific rule matched; recommending autonomous verify.');
    } else {
      interpretedAs = matched.map((m) => m.label).join(' + ');
      for (const m of matched) {
        capabilities.push(...m.capabilities);
      }
      capabilities = [...new Set(capabilities)];
    }

    // Policy: strip prohibited automatic capabilities
    const dangerous = capabilities.some((c) => IntentPlanner.BLOCKED_WITHOUT_CONFIRM.includes(c));
    capabilities = capabilities.filter((c) => !IntentPlanner.BLOCKED_WITHOUT_CONFIRM.includes(c));
    if (dangerous) {
      notes.push('Auto-fix / mutation require explicit CLI/MCP invocation — excluded from NL plan.');
    }

    // Ensure capabilities exist in registry
    capabilities = capabilities.filter((id) => CapabilityRegistry.get(id));

    return {
      raw,
      interpretedAs,
      capabilities,
      dangerous: false,
      notes
    };
  }
}
