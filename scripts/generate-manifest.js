import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read source files
const mcpSource = fs.readFileSync(path.join(rootDir, 'src/mcp/server.ts'), 'utf8');
const cliSource = fs.readFileSync(path.join(rootDir, 'src/cli/index.ts'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(rootDir, 'src/application/dashboard-server.ts'), 'utf8');

// Extract MCP tool names
const toolRegex = /name:\s*'(qa\.[a-zA-Z0-9_\.]+)'/g;
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

console.log(`Found ${mcpTools.length} MCP tools, ${cliCommands.length} CLI commands, ${dashboardActions.length} Dashboard actions.`);

const manifest = {
  version: "1.0.0",
  package: "@engnadia/qaforge",
  cliBinary: "qaforge",
  totalCliCommands: cliCommands.length,
  totalMcpTools: mcpTools.length,
  totalDashboardActions: dashboardActions.length,
  cliCommands: cliCommands.sort(),
  mcpTools: mcpTools.sort(),
  dashboardActions: dashboardActions.sort(),
  capabilities: [
    {
      id: "CAP-001",
      title: "Project Stack & Monorepo Scanner",
      domain: "discovery",
      api: ["ProjectScanner.scan()", "StackDetector.detect()", "QAForgeEngine.inspect()"],
      cli: ["inspect", "init", "doctor"],
      mcp: ["qa.inspect", "qa.doctor"],
      dashboard: ["inspect", "doctor"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md", "docs/MCP_REFERENCE.md"],
      tests: ["tests/unit/scanner-requirements.test.ts", "tests/unit/v100-stability-enhancements.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-002",
      title: "Universal AI Agent Handshake Protocol",
      domain: "discovery",
      api: ["AgentHandshakeService.run()"],
      cli: ["agent-handshake"],
      mcp: ["qa.bootstrap"],
      dashboard: ["bootstrap"],
      docs: ["docs/AI_INTEGRATIONS.md", "docs/CLI_REFERENCE.md", "docs/MCP_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-003",
      title: "Custom In-House Framework Self-Teaching",
      domain: "discovery",
      api: ["FrameworkLearnerService.learn()", "FrameworkLearnerService.ingestAgentDoc()"],
      cli: ["learn-framework"],
      mcp: ["qa.learnFramework"],
      dashboard: ["learn-framework"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/framework-learner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-004",
      title: "Interactive Live Route Crawler & UI Explorer",
      domain: "discovery",
      api: ["ExploreAppService.explore()"],
      cli: ["explore"],
      mcp: ["qa.explore"],
      dashboard: ["explore"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-005",
      title: "API Security & Boundary Fuzzer",
      domain: "api_testing",
      api: ["ApiFuzzingService.fuzzEndpoint()"],
      cli: ["fuzz-api"],
      mcp: ["qa.fuzzApi"],
      dashboard: ["fuzz-api"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-006",
      title: "Assertion Mutation Quality Scorer",
      domain: "quality",
      api: ["MutationScorerService.score()"],
      cli: ["mutation-score"],
      mcp: ["qa.mutationScore"],
      dashboard: ["mutation-score"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-007",
      title: "Natural Language Test Assertion Refiner",
      domain: "test_generation",
      api: ["RefineTestService.refine()"],
      cli: ["refine"],
      mcp: ["qa.refine"],
      dashboard: ["refine"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-008",
      title: "Automated WCAG 2.1 Accessibility Auditor",
      domain: "accessibility",
      api: ["A11yAuditorService.audit()"],
      cli: ["a11y"],
      mcp: ["qa.accessibility"],
      dashboard: ["accessibility"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-009",
      title: "Visual Regression & Screenshot Baseline Diff",
      domain: "visual",
      api: ["VisualDiffService.compare()"],
      cli: ["visual-diff"],
      mcp: ["qa.visualDiff"],
      dashboard: ["visual-diff"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-010",
      title: "Static Code Analysis & ESLint Integration",
      domain: "quality",
      api: ["LinterService.lint()"],
      cli: ["lint"],
      mcp: ["qa.lint"],
      dashboard: ["lint"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/linter-and-dashboard.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-011",
      title: "OpenAPI Contract Drift Detector",
      domain: "api_testing",
      api: ["ContractDriftService.checkDrift()"],
      cli: ["contract-drift"],
      mcp: ["qa.contractDrift"],
      dashboard: ["contract-drift"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-012",
      title: "Dependency CVE & Secret Leakage Auditor",
      domain: "security",
      api: ["SecurityAuditService.audit()"],
      cli: ["audit"],
      mcp: ["qa.auditSec"],
      dashboard: ["audit"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-013",
      title: "Core Web Vitals & Route Performance Profiler",
      domain: "performance",
      api: ["PerfProfilerService.profile()"],
      cli: ["perf"],
      mcp: ["qa.perf"],
      dashboard: ["perf"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-014",
      title: "MSW Network Mock Handler Synthesizer",
      domain: "mocking",
      api: ["MockNetworkService.generateHandlers()"],
      cli: ["mock-gen"],
      mcp: ["qa.mockNetwork"],
      dashboard: ["mock-network"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-015",
      title: "Flaky Test Isolation & Quarantine Manager",
      domain: "quality",
      api: ["QuarantineService.quarantine()"],
      cli: ["quarantine"],
      mcp: ["qa.quarantine"],
      dashboard: ["quarantine"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-016",
      title: "PRD Requirements Coverage Heatmap Generator",
      domain: "quality",
      api: ["CoverageHeatmapService.generateHeatmap()"],
      cli: ["coverage"],
      mcp: ["qa.coverage"],
      dashboard: ["coverage"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-017",
      title: "Risk-Scored Test Planner",
      domain: "test_planning",
      api: ["PlanTestsService.createPlan()", "RiskScorer.scoreRequirement()"],
      cli: ["plan"],
      mcp: ["qa.plan"],
      dashboard: ["plan"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-018",
      title: "Multi-Framework Test Synthesizer (Vitest/Jest/Playwright)",
      domain: "test_generation",
      api: ["GenerateTestsService.generate()", "TestGenerator.generateFile()"],
      cli: ["generate"],
      mcp: ["qa.generate"],
      dashboard: ["generate"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-019",
      title: "Automated Test Runner & Result Normalizer",
      domain: "execution",
      api: ["RunTestsService.run()", "ProcessRunner.run()"],
      cli: ["test"],
      mcp: ["qa.run", "qa.run.get"],
      dashboard: ["run"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-020",
      title: "Git Diff Change Impact Analysis & Test Isolation",
      domain: "execution",
      api: ["AnalyzeChangesService.analyze()", "GitDiffAnalyzer.getChangedFiles()"],
      cli: ["changed"],
      mcp: ["qa.changed"],
      dashboard: ["changed"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/change-impact.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-021",
      title: "Evidence-Based Failure Root Cause Diagnostics",
      domain: "diagnostics",
      api: ["DiagnoseFailureService.diagnose()", "Classifier.classify()"],
      cli: ["diagnose"],
      mcp: ["qa.diagnose"],
      dashboard: ["diagnose"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/classifier-diagnostics.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-022",
      title: "Visual-Aria Test Locator Auto-Healer",
      domain: "healing",
      api: ["HealTestService.heal()", "VisualAutoHealService.healLocator()"],
      cli: ["heal"],
      mcp: ["qa.heal"],
      dashboard: ["heal"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-023",
      title: "Source Code Bug Fix Synthesizer",
      domain: "healing",
      api: ["SuggestFixService.suggest()", "BugfixSynthesizerService.synthesize()"],
      cli: ["auto-fix"],
      mcp: ["qa.suggestFix", "qa.autoBugFix"],
      dashboard: ["auto-fix"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-024",
      title: "AST Flakiness Stabilizer & Auto-Wait Fixer",
      domain: "healing",
      api: ["FlakinessStabilizerService.stabilizeFile()"],
      cli: ["stabilize"],
      mcp: ["qa.flaky", "qa.stabilizeFlaky"],
      dashboard: ["stabilize"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-025",
      title: "Quantitative Release Readiness Gate",
      domain: "quality",
      api: ["ReleaseCheckService.evaluate()"],
      cli: ["release"],
      mcp: ["qa.releaseCheck"],
      dashboard: ["release"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/integration/autonomous-flow.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-026",
      title: "Postman Collection v2.1 Runner & Dynamic Client",
      domain: "api_testing",
      api: ["PostmanRunnerService.runCollection()", "DynamicVariablesService.interpolate()"],
      cli: ["run-collection", "request"],
      mcp: ["qa.runCollection", "qa.sendRequest"],
      dashboard: ["run-collection", "request"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/postman-runner.test.ts", "tests/unit/dynamic-variables.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-027",
      title: "Postman Collection v2.1 Exporter",
      domain: "api_testing",
      api: ["PostmanRunnerService.exportCollection()"],
      cli: ["export-postman"],
      mcp: ["qa.exportCollection"],
      dashboard: ["export-collection"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/postman-runner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-028",
      title: "Local High-Concurrency Load & Stress Tester",
      domain: "performance",
      api: ["LoadTesterService.runLoadTest()"],
      cli: ["load-test"],
      mcp: ["qa.loadTest"],
      dashboard: ["load-test"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-029",
      title: "Contextual Realistic Mock Data Factory",
      domain: "mocking",
      api: ["MockDataFactoryService.generateFixture()"],
      cli: ["mock-data"],
      mcp: ["qa.mockData"],
      dashboard: ["mock-data"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-030",
      title: "OWASP Top 10 Security & Header Auditor",
      domain: "security",
      api: ["OwaspScannerService.scan()"],
      cli: ["owasp-scan"],
      mcp: ["qa.owaspScan"],
      dashboard: ["owasp-scan"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-031",
      title: "GraphQL Query & Mutation Tester",
      domain: "api_testing",
      api: ["RealtimeTesterService.testGraphQL()"],
      cli: ["graphql"],
      mcp: ["qa.graphqlTest"],
      dashboard: ["graphql"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-032",
      title: "WebSocket Connection & Handshake Tester",
      domain: "api_testing",
      api: ["RealtimeTesterService.testWebSocket()"],
      cli: ["ws-test"],
      mcp: ["qa.wsTest"],
      dashboard: ["ws-test"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-v130-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-033",
      title: "Live Remote Companion Probe Generator",
      domain: "remote_bridge",
      api: ["RemoteBridgeService.generateProbe()"],
      cli: ["remote-init"],
      mcp: ["qa.remoteInit"],
      dashboard: ["remote-init"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/remote-bridge.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-034",
      title: "Live Remote Website Bridge & Handshake",
      domain: "remote_bridge",
      api: ["RemoteBridgeService.connect()"],
      cli: ["remote-connect"],
      mcp: ["qa.remoteConnect"],
      dashboard: ["remote-connect"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/remote-bridge.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-035",
      title: "Live Remote Deep Auditor & Crawler",
      domain: "remote_bridge",
      api: ["RemoteBridgeService.runRemoteAudit()"],
      cli: ["remote-audit"],
      mcp: ["qa.remoteAudit"],
      dashboard: ["remote-audit"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/remote-bridge.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-036",
      title: "Interactive E2E Scenario Journey Recorder",
      domain: "test_generation",
      api: ["ScenarioRecorderService.synthesizePlaywrightTest()"],
      cli: ["record-scenario"],
      mcp: ["qa.recordScenario"],
      dashboard: ["record-scenario"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-037",
      title: "Database State Snapshot & Isolation",
      domain: "database",
      api: ["DbSnapshotService.createSnapshot()"],
      cli: ["db-snapshot"],
      mcp: ["qa.dbSnapshot"],
      dashboard: ["db-snapshot"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-038",
      title: "Database State Restoration & Rollback",
      domain: "database",
      api: ["DbSnapshotService.restoreSnapshot()"],
      cli: ["db-restore"],
      mcp: ["qa.dbRestore"],
      dashboard: ["db-restore"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-039",
      title: "Standalone Executive QA & Security Report Exporter",
      domain: "reporting",
      api: ["ReportExporterService.exportReport()"],
      cli: ["export-report"],
      mcp: ["qa.exportReport"],
      dashboard: ["export-report"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v120-advanced-features.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-040",
      title: "Autonomous Chaos & Edge-Case Monkey Engine",
      domain: "resilience",
      api: ["ChaosEngineService.runChaos()"],
      cli: ["chaos"],
      mcp: ["qa.chaosTest"],
      dashboard: ["chaos"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-041",
      title: "Ephemeral Container & Docker Compose Orchestrator",
      domain: "devops",
      api: ["DockerOrchestratorService.generateCompose()"],
      cli: ["docker-env"],
      mcp: ["qa.dockerEnv"],
      dashboard: ["docker-env"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-042",
      title: "Cross-Browser & Mobile Viewport Matrix Generator",
      domain: "test_generation",
      api: ["BrowserMatrixService.generateMatrixConfig()"],
      cli: ["browser-matrix"],
      mcp: ["qa.browserMatrix"],
      dashboard: ["browser-matrix"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-043",
      title: "BDD Gherkin Feature Spec & Step Generator",
      domain: "test_generation",
      api: ["BddGeneratorService.generateFeatures()"],
      cli: ["bdd"],
      mcp: ["qa.bddFeatures"],
      dashboard: ["bdd"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-044",
      title: "Webhook Alerts & Quality Verdict Dispatcher",
      domain: "devops",
      api: ["WebhookAlertsService.sendAlert()"],
      cli: ["alert"],
      mcp: ["qa.sendAlert"],
      dashboard: ["alert"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v150-enterprise-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-045",
      title: "Universal UI-to-Backend Feature Parity & Ghost Auditor",
      domain: "quality",
      api: ["FeatureParityAuditorService.auditParity()"],
      cli: ["feature-parity"],
      mcp: ["qa.featureParity"],
      dashboard: ["feature-parity"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/feature-parity.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-046",
      title: "Malware & Backdoor Scanner",
      domain: "security",
      api: ["MalwareScannerService.scan()"],
      cli: ["scan-malware"],
      mcp: ["qa.scanMalware"],
      dashboard: ["scan-malware"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/malware-scanner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-047",
      title: "Automated Malicious Code Neutralizer & Remediator",
      domain: "security",
      api: ["MalwareScannerService.remediate()"],
      cli: ["scan-malware --fix"],
      mcp: ["qa.remediateMalware"],
      dashboard: ["remediate-malware"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/malware-scanner.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-048",
      title: "LLM & AI Output Hallucination & Accuracy Evaluator",
      domain: "ai_evaluation",
      api: ["AiHallucinationEvaluatorService.evaluate()"],
      cli: ["ai-eval"],
      mcp: ["qa.aiEvaluate"],
      dashboard: ["ai-eval"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-049",
      title: "Autonomous Git Bisect Regression Commit Hunter",
      domain: "execution",
      api: ["GitBisectHunterService.bisect()"],
      cli: ["bisect"],
      mcp: ["qa.gitBisect"],
      dashboard: ["bisect"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-050",
      title: "Network Latency & Offline Drops Throttler",
      domain: "resilience",
      api: ["NetworkThrottlerService.throttle()"],
      cli: ["throttle"],
      mcp: ["qa.networkThrottle"],
      dashboard: ["throttle"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-051",
      title: "Solidity & Web3 Smart Contract Security Auditor",
      domain: "security",
      api: ["SmartContractAuditorService.auditContracts()"],
      cli: ["audit-contracts"],
      mcp: ["qa.smartContractAudit"],
      dashboard: ["audit-contracts"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-052",
      title: "Unreferenced Dead Assets & Dead CSS Purge Engine",
      domain: "quality",
      api: ["DeadAssetPurgeService.scan()", "DeadAssetPurgeService.purge()"],
      cli: ["dead-assets"],
      mcp: ["qa.deadAssetPurge"],
      dashboard: ["dead-assets"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase6-advanced-engines.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-053",
      title: "Screen Reader Speech Flow & VoiceOver Simulator",
      domain: "accessibility",
      api: ["ScreenReaderSimulatorService.simulate()"],
      cli: ["screen-reader"],
      mcp: ["qa.screenReaderSim"],
      dashboard: ["screen-reader"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-054",
      title: "SQL N+1 & Unindexed Query Bottleneck Auditor",
      domain: "database",
      api: ["DbQueryAuditorService.audit()"],
      cli: ["db-audit"],
      mcp: ["qa.dbQueryAudit"],
      dashboard: ["db-audit"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-055",
      title: "Multi-Environment Config & Secret Drift Auditor",
      domain: "security",
      api: ["EnvDriftAuditorService.audit()"],
      cli: ["env-drift"],
      mcp: ["qa.envDriftAudit"],
      dashboard: ["env-drift"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-056",
      title: "Visual Timeline Test Failure Replay Recorder",
      domain: "diagnostics",
      api: ["FailureReplayRecorderService.recordReplay()"],
      cli: ["replay"],
      mcp: ["qa.recordFailureReplay"],
      dashboard: ["replay"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-057",
      title: "API Rate-Limiting & DoS Threshold Profiler",
      domain: "security",
      api: ["RateLimitAuditorService.profile()"],
      cli: ["rate-limit"],
      mcp: ["qa.rateLimitAudit"],
      dashboard: ["rate-limit"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-058",
      title: "In-Memory Stateful Dynamic CRUD Mock Server",
      domain: "mocking",
      api: ["StatefulMockServerService.start()"],
      cli: ["mock-server"],
      mcp: ["qa.statefulMock"],
      dashboard: ["mock-server"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-059",
      title: "Microservices & Architecture Topology Graph Generator",
      domain: "discovery",
      api: ["ArchitectureGraphService.generateGraph()"],
      cli: ["arch-graph"],
      mcp: ["qa.architectureGraph"],
      dashboard: ["arch-graph"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/phase7-enterprise-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-060",
      title: "Autonomous Security Testing & Attack Surface Scanner",
      domain: "security",
      api: ["SecurityEngine.scanSurface()", "SecurityEngine.runTests()", "SecretRedactor.redact()"],
      cli: ["security"],
      mcp: ["qa.securityScan", "qa.securityPlan", "qa.securityRun", "qa.securityReport"],
      dashboard: ["security"],
      docs: ["docs/FEATURES_GUIDE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/security-testing.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-061",
      title: "SARIF v2.1.0 GitHub Security Exporter",
      domain: "security",
      api: ["SarifExporterService.exportSecurityReport()"],
      cli: ["security --sarif"],
      mcp: ["qa.exportSarif"],
      dashboard: ["export-sarif"],
      docs: ["docs/CLI_REFERENCE.md", "docs/MCP_REFERENCE.md"],
      tests: ["tests/unit/v100-stability-dx-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-062",
      title: "Subresource Integrity (SRI), CSRF & CORS Auditor",
      domain: "security",
      api: ["SriCsrfValidatorService.audit()"],
      cli: ["web-sec"],
      mcp: ["qa.auditSriCsrf"],
      dashboard: ["sri-csrf-audit"],
      docs: ["docs/CLI_REFERENCE.md", "docs/MCP_REFERENCE.md"],
      tests: ["tests/unit/v100-stability-dx-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-063",
      title: "AST Test Deduplication & Redundancy Analyzer",
      domain: "quality",
      api: ["TestDeduplicatorService.analyze()"],
      cli: ["dedup"],
      mcp: ["qa.dedupTests"],
      dashboard: ["dedup-tests"],
      docs: ["docs/CLI_REFERENCE.md", "docs/MCP_REFERENCE.md"],
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
      docs: ["docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/v100-stability-dx-suite.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-065",
      title: "Local Live Dashboard HTTP Server",
      domain: "ui",
      api: ["QAForgeEngine.startUi()"],
      cli: ["ui"],
      mcp: [],
      dashboard: [],
      docs: ["docs/DASHBOARD_UI.md", "docs/CLI_REFERENCE.md"],
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
      docs: ["docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
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
      docs: ["docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
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
      docs: ["docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
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
      docs: ["docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/advanced-qa-services.test.ts"],
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
      docs: ["docs/MCP_REFERENCE.md", "docs/CLI_REFERENCE.md"],
      tests: ["tests/unit/interface-parity.test.ts"],
      status: "implemented"
    },
    {
      id: "CAP-071",
      title: "System & Environment Doctor Diagnostics",
      domain: "diagnostics",
      api: ["DoctorService.diagnose()"],
      cli: ["doctor"],
      mcp: ["qa.doctor"],
      dashboard: ["doctor"],
      docs: ["docs/CLI_REFERENCE.md", "docs/MCP_REFERENCE.md"],
      tests: ["tests/unit/package-distribution.test.ts"],
      status: "implemented"
    }
  ]
};

const outputDir = path.join(rootDir, 'docs/generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'CAPABILITY_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Successfully generated docs/generated/CAPABILITY_MANIFEST.json');
