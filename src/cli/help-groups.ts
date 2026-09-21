/**
 * Grouped root CLI help — mirrors Dashboard sidebar IA
 * (Start / Verify / Repair / Results / API / Security / Experience / More).
 * Display only — command count is catalogCliCommands().length (not hardcoded).
 */

export type HelpGroupId =
  | 'Start'
  | 'Verify'
  | 'Repair'
  | 'Results'
  | 'API'
  | 'Security'
  | 'Experience'
  | 'More';

/** Canonical command name → help group (aligned with Dashboard nav groups) */
export const CLI_HELP_GROUPS: Record<string, HelpGroupId> = {
  // Start — bootstrap, env, AI link
  init: 'Start',
  doctor: 'Start',
  inspect: 'Start',
  'teach-ai': 'Start',
  ask: 'Start',
  'learn-framework': 'Start',
  'ensure-dev': 'Start',
  ui: 'Start',
  tui: 'Start',
  mcp: 'Start',
  'setup-ci': 'Start',
  hook: 'Start',
  watch: 'Start',
  sandbox: 'Start',

  // Verify — plan → generate → run → release
  verify: 'Verify',
  explore: 'Verify',
  plan: 'Verify',
  generate: 'Verify',
  test: 'Verify',
  twin: 'Verify',
  impact: 'Verify',
  drift: 'Verify',
  changed: 'Verify',
  release: 'Verify',
  lint: 'Verify',

  // Repair — heal, quarantine, recorder, bisect
  diagnose: 'Repair',
  heal: 'Repair',
  refine: 'Repair',
  quarantine: 'Repair',
  stabilize: 'Repair',
  'auto-fix': 'Repair',
  dedup: 'Repair',
  'record-scenario': 'Repair',
  bisect: 'Repair',

  // Results — coverage, history, exports
  coverage: 'Results',
  history: 'Results',
  'export-report': 'Results',
  'mutation-score': 'Results',
  alert: 'Results',
  replay: 'Results',

  // API — HTTP / collections / mocks / load
  request: 'API',
  'run-collection': 'API',
  'export-postman': 'API',
  'fuzz-api': 'API',
  'contract-drift': 'API',
  'mock-gen': 'API',
  'mock-data': 'API',
  'mock-server': 'API',
  graphql: 'API',
  'ws-test': 'API',
  'load-test': 'API',
  'rate-limit': 'API',

  // Security — live suite, CVE, OWASP, remote, malware
  audit: 'Security',
  security: 'Security',
  'owasp-scan': 'Security',
  'web-sec': 'Security',
  'scan-malware': 'Security',
  chaos: 'Security',
  'ai-eval': 'Security',
  'audit-contracts': 'Security',
  'feature-parity': 'Security',
  'remote-init': 'Security',
  'remote-connect': 'Security',
  'remote-audit': 'Security',

  // Experience — a11y, vitals, throttle, arch
  a11y: 'Experience',
  'visual-diff': 'Experience',
  'screen-reader': 'Experience',
  perf: 'Experience',
  throttle: 'Experience',
  'arch-graph': 'Experience',

  // More — infra / BDD / DB / cleanup
  'docker-env': 'More',
  'browser-matrix': 'More',
  bdd: 'More',
  'dead-assets': 'More',
  'db-audit': 'More',
  'env-drift': 'More',
  'db-snapshot': 'More',
  'db-restore': 'More'
};

export const HELP_GROUP_ORDER: HelpGroupId[] = [
  'Start',
  'Verify',
  'Repair',
  'Results',
  'API',
  'Security',
  'Experience',
  'More'
];

/** Daily-10 starter commands surfaced in README / Guide / root help */
export const DAILY_10_COMMANDS = [
  'init',
  'teach-ai',
  'ask',
  'inspect',
  'doctor',
  'verify',
  'test',
  'changed',
  'security',
  'history'
] as const;

export const ALIAS_HELP_NOTE =
  'Aliases (e.g. chat→ask, fuzz→fuzz-api, dev→ensure-dev) are shortcuts only; docs and MCP use the full canonical command / vp.* name.';

export function groupForCommand(name: string): HelpGroupId {
  return CLI_HELP_GROUPS[name] ?? 'More';
}
