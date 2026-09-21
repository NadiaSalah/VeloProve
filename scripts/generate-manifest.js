import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const packageVersion = pkg.version || '0.0.0';
const packageName = pkg.name || '@engnadia/veloprove';

/** @typedef {'VERIFIED'|'VERIFIED_WITH_WARNINGS'|'PARTIAL'|'BLOCKED'|'NOT_IMPLEMENTED'|'NOT_APPLICABLE'} VerificationStatus */

/**
 * Honest verificationStatus mapping (compat `status` kept).
 * Diagnose/Heal/suggestFix stay PARTIAL until fault-harness rates are measured.
 * Most implemented caps are VERIFIED_WITH_WARNINGS pending broader trust evidence.
 */
const VERIFICATION_OVERRIDES = {
  'CAP-021': 'PARTIAL', // diagnose — rates measured by fault harness
  'CAP-022': 'PARTIAL', // heal — rates measured by fault harness
  'CAP-023': 'PARTIAL', // suggestFix / autoBugFix — diffOrPatch not real yet
  'CAP-001': 'VERIFIED',
  'CAP-ASK': 'VERIFIED',
  'CAP-071': 'VERIFIED',
  'CAP-017': 'VERIFIED_WITH_WARNINGS',
  'CAP-018': 'VERIFIED_WITH_WARNINGS',
  'CAP-019': 'VERIFIED_WITH_WARNINGS',
  'CAP-025': 'VERIFIED_WITH_WARNINGS',
  'CAP-070': 'VERIFIED_WITH_WARNINGS'
};

function mapVerificationStatus(capId, legacyStatus) {
  if (VERIFICATION_OVERRIDES[capId]) return VERIFICATION_OVERRIDES[capId];
  if (legacyStatus === 'implemented') return 'VERIFIED_WITH_WARNINGS';
  if (legacyStatus === 'partial') return 'PARTIAL';
  if (legacyStatus === 'blocked') return 'BLOCKED';
  if (legacyStatus === 'not_implemented') return 'NOT_IMPLEMENTED';
  return 'PARTIAL';
}

// Prefer catalog SSOT for MCP/CLI totals when parseable
const catalogSource = fs.readFileSync(path.join(rootDir, 'src/shared/tool-catalog.ts'), 'utf8');
const catalogMcp = [...catalogSource.matchAll(/mcp:\s*'([^']+)'/g)].map((m) => m[1]);
const catalogCli = [...catalogSource.matchAll(/cli:\s*'([^']+)'/g)].map((m) => m[1]);

// Read source files (registration cross-check)
const mcpSource = fs.readFileSync(path.join(rootDir, 'src/mcp/server.ts'), 'utf8');
const cliSource = fs.readFileSync(path.join(rootDir, 'src/cli/index.ts'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(rootDir, 'src/application/dashboard-server.ts'), 'utf8');

// Extract MCP tool names from server (authoritative registration)
const toolRegex = /name:\s*'(vp\.[a-zA-Z0-9_\.]+)'/g;
const mcpTools = [];
let m;
while ((m = toolRegex.exec(mcpSource)) !== null) {
  mcpTools.push(m[1]);
}

// Extract CLI command names
const cliRegex = /\.command\('([a-zA-Z0-9_\-]+)(?:\s+[^']*)?'\)/g;
const cliCommands = [];
while ((m = cliRegex.exec(cliSource)) !== null) {
  cliCommands.push(m[1]);
}

// Extract Dashboard actions
const dashRegex = /case\s*'([a-zA-Z0-9_\-]+)':/g;
const dashboardActions = [];
while ((m = dashRegex.exec(dashboardSource)) !== null) {
  dashboardActions.push(m[1]);
}

const totalMcpTools = catalogMcp.length || mcpTools.length;
const totalCliCommands = catalogCli.length || cliCommands.length;

