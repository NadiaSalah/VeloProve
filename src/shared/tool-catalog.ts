/**
 * Canonical tool-surface catalog for VeloProve.
 *
 * Used by audits/tests to keep CLI ↔ MCP ↔ Dashboard ↔ Docs in sync.
 * CapabilityRegistry (verify subset) is intentionally smaller — see its module docs.
 */

export type ToolTier = 'offline' | 'needs-url' | 'needs-state' | 'destructive' | 'interactive';

export interface ToolSurfaceEntry {
  /** Primary product id used in reports */
  id: string;
  cli?: string;
  mcp?: string;
  /** Dashboard `/api/actions/<name>` case id when exposed */
  dashboardAction?: string;
  /** Substrings that must appear in docs (any of the listed files) */
  docMarkers: string[];
  /** Expected in dashboard Guide or About HTML */
  uiGuideMarker?: string;
  tier: ToolTier;
  /** Short AI/user description */
  summary: string;
}

/**
 * Canonical map. Keep MCP/CLI names aligned with src/mcp/server.ts and src/cli/index.ts.
 * Sidebar / Guide are curated workflows. Tool Lab (`buildDashboardLabCatalog`) exposes every CLI
 * command; `dashboardAction` missing is rare and reported by audits.
 */
export const TOOL_SURFACE: ToolSurfaceEntry[] = [
  { id: 'inspect', cli: 'inspect', mcp: 'vp.inspect', dashboardAction: 'inspect', docMarkers: ['`vp.inspect`', '`veloprove inspect`'], uiGuideMarker: 'inspect', tier: 'offline', summary: 'Scan stack, routes, APIs, requirements' },
  { id: 'doctor', cli: 'doctor', mcp: 'vp.doctor', dashboardAction: 'doctor', docMarkers: ['`vp.doctor`', '`veloprove doctor`'], uiGuideMarker: 'doctor', tier: 'offline', summary: 'Environment and project health' },
  { id: 'bootstrap', cli: 'teach-ai', mcp: 'vp.bootstrap', dashboardAction: 'teach-ai', docMarkers: ['`vp.bootstrap`', '`veloprove teach-ai`', 'Teach AI'], uiGuideMarker: 'Teach AI', tier: 'offline', summary: 'Teach project AI how to use VeloProve (AGENTS.md + paste briefing)' },
  { id: 'ask', cli: 'ask', mcp: 'vp.ask', dashboardAction: 'ask-docs', docMarkers: ['`vp.ask`', '`veloprove ask`', 'Docs Chat'], uiGuideMarker: 'Docs Chat', tier: 'offline', summary: 'Docs-grounded Q&A from packaged markdown (no cloud LLM)' },
  { id: 'learn-framework', cli: 'learn-framework', mcp: 'vp.learnFramework', dashboardAction: 'learn-framework', docMarkers: ['`vp.learnFramework`', '`veloprove learn-framework`'], tier: 'offline', summary: 'Learn uncommon/in-house frameworks' },
  { id: 'explore', cli: 'explore', mcp: 'vp.explore', dashboardAction: 'explore', docMarkers: ['`vp.explore`', '`veloprove explore`'], uiGuideMarker: 'Explore', tier: 'needs-url', summary: 'Live route exploration map' },
  { id: 'fuzz-api', cli: 'fuzz-api', mcp: 'vp.fuzzApi', dashboardAction: 'fuzz-api', docMarkers: ['`vp.fuzzApi`', '`veloprove fuzz-api`'], tier: 'offline', summary: 'API boundary/security probes' },
  { id: 'mutation-score', cli: 'mutation-score', mcp: 'vp.mutationScore', dashboardAction: 'mutation', docMarkers: ['`vp.mutationScore`', '`veloprove mutation-score`'], tier: 'offline', summary: 'Mutation testing sensitivity' },
  { id: 'refine', cli: 'refine', mcp: 'vp.refine', dashboardAction: 'refine', docMarkers: ['`vp.refine`', '`veloprove refine`'], tier: 'needs-state', summary: 'NL refine of assertions' },
  { id: 'a11y', cli: 'a11y', mcp: 'vp.accessibility', dashboardAction: 'a11y', docMarkers: ['`vp.accessibility`', '`veloprove a11y`'], uiGuideMarker: 'A11y', tier: 'offline', summary: 'Static WCAG-oriented a11y heuristics' },
  { id: 'visual-diff', cli: 'visual-diff', mcp: 'vp.visualDiff', dashboardAction: 'visual-diff', docMarkers: ['`vp.visualDiff`', '`veloprove visual-diff`'], tier: 'offline', summary: 'Visual regression baselines' },
  { id: 'lint', cli: 'lint', mcp: 'vp.lint', dashboardAction: 'lint', docMarkers: ['`vp.lint`', '`veloprove lint`'], uiGuideMarker: 'Lint', tier: 'offline', summary: 'ESLint / format' },
  { id: 'contract-drift', cli: 'contract-drift', mcp: 'vp.contractDrift', dashboardAction: 'contract-drift', docMarkers: ['`vp.contractDrift`', '`veloprove contract-drift`'], tier: 'offline', summary: 'OpenAPI vs routes drift' },
  { id: 'audit', cli: 'audit', mcp: 'vp.auditSec', dashboardAction: 'audit', docMarkers: ['`vp.auditSec`', '`veloprove audit`'], uiGuideMarker: 'Audit', tier: 'offline', summary: 'CVE + secrets scan' },
  { id: 'perf', cli: 'perf', mcp: 'vp.perf', dashboardAction: 'perf', docMarkers: ['`vp.perf`', '`veloprove perf`'], uiGuideMarker: 'Profile', tier: 'needs-url', summary: 'Web Vitals profiling' },
  { id: 'mock-gen', cli: 'mock-gen', mcp: 'vp.mockNetwork', dashboardAction: 'mock-gen', docMarkers: ['`vp.mockNetwork`', '`veloprove mock-gen`'], uiGuideMarker: 'MSW', tier: 'offline', summary: 'Generate MSW handlers' },
  { id: 'quarantine', cli: 'quarantine', mcp: 'vp.quarantine', dashboardAction: 'quarantine', docMarkers: ['`vp.quarantine`', '`veloprove quarantine`'], uiGuideMarker: 'Quarantine', tier: 'offline', summary: 'Isolate flaky tests' },
  { id: 'coverage', cli: 'coverage', mcp: 'vp.coverage', dashboardAction: 'coverage', docMarkers: ['`vp.coverage`', '`veloprove coverage`'], uiGuideMarker: 'Coverage', tier: 'offline', summary: 'PRD coverage heatmap' },
  { id: 'plan', cli: 'plan', mcp: 'vp.plan', dashboardAction: 'plan', docMarkers: ['`vp.plan`', '`veloprove plan`'], uiGuideMarker: 'Plan', tier: 'offline', summary: 'Risk-scored test plan' },
  { id: 'generate', cli: 'generate', mcp: 'vp.generate', dashboardAction: 'generate', docMarkers: ['`vp.generate`', '`veloprove generate`'], uiGuideMarker: 'Generate', tier: 'offline', summary: 'Generate missing tests' },
  { id: 'run', cli: 'test', mcp: 'vp.run', dashboardAction: 'run', docMarkers: ['`vp.run`', '`veloprove test`'], uiGuideMarker: 'Run', tier: 'offline', summary: 'Execute test suites' },
  { id: 'run.get', mcp: 'vp.run.get', docMarkers: ['`vp.run.get`'], tier: 'needs-state', summary: 'Poll async run status (MCP-only)' },
  { id: 'changed', cli: 'changed', mcp: 'vp.changed', dashboardAction: 'run-changed', docMarkers: ['`vp.changed`', '`veloprove changed`'], uiGuideMarker: 'Changed', tier: 'offline', summary: 'Change-impact analysis' },
  { id: 'diagnose', cli: 'diagnose', mcp: 'vp.diagnose', dashboardAction: 'diagnose', docMarkers: ['`vp.diagnose`', '`veloprove diagnose`'], uiGuideMarker: 'Diagnose', tier: 'needs-state', summary: 'Failure root-cause class' },
  { id: 'heal', cli: 'heal', mcp: 'vp.heal', dashboardAction: 'heal', docMarkers: ['`vp.heal`', '`veloprove heal`'], uiGuideMarker: 'Heal', tier: 'needs-state', summary: 'Heal brittle locators' },
  { id: 'suggestFix', mcp: 'vp.suggestFix', docMarkers: ['`vp.suggestFix`'], tier: 'needs-state', summary: 'App-bug guidance only (PARTIAL, MCP-only)' },
  { id: 'flaky', mcp: 'vp.flaky', docMarkers: ['`vp.flaky`'], tier: 'offline', summary: 'Flaky history reader (MCP-only)' },
  { id: 'release', cli: 'release', mcp: 'vp.releaseCheck', dashboardAction: 'release', docMarkers: ['`vp.releaseCheck`', '`veloprove release`'], uiGuideMarker: 'Release', tier: 'offline', summary: 'Release confidence score' },
  { id: 'run-collection', cli: 'run-collection', mcp: 'vp.runCollection', dashboardAction: 'run-collection', docMarkers: ['`vp.runCollection`', '`veloprove run-collection`'], tier: 'needs-url', summary: 'Run Postman collections' },
  { id: 'export-postman', cli: 'export-postman', mcp: 'vp.exportCollection', dashboardAction: 'export-postman', docMarkers: ['`vp.exportCollection`', '`veloprove export-postman`'], uiGuideMarker: 'Export Collection', tier: 'offline', summary: 'Export APIs to Postman' },
  { id: 'request', cli: 'request', mcp: 'vp.sendRequest', dashboardAction: 'request', docMarkers: ['`vp.sendRequest`', '`veloprove request`'], tier: 'needs-url', summary: 'Ad-hoc HTTP request' },
  { id: 'load-test', cli: 'load-test', mcp: 'vp.loadTest', dashboardAction: 'load-test', docMarkers: ['`vp.loadTest`', '`veloprove load-test`'], uiGuideMarker: 'Load', tier: 'needs-url', summary: 'Local load/stress test' },
  { id: 'mock-data', cli: 'mock-data', mcp: 'vp.mockData', dashboardAction: 'mock-data', docMarkers: ['`vp.mockData`', '`veloprove mock-data`'], tier: 'offline', summary: 'AI mock data factory' },
  { id: 'owasp-scan', cli: 'owasp-scan', mcp: 'vp.owaspScan', dashboardAction: 'owasp-scan', docMarkers: ['`vp.owaspScan`', '`veloprove owasp-scan`'], tier: 'needs-url', summary: 'OWASP header/security scan' },
  { id: 'graphql', cli: 'graphql', mcp: 'vp.graphqlTest', dashboardAction: 'graphql', docMarkers: ['`vp.graphqlTest`', '`veloprove graphql`'], tier: 'needs-url', summary: 'GraphQL query test' },
  { id: 'ws-test', cli: 'ws-test', mcp: 'vp.wsTest', dashboardAction: 'ws-test', docMarkers: ['`vp.wsTest`', '`veloprove ws-test`'], tier: 'needs-url', summary: 'WebSocket handshake test' },
  { id: 'remote-init', cli: 'remote-init', mcp: 'vp.remoteInit', dashboardAction: 'remote-init', docMarkers: ['`vp.remoteInit`', '`veloprove remote-init`'], tier: 'offline', summary: 'Generate remote probe' },
  { id: 'remote-connect', cli: 'remote-connect', mcp: 'vp.remoteConnect', dashboardAction: 'remote-connect', docMarkers: ['`vp.remoteConnect`', '`veloprove remote-connect`'], tier: 'needs-url', summary: 'Connect remote probe' },
  { id: 'remote-audit', cli: 'remote-audit', mcp: 'vp.remoteAudit', dashboardAction: 'remote-audit', docMarkers: ['`vp.remoteAudit`', '`veloprove remote-audit`'], tier: 'needs-url', summary: 'Live remote QA audit' },
  { id: 'record-scenario', cli: 'record-scenario', mcp: 'vp.recordScenario', dashboardAction: 'recorder-bookmarklet', docMarkers: ['`vp.recordScenario`', '`veloprove record-scenario`'], uiGuideMarker: 'Recorder', tier: 'offline', summary: 'Scenario → Playwright' },
  { id: 'stabilize', cli: 'stabilize', mcp: 'vp.stabilizeFlaky', dashboardAction: 'stabilize', docMarkers: ['`vp.stabilizeFlaky`', '`veloprove stabilize`'], tier: 'needs-state', summary: 'Stabilize flaky tests' },
  { id: 'db-snapshot', cli: 'db-snapshot', mcp: 'vp.dbSnapshot', dashboardAction: 'db-snapshot', docMarkers: ['`vp.dbSnapshot`', '`veloprove db-snapshot`'], tier: 'offline', summary: 'DB/fixture snapshot' },
  { id: 'db-restore', cli: 'db-restore', mcp: 'vp.dbRestore', dashboardAction: 'db-restore', docMarkers: ['`vp.dbRestore`', '`veloprove db-restore`'], tier: 'needs-state', summary: 'Restore DB snapshot' },
  { id: 'auto-fix', cli: 'auto-fix', mcp: 'vp.autoBugFix', dashboardAction: 'auto-fix', docMarkers: ['`vp.autoBugFix`', '`veloprove auto-fix`'], uiGuideMarker: 'Auto-Fix', tier: 'destructive', summary: 'Propose reviewable app patches' },
  { id: 'export-report', cli: 'export-report', mcp: 'vp.exportReport', dashboardAction: 'export-report', docMarkers: ['`vp.exportReport`', '`veloprove export-report`'], uiGuideMarker: 'Export', tier: 'offline', summary: 'Executive report export' },
  { id: 'chaos', cli: 'chaos', mcp: 'vp.chaosTest', dashboardAction: 'chaos', docMarkers: ['`vp.chaosTest`', '`veloprove chaos`'], tier: 'needs-url', summary: 'Chaos monkey probes' },
  { id: 'docker-env', cli: 'docker-env', mcp: 'vp.dockerEnv', dashboardAction: 'docker-env', docMarkers: ['`vp.dockerEnv`', '`veloprove docker-env`'], tier: 'offline', summary: 'Ephemeral docker test env' },
  { id: 'browser-matrix', cli: 'browser-matrix', mcp: 'vp.browserMatrix', dashboardAction: 'browser-matrix', docMarkers: ['`vp.browserMatrix`', '`veloprove browser-matrix`'], tier: 'offline', summary: 'Cross-browser matrix' },
  { id: 'bdd', cli: 'bdd', mcp: 'vp.bddFeatures', dashboardAction: 'bdd', docMarkers: ['`vp.bddFeatures`', '`veloprove bdd`'], tier: 'offline', summary: 'BDD Gherkin features' },
  { id: 'alert', cli: 'alert', mcp: 'vp.sendAlert', dashboardAction: 'alert', docMarkers: ['`vp.sendAlert`', '`veloprove alert`'], tier: 'needs-url', summary: 'Webhook alerts' },
  { id: 'feature-parity', cli: 'feature-parity', mcp: 'vp.featureParity', dashboardAction: 'feature-parity', docMarkers: ['`vp.featureParity`', '`veloprove feature-parity`'], uiGuideMarker: 'Parity', tier: 'offline', summary: 'UI↔backend parity audit' },
  { id: 'scan-malware', cli: 'scan-malware', mcp: 'vp.scanMalware', dashboardAction: 'scan-malware', docMarkers: ['`vp.scanMalware`', '`veloprove scan-malware`'], uiGuideMarker: 'Malware', tier: 'offline', summary: 'Malware/backdoor scan' },
  { id: 'remediate-malware', mcp: 'vp.remediateMalware', dashboardAction: 'fix-malware', docMarkers: ['`vp.remediateMalware`'], tier: 'destructive', summary: 'Neutralize malware (MCP + CLI scan-malware --fix)' },
  { id: 'ai-eval', cli: 'ai-eval', mcp: 'vp.aiEvaluate', dashboardAction: 'ai-eval', docMarkers: ['`vp.aiEvaluate`', '`veloprove ai-eval`'], tier: 'needs-url', summary: 'LLM hallucination eval' },
  { id: 'bisect', cli: 'bisect', mcp: 'vp.gitBisect', dashboardAction: 'bisect', docMarkers: ['`vp.gitBisect`', '`veloprove bisect`'], uiGuideMarker: 'Bisect', tier: 'needs-state', summary: 'Git bisect regression hunt' },
  { id: 'throttle', cli: 'throttle', mcp: 'vp.networkThrottle', dashboardAction: 'throttle', docMarkers: ['`vp.networkThrottle`', '`veloprove throttle`'], tier: 'needs-url', summary: 'Network throttle sim' },
  { id: 'audit-contracts', cli: 'audit-contracts', mcp: 'vp.smartContractAudit', dashboardAction: 'audit-contracts', docMarkers: ['`vp.smartContractAudit`', '`veloprove audit-contracts`'], tier: 'offline', summary: 'Solidity/Web3 audit' },
  { id: 'dead-assets', cli: 'dead-assets', mcp: 'vp.deadAssetPurge', dashboardAction: 'dead-assets', docMarkers: ['`vp.deadAssetPurge`', '`veloprove dead-assets`'], tier: 'destructive', summary: 'Dead asset/CSS purge' },
  { id: 'screen-reader', cli: 'screen-reader', mcp: 'vp.screenReaderSim', dashboardAction: 'screen-reader', docMarkers: ['`vp.screenReaderSim`', '`veloprove screen-reader`'], uiGuideMarker: 'Screen Reader', tier: 'offline', summary: 'Approximate reading-order heuristics' },
  { id: 'db-audit', cli: 'db-audit', mcp: 'vp.dbQueryAudit', dashboardAction: 'db-audit', docMarkers: ['`vp.dbQueryAudit`', '`veloprove db-audit`'], uiGuideMarker: 'DB Audit', tier: 'offline', summary: 'N+1 / query audit' },
  { id: 'env-drift', cli: 'env-drift', mcp: 'vp.envDriftAudit', dashboardAction: 'env-drift', docMarkers: ['`vp.envDriftAudit`', '`veloprove env-drift`'], tier: 'offline', summary: 'Env/secret drift audit' },
  { id: 'replay', cli: 'replay', mcp: 'vp.recordFailureReplay', dashboardAction: 'failure-replay', docMarkers: ['`vp.recordFailureReplay`', '`veloprove replay`'], tier: 'needs-state', summary: 'Failure replay recorder' },
  { id: 'rate-limit', cli: 'rate-limit', mcp: 'vp.rateLimitAudit', dashboardAction: 'rate-limit', docMarkers: ['`vp.rateLimitAudit`', '`veloprove rate-limit`'], tier: 'needs-url', summary: 'Rate-limit/DoS profile' },
  { id: 'mock-server', cli: 'mock-server', mcp: 'vp.statefulMock', dashboardAction: 'mock-server', docMarkers: ['`vp.statefulMock`', '`veloprove mock-server`'], tier: 'interactive', summary: 'Stateful mock REST server' },
  { id: 'arch-graph', cli: 'arch-graph', mcp: 'vp.architectureGraph', dashboardAction: 'arch-graph', docMarkers: ['`vp.architectureGraph`', '`veloprove arch-graph`'], uiGuideMarker: 'Architecture', tier: 'offline', summary: 'Architecture dependency graph' },
  { id: 'security-scan', cli: 'security', mcp: 'vp.securityScan', dashboardAction: 'security-scan', docMarkers: ['`vp.securityScan`', '`veloprove security`'], uiGuideMarker: 'Security', tier: 'offline', summary: 'Security attack-surface scan' },
  { id: 'security-plan', mcp: 'vp.securityPlan', docMarkers: ['`vp.securityPlan`'], tier: 'offline', summary: 'Security test plan' },
  { id: 'security-run', mcp: 'vp.securityRun', dashboardAction: 'security-run', docMarkers: ['`vp.securityRun`'], tier: 'needs-url', summary: 'Execute safe security suite' },
  { id: 'security-report', mcp: 'vp.securityReport', docMarkers: ['`vp.securityReport`'], tier: 'needs-state', summary: 'Security report summary' },
  { id: 'export-sarif', mcp: 'vp.exportSarif', dashboardAction: 'export-sarif', docMarkers: ['`vp.exportSarif`'], tier: 'needs-state', summary: 'Export SARIF findings' },
  { id: 'web-sec', cli: 'web-sec', mcp: 'vp.auditSriCsrf', dashboardAction: 'sri-csrf-audit', docMarkers: ['`vp.auditSriCsrf`', '`veloprove web-sec`'], uiGuideMarker: 'Web-Sec', tier: 'offline', summary: 'SRI/CSRF/CORS audit' },
  { id: 'dedup', cli: 'dedup', mcp: 'vp.dedupTests', dashboardAction: 'dedup-tests', docMarkers: ['`vp.dedupTests`', '`veloprove dedup`'], uiGuideMarker: 'Dedup', tier: 'offline', summary: 'Deduplicate tests' },
  { id: 'ensure-dev', cli: 'ensure-dev', mcp: 'vp.ensureDev', dashboardAction: 'ensure-dev', docMarkers: ['`vp.ensureDev`', '`veloprove ensure-dev`'], uiGuideMarker: 'Ensure Dev', tier: 'needs-url', summary: 'Auto-start local app' },
  { id: 'verify', cli: 'verify', mcp: 'vp.verify', dashboardAction: 'verify', docMarkers: ['`vp.verify`', '`veloprove verify`'], uiGuideMarker: 'Verify', tier: 'offline', summary: 'Autonomous change-aware QA' },
  { id: 'history', cli: 'history', mcp: 'vp.history', dashboardAction: 'history', docMarkers: ['`vp.history`', '`veloprove history`'], uiGuideMarker: 'History', tier: 'offline', summary: 'Local run-history trends' },
  { id: 'twin', cli: 'twin', mcp: 'vp.twin', dashboardAction: 'twin', docMarkers: ['`vp.twin`', '`veloprove twin`', 'Project Twin'], uiGuideMarker: 'Project Twin', tier: 'offline', summary: 'Build/inspect Project Twin (PARTIAL MVP)' },
  { id: 'impact', cli: 'impact', mcp: 'vp.impact', dashboardAction: 'impact', docMarkers: ['`vp.impact`', '`veloprove impact`'], uiGuideMarker: 'Project Twin', tier: 'offline', summary: 'Change impact (wraps changed + Twin)' },
  { id: 'drift', cli: 'drift', mcp: 'vp.drift', dashboardAction: 'drift', docMarkers: ['`vp.drift`', '`veloprove drift`'], uiGuideMarker: 'Project Twin', tier: 'offline', summary: 'Aggregated drift (contract+parity+env+docs)' },
  /* CLI-only infrastructure */
  { id: 'init', cli: 'init', dashboardAction: 'init', docMarkers: ['`veloprove init`'], tier: 'offline', summary: 'Initialize project config' },
  { id: 'ui', cli: 'ui', dashboardAction: 'ui', docMarkers: ['`veloprove ui`'], uiGuideMarker: 'dashboard', tier: 'interactive', summary: 'Live HTML dashboard' },
  { id: 'tui', cli: 'tui', dashboardAction: 'tui', docMarkers: ['`veloprove tui`'], tier: 'interactive', summary: 'Terminal command center' },
  { id: 'setup-ci', cli: 'setup-ci', dashboardAction: 'setup-ci', docMarkers: ['`veloprove setup-ci`'], tier: 'offline', summary: 'Generate CI quality gate' },
  { id: 'sandbox', cli: 'sandbox', dashboardAction: 'sandbox', docMarkers: ['`veloprove sandbox`'], tier: 'offline', summary: 'Isolated sandbox runner' },
  { id: 'watch', cli: 'watch', dashboardAction: 'watch', docMarkers: ['`veloprove watch`'], tier: 'interactive', summary: 'Watch mode test runner' },
  { id: 'hook', cli: 'hook', dashboardAction: 'hook', docMarkers: ['`veloprove hook`'], uiGuideMarker: 'hook', tier: 'offline', summary: 'Git pre-commit hook' },
  { id: 'mcp', cli: 'mcp', dashboardAction: 'mcp', docMarkers: ['`veloprove mcp`'], uiGuideMarker: 'mcp', tier: 'interactive', summary: 'Start MCP stdio server' }
];

export function catalogMcpTools(): string[] {
  return TOOL_SURFACE.map((t) => t.mcp).filter((x): x is string => !!x);
}

export function catalogCliCommands(): string[] {
  return TOOL_SURFACE.map((t) => t.cli).filter((x): x is string => !!x);
}
