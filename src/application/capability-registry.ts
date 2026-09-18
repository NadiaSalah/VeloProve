/**
 * CapabilityRegistry — verify/intent subset (NOT the full 75-tool / 83-catalog surface).
 *
 * Used by VerifyOrchestrator and IntentPlanner to decide which high-level
 * capabilities to run during autonomous verify. Full product surface lives in
 * CLI + MCP registrations and docs/generated/CAPABILITY_MANIFEST.json.
 */
export type CapabilityId =
  | 'inspect'
  | 'doctor'
  | 'explore'
  | 'changed'
  | 'plan'
  | 'generate'
  | 'run'
  | 'diagnose'
  | 'heal'
  | 'auto-fix'
  | 'coverage'
  | 'security'
  | 'accessibility'
  | 'performance'
  | 'visual'
  | 'contract'
  | 'mutation'
  | 'release'
  | 'ensure-dev'
  | 'verify'
  | 'history';

export type CapabilityTrigger =
  | 'always'
  | 'on_change'
  | 'on_ui_change'
  | 'on_api_change'
  | 'on_auth_change'
  | 'on_failure'
  | 'on_release'
  | 'manual';

export interface CapabilityDefinition {
  id: CapabilityId;
  description: string;
  cliCommand?: string;
  mcpTool?: string;
  riskAreas: string[];
  triggers: CapabilityTrigger[];
  dependencies: CapabilityId[];
  /** When true, orchestrators may auto-include this capability. */
  autonomousDefault: boolean;
}

const CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'inspect',
    description: 'Detect stack, routes, APIs, and requirements',
    cliCommand: 'inspect',
    mcpTool: 'vp.inspect',
    riskAreas: ['project-detection'],
    triggers: ['always'],
    dependencies: [],
    autonomousDefault: true
  },
  {
    id: 'doctor',
    description: 'Environment and installation diagnostics',
    cliCommand: 'doctor',
    mcpTool: 'vp.doctor',
    riskAreas: ['environment'],
    triggers: ['always', 'on_release'],
    dependencies: [],
    autonomousDefault: true
  },
  {
    id: 'ensure-dev',
    description: 'Start local app when target URL is offline',
    cliCommand: 'ensure-dev',
    mcpTool: 'vp.ensureDev',
    riskAreas: ['infrastructure'],
    triggers: ['manual', 'on_ui_change'],
    dependencies: [],
    autonomousDefault: false
  },
  {
    id: 'explore',
    description: 'Live route and interaction map',
    cliCommand: 'explore',
    mcpTool: 'vp.explore',
    riskAreas: ['ui'],
    triggers: ['manual', 'on_ui_change'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'changed',
    description: 'Git change impact analysis',
    cliCommand: 'changed',
    mcpTool: 'vp.changed',
    riskAreas: ['change-impact'],
    triggers: ['on_change', 'always'],
    dependencies: ['inspect'],
    autonomousDefault: true
  },
  {
    id: 'plan',
    description: 'Risk-scored test planning',
    cliCommand: 'plan',
    mcpTool: 'vp.plan',
    riskAreas: ['coverage'],
    triggers: ['manual', 'on_release'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'generate',
    description: 'Materialize protected generated tests',
    cliCommand: 'generate',
    mcpTool: 'vp.generate',
    riskAreas: ['generation'],
    triggers: ['manual'],
    dependencies: ['plan'],
    autonomousDefault: false
  },
  {
    id: 'run',
    description: 'Execute tests (full or impacted)',
    cliCommand: 'test',
    mcpTool: 'vp.run',
    riskAreas: ['correctness'],
    triggers: ['on_change', 'on_failure', 'on_release'],
    dependencies: ['inspect'],
    autonomousDefault: true
  },
  {
    id: 'diagnose',
    description: 'Classify failures with evidence',
    cliCommand: 'diagnose',
    mcpTool: 'vp.diagnose',
    riskAreas: ['diagnostics'],
    triggers: ['on_failure'],
    dependencies: ['run'],
    autonomousDefault: true
  },
  {
    id: 'heal',
    description: 'Conservative locator / generated-test healing',
    cliCommand: 'heal',
    mcpTool: 'vp.heal',
    riskAreas: ['test-maintainability'],
    triggers: ['on_failure'],
    dependencies: ['diagnose'],
    autonomousDefault: true
  },
  {
    id: 'auto-fix',
    description: 'Reviewable application bug-fix patches',
    cliCommand: 'auto-fix',
    mcpTool: 'vp.autoBugFix',
    riskAreas: ['application-code'],
    triggers: ['manual'],
    dependencies: ['diagnose'],
    autonomousDefault: false
  },
  {
    id: 'coverage',
    description: 'Requirements / PRD coverage heatmap',
    cliCommand: 'coverage',
    mcpTool: 'vp.coverage',
    riskAreas: ['coverage'],
    triggers: ['on_release'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'security',
    description: 'Non-destructive security and session-theft suite',
    cliCommand: 'security',
    mcpTool: 'vp.securityRun',
    riskAreas: ['security', 'auth', 'sessions'],
    triggers: ['on_auth_change', 'on_api_change', 'on_release'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'accessibility',
    description: 'WCAG automated checks',
    cliCommand: 'a11y',
    mcpTool: 'vp.accessibility',
    riskAreas: ['a11y', 'ui'],
    triggers: ['on_ui_change'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'performance',
    description: 'Route performance / web vitals profiling',
    cliCommand: 'perf',
    mcpTool: 'vp.perf',
    riskAreas: ['performance'],
    triggers: ['manual', 'on_release'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'visual',
    description: 'Visual regression baselines',
    cliCommand: 'visual-diff',
    mcpTool: 'vp.visualDiff',
    riskAreas: ['ui'],
    triggers: ['on_ui_change'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'contract',
    description: 'OpenAPI / route contract drift',
    cliCommand: 'contract-drift',
    mcpTool: 'vp.contractDrift',
    riskAreas: ['api', 'contracts'],
    triggers: ['on_api_change'],
    dependencies: ['inspect'],
    autonomousDefault: false
  },
  {
    id: 'mutation',
    description: 'Targeted mutation quality score',
    cliCommand: 'mutation-score',
    mcpTool: 'vp.mutationScore',
    riskAreas: ['assertion-quality'],
    triggers: ['manual'],
    dependencies: ['run'],
    autonomousDefault: false
  },
  {
    id: 'release',
    description: 'Evidence-backed release confidence',
    cliCommand: 'release',
    mcpTool: 'vp.releaseCheck',
    riskAreas: ['release'],
    triggers: ['on_release'],
    dependencies: ['run'],
    autonomousDefault: true
  },
  {
    id: 'verify',
    description: 'Autonomous QA orchestrator for change-aware verification',
    cliCommand: 'verify',
    mcpTool: 'vp.verify',
    riskAreas: ['autonomy'],
    triggers: ['manual', 'on_release', 'on_change'],
    dependencies: ['inspect', 'changed', 'run', 'diagnose', 'release'],
    autonomousDefault: true
  },
  {
    id: 'history',
    description: 'Local test-run history trends and aggregates',
    cliCommand: 'history',
    mcpTool: 'vp.history',
    riskAreas: ['observability'],
    triggers: ['manual', 'on_release'],
    dependencies: ['run'],
    autonomousDefault: false
  }
];

export class CapabilityRegistry {
  public static list(): CapabilityDefinition[] {
    return [...CAPABILITIES];
  }

  public static get(id: CapabilityId): CapabilityDefinition | undefined {
    return CAPABILITIES.find((c) => c.id === id);
  }

  public static forTrigger(trigger: CapabilityTrigger): CapabilityDefinition[] {
    return CAPABILITIES.filter((c) => c.triggers.includes(trigger));
  }

  public static autonomousDefaults(): CapabilityDefinition[] {
    return CAPABILITIES.filter((c) => c.autonomousDefault && c.id !== 'verify');
  }

  /**
   * Select capabilities for a verify run based on change signals.
   * Deterministic — no LLM required.
   */
  public static planForChanges(signals: {
    hasChanges: boolean;
    uiChanged?: boolean;
    apiChanged?: boolean;
    authChanged?: boolean;
    includeSecurity?: boolean;
    includeA11y?: boolean;
  }): CapabilityId[] {
    const plan: CapabilityId[] = ['doctor', 'inspect', 'changed', 'run'];

    if (signals.hasChanges === false) {
      // Still run a focused suite when working tree is clean
    }

    plan.push('diagnose', 'heal', 'release');

    if (signals.includeSecurity || signals.authChanged || signals.apiChanged) {
      plan.push('security');
    }
    if (signals.includeA11y || signals.uiChanged) {
      plan.push('accessibility');
    }

    // de-dupe preserving order
    return [...new Set(plan)];
  }
}