console.log(
  `Found ${mcpTools.length} MCP tools (catalog ${catalogMcp.length}), ${cliCommands.length} CLI commands (catalog ${catalogCli.length}), ${dashboardActions.length} Dashboard actions.`
);

const manifest = {
  version: packageVersion,
  package: packageName,
  cliBinary: "veloprove",
  totalCliCommands,
  totalMcpTools,
  totalDashboardActions: dashboardActions.length,
  cliCommands: cliCommands.sort(),
  mcpTools: mcpTools.sort(),
  dashboardActions: dashboardActions.sort(),
  capabilities: [
    {
      id: "CAP-001",
      title: "Project Stack & Monorepo Scanner",
      domain: "discovery",
      api: ["ProjectScanner.scan()", "StackDetector.detect()", "VeloProveEngine.inspect()"],
      cli: ["inspect", "init", "doctor"],
      mcp: ["vp.inspect", "vp.doctor"],
      dashboard: ["inspect", "doctor"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md", "docs/reference/mcp.md"],
      tests: ["tests/unit/scanner-requirements.test.ts", "tests/unit/v100-stability-enhancements.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-002",
      title: "Universal AI Agent Handshake Protocol",
      domain: "discovery",
      api: ["AgentHandshakeService.run()"],
      cli: ["teach-ai"],
      mcp: ["vp.bootstrap"],
      dashboard: ["bootstrap"],
      docs: ["docs/AGENTS.md", "docs/guides/ai-integrations.md", "docs/guides/faq.md", "docs/reference/cli.md", "docs/reference/mcp.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts", "tests/unit/docs-assistant-ai-link.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-ASK",
      title: "Docs-Grounded Local Q&A (no cloud LLM)",
      domain: "discovery",
      api: ["DocsAssistantService.ask()", "VeloProveEngine.askDocs()"],
      cli: ["ask"],
      mcp: ["vp.ask"],
      dashboard: ["ask-docs"],
      docs: ["docs/AGENTS.md", "docs/guides/faq.md", "docs/reference/cli.md", "docs/reference/mcp.md"],
      tests: ["tests/unit/docs-assistant-ai-link.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-003",
      title: "Custom In-House Framework Self-Teaching",
      domain: "discovery",
      api: ["FrameworkLearnerService.learn()", "FrameworkLearnerService.ingestAgentDoc()"],
      cli: ["learn-framework"],
      mcp: ["vp.learnFramework"],
      dashboard: ["learn-framework"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/framework-learner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-004",
      title: "Interactive Live Route Crawler & UI Explorer",
      domain: "discovery",
      api: ["ExploreAppService.explore()"],
      cli: ["explore"],
      mcp: ["vp.explore"],
      dashboard: ["explore"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-005",
      title: "API Security & Boundary Fuzzer",
      domain: "api_testing",
      api: ["ApiFuzzingService.fuzzEndpoint()"],
      cli: ["fuzz-api"],
      mcp: ["vp.fuzzApi"],
      dashboard: ["fuzz-api"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-006",
      title: "Assertion Mutation Quality Scorer",
      domain: "quality",
      api: ["MutationScorerService.score()"],
      cli: ["mutation-score"],
      mcp: ["vp.mutationScore"],
      dashboard: ["mutation-score"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-007",
      title: "Natural Language Test Assertion Refiner",
      domain: "test_generation",
      api: ["RefineTestService.refine()"],
      cli: ["refine"],
      mcp: ["vp.refine"],
      dashboard: ["refine"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-008",
      title: "Automated WCAG 2.1 Accessibility Auditor",
      domain: "accessibility",
      api: ["A11yAuditorService.audit()"],
      cli: ["a11y"],
      mcp: ["vp.accessibility"],
      dashboard: ["accessibility"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-009",
      title: "Visual Regression & Screenshot Baseline Diff",
      domain: "visual",
      api: ["VisualDiffService.compare()"],
      cli: ["visual-diff"],
      mcp: ["vp.visualDiff"],
      dashboard: ["visual-diff"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-010",
      title: "Static Code Analysis & ESLint Integration",
      domain: "quality",
      api: ["LinterService.lint()"],
      cli: ["lint"],
      mcp: ["vp.lint"],
      dashboard: ["lint"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/linter-and-dashboard.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-011",
      title: "OpenAPI Contract Drift Detector",
      domain: "api_testing",
      api: ["ContractDriftService.checkDrift()"],
      cli: ["contract-drift"],
      mcp: ["vp.contractDrift"],
      dashboard: ["contract-drift"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-012",
      title: "Dependency CVE & Secret Leakage Auditor",
      domain: "security",
      api: ["SecurityAuditService.audit()"],
      cli: ["audit"],
      mcp: ["vp.auditSec"],
      dashboard: ["audit"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-013",
      title: "Core Web Vitals & Route Performance Profiler",
      domain: "performance",
      api: ["PerfProfilerService.profile()"],
      cli: ["perf"],
      mcp: ["vp.perf"],
      dashboard: ["perf"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-014",
      title: "MSW Network Mock Handler Synthesizer",
      domain: "mocking",
      api: ["MockNetworkService.generateHandlers()"],
      cli: ["mock-gen"],
      mcp: ["vp.mockNetwork"],
      dashboard: ["mock-network"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-015",
      title: "Flaky Test Isolation & Quarantine Manager",
      domain: "quality",
      api: ["QuarantineService.quarantine()"],
      cli: ["quarantine"],
      mcp: ["vp.quarantine"],
      dashboard: ["quarantine"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-016",
      title: "PRD Requirements Coverage Heatmap Generator",
      domain: "quality",
      api: ["CoverageHeatmapService.generateHeatmap()"],
      cli: ["coverage"],
      mcp: ["vp.coverage"],
      dashboard: ["coverage"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-017",
      title: "Risk-Scored Test Planner",
      domain: "test_planning",
      api: ["PlanTestsService.createPlan()", "RiskScorer.scoreRequirement()"],
      cli: ["plan"],
      mcp: ["vp.plan"],
      dashboard: ["plan"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-018",
      title: "Multi-Framework Test Synthesizer (Vitest/Jest/Playwright)",
      domain: "test_generation",
      api: ["GenerateTestsService.generate()", "TestGenerator.generateFile()"],
      cli: ["generate"],
      mcp: ["vp.generate"],
      dashboard: ["generate"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-019",
      title: "Automated Test Runner & Result Normalizer",
      domain: "execution",
      api: ["RunTestsService.run()", "ProcessRunner.run()"],
      cli: ["test"],
      mcp: ["vp.run", "vp.run.get"],
      dashboard: ["run"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-020",
      title: "Git Diff Change Impact Analysis & Test Isolation",
      domain: "execution",
      api: ["AnalyzeChangesService.analyze()", "GitDiffAnalyzer.getChangedFiles()"],
      cli: ["changed"],
      mcp: ["vp.changed"],
      dashboard: ["changed"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/change-impact.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-021",
      title: "Evidence-Based Failure Root Cause Diagnostics",
      domain: "diagnostics",
      api: ["DiagnoseFailureService.diagnose()", "Classifier.classify()"],
      cli: ["diagnose"],
      mcp: ["vp.diagnose"],
      dashboard: ["diagnose"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/classifier-diagnostics.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-022",
      title: "Visual-Aria Test Locator Auto-Healer",
      domain: "healing",
      api: ["HealTestService.heal()", "VisualAutoHealService.healLocator()"],
      cli: ["heal"],
      mcp: ["vp.heal"],
      dashboard: ["heal"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-023",
      title: "Source Code Bug Fix Synthesizer",
      domain: "healing",
      api: ["SuggestFixService.suggest()", "BugfixSynthesizerService.synthesize()"],
      cli: ["auto-fix"],
      mcp: ["vp.suggestFix", "vp.autoBugFix"],
      dashboard: ["auto-fix"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-024",
      title: "AST Flakiness Stabilizer & Auto-Wait Fixer",
      domain: "healing",
      api: ["FlakinessStabilizerService.stabilizeFile()"],
      cli: ["stabilize"],
      mcp: ["vp.flaky", "vp.stabilizeFlaky"],
      dashboard: ["stabilize"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-025",
      title: "Quantitative Release Readiness Gate",
      domain: "quality",
      api: ["ReleaseCheckService.evaluate()"],
      cli: ["release"],
      mcp: ["vp.releaseCheck"],
      dashboard: ["release"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-026",
      title: "Postman Collection v2.1 Runner & Dynamic Client",
      domain: "api_testing",
      api: ["PostmanRunnerService.runCollection()", "DynamicVariablesService.interpolate()"],
      cli: ["run-collection", "request"],
      mcp: ["vp.runCollection", "vp.sendRequest"],
      dashboard: ["run-collection", "request"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/postman-runner.test.ts", "tests/unit/dynamic-variables.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-027",
      title: "Postman Collection v2.1 Exporter",
      domain: "api_testing",
      api: ["PostmanRunnerService.exportCollection()"],
      cli: ["export-postman"],
      mcp: ["vp.exportCollection"],
      dashboard: ["export-collection"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/postman-runner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-028",
      title: "Local High-Concurrency Load & Stress Tester",
      domain: "performance",
      api: ["LoadTesterService.runLoadTest()"],
      cli: ["load-test"],
      mcp: ["vp.loadTest"],
      dashboard: ["load-test"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-029",
      title: "Contextual Realistic Mock Data Factory",
      domain: "mocking",
      api: ["MockDataFactoryService.generateFixture()"],
      cli: ["mock-data"],
      mcp: ["vp.mockData"],
      dashboard: ["mock-data"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-030",
      title: "OWASP Top 10 Security & Header Auditor",
      domain: "security",
      api: ["OwaspScannerService.scan()"],
      cli: ["owasp-scan"],
      mcp: ["vp.owaspScan"],
      dashboard: ["owasp-scan"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-031",
      title: "GraphQL Query & Mutation Tester",
      domain: "api_testing",
      api: ["RealtimeTesterService.testGraphQL()"],
      cli: ["graphql"],
      mcp: ["vp.graphqlTest"],
      dashboard: ["graphql"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-032",
      title: "WebSocket Connection & Handshake Tester",
      domain: "api_testing",
      api: ["RealtimeTesterService.testWebSocket()"],
      cli: ["ws-test"],
      mcp: ["vp.wsTest"],
      dashboard: ["ws-test"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-033",
      title: "Live Remote Companion Probe Generator",
      domain: "remote_bridge",
      api: ["RemoteBridgeService.generateProbe()"],
      cli: ["remote-init"],
      mcp: ["vp.remoteInit"],
      dashboard: ["remote-init"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/remote-bridge.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-034",
      title: "Live Remote Website Bridge & Handshake",
      domain: "remote_bridge",
      api: ["RemoteBridgeService.connect()"],
      cli: ["remote-connect"],
      mcp: ["vp.remoteConnect"],
      dashboard: ["remote-connect"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/remote-bridge.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-035",
      title: "Live Remote Deep Auditor & Crawler",
      domain: "remote_bridge",
      api: ["RemoteBridgeService.runRemoteAudit()"],
      cli: ["remote-audit"],
      mcp: ["vp.remoteAudit"],
      dashboard: ["remote-audit"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/remote-bridge.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-036",
      title: "Interactive E2E Scenario Journey Recorder",
      domain: "test_generation",
      api: ["ScenarioRecorderService.synthesizePlaywrightTest()"],
      cli: ["record-scenario"],
      mcp: ["vp.recordScenario"],
      dashboard: ["record-scenario"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-037",
      title: "Database State Snapshot & Isolation",
      domain: "database",
      api: ["DbSnapshotService.createSnapshot()"],
      cli: ["db-snapshot"],
      mcp: ["vp.dbSnapshot"],
      dashboard: ["db-snapshot"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-038",
      title: "Database State Restoration & Rollback",
      domain: "database",
      api: ["DbSnapshotService.restoreSnapshot()"],
      cli: ["db-restore"],
      mcp: ["vp.dbRestore"],
      dashboard: ["db-restore"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-039",
      title: "Standalone Executive QA & Security Report Exporter",
      domain: "reporting",
      api: ["ReportExporterService.exportReport()"],
      cli: ["export-report"],
      mcp: ["vp.exportReport"],
      dashboard: ["export-report"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-040",
      title: "Autonomous Chaos & Edge-Case Monkey Engine",
      domain: "resilience",
      api: ["ChaosEngineService.runChaos()"],
      cli: ["chaos"],
      mcp: ["vp.chaosTest"],
      dashboard: ["chaos"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-041",
      title: "Ephemeral Container & Docker Compose Orchestrator",
      domain: "devops",
      api: ["DockerOrchestratorService.generateCompose()"],
      cli: ["docker-env"],
      mcp: ["vp.dockerEnv"],
      dashboard: ["docker-env"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-042",
      title: "Cross-Browser & Mobile Viewport Matrix Generator",
      domain: "test_generation",
      api: ["BrowserMatrixService.generateMatrixConfig()"],
      cli: ["browser-matrix"],
      mcp: ["vp.browserMatrix"],
      dashboard: ["browser-matrix"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-043",
      title: "BDD Gherkin Feature Spec & Step Generator",
      domain: "test_generation",
      api: ["BddGeneratorService.generateFeatures()"],
      cli: ["bdd"],
      mcp: ["vp.bddFeatures"],
      dashboard: ["bdd"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-044",
      title: "Webhook Alerts & Quality Verdict Dispatcher",
      domain: "devops",
      api: ["WebhookAlertsService.sendAlert()"],
      cli: ["alert"],
      mcp: ["vp.sendAlert"],
      dashboard: ["alert"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-045",
      title: "Universal UI-to-Backend Feature Parity & Ghost Auditor",
      domain: "quality",
      api: ["FeatureParityAuditorService.auditParity()"],
      cli: ["feature-parity"],
      mcp: ["vp.featureParity"],
      dashboard: ["feature-parity"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/feature-parity.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-046",
      title: "Malware & Backdoor Scanner",
      domain: "security",
      api: ["MalwareScannerService.scan()"],
      cli: ["scan-malware"],
      mcp: ["vp.scanMalware"],
      dashboard: ["scan-malware"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/malware-scanner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-047",
      title: "Automated Malicious Code Neutralizer & Remediator",
      domain: "security",
      api: ["MalwareScannerService.remediate()"],
      cli: ["scan-malware --fix"],
      mcp: ["vp.remediateMalware"],
      dashboard: ["remediate-malware"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/malware-scanner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-048",
      title: "LLM & AI Output Hallucination & Accuracy Evaluator",
      domain: "ai_evaluation",
      api: ["AiHallucinationEvaluatorService.evaluate()"],
      cli: ["ai-eval"],
      mcp: ["vp.aiEvaluate"],
      dashboard: ["ai-eval"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-049",
      title: "Autonomous Git Bisect Regression Commit Hunter",
      domain: "execution",
      api: ["GitBisectHunterService.bisect()"],
      cli: ["bisect"],
      mcp: ["vp.gitBisect"],
      dashboard: ["bisect"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-050",
      title: "Network Latency & Offline Drops Throttler",
      domain: "resilience",
      api: ["NetworkThrottlerService.throttle()"],
      cli: ["throttle"],
      mcp: ["vp.networkThrottle"],
      dashboard: ["throttle"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-051",
      title: "Solidity & Web3 Smart Contract Security Auditor",
      domain: "security",
      api: ["SmartContractAuditorService.auditContracts()"],
      cli: ["audit-contracts"],
      mcp: ["vp.smartContractAudit"],
      dashboard: ["audit-contracts"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-052",
      title: "Unreferenced Dead Assets & Dead CSS Purge Engine",
      domain: "quality",
      api: ["DeadAssetPurgeService.scan()", "DeadAssetPurgeService.purge()"],
      cli: ["dead-assets"],
      mcp: ["vp.deadAssetPurge"],
      dashboard: ["dead-assets"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-053",
      title: "Screen Reader Speech Flow & VoiceOver Simulator",
      domain: "accessibility",
      api: ["ScreenReaderSimulatorService.simulate()"],
      cli: ["screen-reader"],
      mcp: ["vp.screenReaderSim"],
      dashboard: ["screen-reader"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-054",
      title: "SQL N+1 & Unindexed Query Bottleneck Auditor",
      domain: "database",
      api: ["DbQueryAuditorService.audit()"],
      cli: ["db-audit"],
      mcp: ["vp.dbQueryAudit"],
      dashboard: ["db-audit"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-055",
      title: "Multi-Environment Config & Secret Drift Auditor",
      domain: "security",
      api: ["EnvDriftAuditorService.audit()"],
      cli: ["env-drift"],
      mcp: ["vp.envDriftAudit"],
      dashboard: ["env-drift"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-056",
      title: "Visual Timeline Test Failure Replay Recorder",
      domain: "diagnostics",
      api: ["FailureReplayRecorderService.recordReplay()"],
      cli: ["replay"],
      mcp: ["vp.recordFailureReplay"],
      dashboard: ["replay"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-057",
      title: "API Rate-Limiting & DoS Threshold Profiler",
      domain: "security",
      api: ["RateLimitAuditorService.profile()"],
      cli: ["rate-limit"],
      mcp: ["vp.rateLimitAudit"],
      dashboard: ["rate-limit"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-058",
      title: "In-Memory Stateful Dynamic CRUD Mock Server",
      domain: "mocking",
      api: ["StatefulMockServerService.start()"],
      cli: ["mock-server"],
      mcp: ["vp.statefulMock"],
      dashboard: ["mock-server"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-059",
      title: "Microservices & Architecture Topology Graph Generator",
      domain: "discovery",
      api: ["ArchitectureGraphService.generateGraph()"],
      cli: ["arch-graph"],
      mcp: ["vp.architectureGraph"],
      dashboard: ["arch-graph"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-060",
      title: "Autonomous Security Testing & Attack Surface Scanner",
      domain: "security",
      api: ["SecurityEngine.scanSurface()", "SecurityEngine.runTests()", "SecretRedactor.redact()"],
      cli: ["security"],
      mcp: ["vp.securityScan", "vp.securityPlan", "vp.securityRun", "vp.securityReport"],
      dashboard: ["security"],
      docs: ["docs/guides/features.md", "docs/reference/cli.md"],
      tests: ["tests/unit/security-testing.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-061",
      title: "SARIF v2.1.0 GitHub Security Exporter",
      domain: "security",
      api: ["SarifExporterService.exportSecurityReport()"],
      cli: ["security --sarif"],
      mcp: ["vp.exportSarif"],
      dashboard: ["export-sarif"],
      docs: ["docs/reference/cli.md", "docs/reference/mcp.md"],
      tests: ["tests/unit/v100-stability-dx-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-062",
      title: "Subresource Integrity (SRI), CSRF & CORS Auditor",
      domain: "security",
      api: ["SriCsrfValidatorService.audit()"],
      cli: ["web-sec"],
      mcp: ["vp.auditSriCsrf"],
      dashboard: ["sri-csrf-audit"],
      docs: ["docs/reference/cli.md", "docs/reference/mcp.md"],
      tests: ["tests/unit/v100-stability-dx-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-063",
      title: "AST Test Deduplication & Redundancy Analyzer",
      domain: "quality",
      api: ["TestDeduplicatorService.analyze()"],
      cli: ["dedup"],
      mcp: ["vp.dedupTests"],
      dashboard: ["dedup-tests"],
      docs: ["docs/reference/cli.md", "docs/reference/mcp.md"],
      tests: ["tests/unit/v100-stability-dx-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-064",
      title: "Automated Git Pre-Commit Hook Installer",
      domain: "devops",
      api: ["GitHookInstallerService.installPreCommit()", "GitHookInstallerService.uninstallPreCommit()"],
      cli: ["hook"],
      mcp: [],
      dashboard: [],
      docs: ["docs/reference/cli.md"],
      tests: ["tests/unit/v100-stability-dx-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-065",
      title: "Local Live Dashboard HTTP Server",
      domain: "ui",
      api: ["VeloProveEngine.startUi()"],
      cli: ["ui"],
      mcp: [],
      dashboard: [],
      docs: ["docs/guides/dashboard.md", "docs/reference/cli.md"],
      tests: ["tests/unit/linter-and-dashboard.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-066",
      title: "Terminal Command Center (TUI)",
      domain: "ui",
      api: ["TuiDashboardService.start()"],
      cli: ["tui"],
      mcp: [],
      dashboard: [],
      docs: ["docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-067",
      title: "Ephemeral Mock Database & Sandbox Server",
      domain: "mocking",
      api: ["MockSandboxService.start()"],
      cli: ["sandbox"],
      mcp: [],
      dashboard: [],
      docs: ["docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-068",
      title: "Interactive Real-Time Test Watch Mode",
      domain: "execution",
      api: ["WatchModeService.start()"],
      cli: ["watch"],
      mcp: [],
      dashboard: [],
      docs: ["docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-069",
      title: "GitHub Actions CI Workflow Generator",
      domain: "devops",
      api: ["CiGeneratorService.generateWorkflow()"],
      cli: ["setup-ci"],
      mcp: [],
      dashboard: [],
      docs: ["docs/reference/cli.md"],
      tests: ["tests/unit/advanced-vp-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-070",
      title: "Model Context Protocol Stdio Server",
      domain: "mcp",
      api: ["runMcpServer()"],
      cli: ["mcp"],
      mcp: [],
      dashboard: [],
      docs: ["docs/reference/mcp.md", "docs/reference/cli.md"],
      tests: ["tests/unit/interface-parity.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-071",
      title: "System & Environment Doctor Diagnostics",
      domain: "diagnostics",
      api: ["DoctorService.diagnose()"],
      cli: ["doctor"],
      mcp: ["vp.doctor"],
      dashboard: ["doctor"],
      docs: ["docs/reference/cli.md", "docs/reference/mcp.md"],
      tests: ["tests/unit/package-distribution.test.ts"],
      status: "implemented"
    }
  ]
};

const outputDir = path.join(rootDir, 'docs/generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/** Align capability.dashboard entries with real dashboard-server action ids. */
const DASH_RENAMES = {
  bootstrap: 'teach-ai',
  'mutation-score': 'mutation',
  accessibility: 'a11y',
  'mock-network': 'mock-gen',
  changed: 'run-changed',
  'export-collection': 'export-postman',
  'remediate-malware': 'fix-malware',
  security: 'security-scan',
  replay: 'failure-replay',
  'record-scenario': 'recorder-bookmarklet'
};

const dashSet = new Set(dashboardActions);
for (const cap of manifest.capabilities) {
  const mapped = (cap.dashboard || [])
    .map((a) => DASH_RENAMES[a] || a)
    .filter((a) => dashSet.has(a));
  // Prefer unique real actions only; empty means intentionally CLI/MCP-only for that capability
  cap.dashboard = [...new Set(mapped)];
  // Keep legacy `status` for compat; add honest verificationStatus enum
  cap.verificationStatus = mapVerificationStatus(cap.id, cap.status);
}

fs.writeFileSync(path.join(outputDir, 'CAPABILITY_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Successfully generated docs/generated/CAPABILITY_MANIFEST.json');
