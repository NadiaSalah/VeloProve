/**
 * VeloProveEngine — single orchestration façade used by CLI, MCP, and Dashboard.
 *
 * Design notes for contributors:
 * - Prefer calling services through this class so WorkspaceGuard, InspectCache,
 *   LocalStorage, and execution policy stay consistent across surfaces.
 * - New capabilities must also register in CLI (`src/cli/index.ts`), MCP
 *   (`src/mcp/server.ts`), docs, and `tests/unit/interface-parity.test.ts`.
 * - Never bypass WorkspaceGuard when writing files or spawning processes.
 */
import type { ProjectProfile } from '../shared/types/project.js';
import type { DiscoveredRequirement, FeatureMap } from '../shared/types/requirements.js';
import type { TestPlan, TestRunRequest, TestRunResult, GeneratedTestFile, OverwritePolicy } from '../shared/types/tests.js';
import type { DiagnosticResult, HealResult, SourceFixSuggestion } from '../shared/types/diagnostics.js';
import type { ReleaseConfidenceReport, FlakyTestReport } from '../shared/types/release.js';
import type { ImpactAnalysisResult } from '../intelligence/change-impact/dependency-graph.js';
import { ProjectTwinService } from './project-twin.js';
import type { TwinBuildOptions, TwinInspectResult, TwinLatestDocument } from '../shared/types/project-twin.js';
import type { OperationResult } from '../shared/types/operation.js';
import {
  aggregateDrift,
  toTwinDriftFacet,
  type AggregatedDriftReport
} from './twin-drift-aggregator.js';
import { planAffectedTests } from './twin-affected-tests.js';
import { SafeProcessRunner } from '../execution/process-runner.js';
import { collectSecuritySurfaceHints } from './twin-security-hooks.js';

import { WorkspaceGuard } from '../execution/workspace-guard.js';
import { LocalStorage } from '../storage/local-store.js';
import { ConfigLoader } from '../shared/config-loader.js';
import { ProjectScanner } from '../intelligence/project-scanner/index.js';
import { RequirementDiscovery } from '../intelligence/requirement-discovery/index.js';
import { FeatureMapBuilder } from '../intelligence/feature-map/feature-builder.js';
import { PlanTestsService, type PlanTestsOptions } from './plan-tests.js';
import { GenerateTestsService } from './generate-tests.js';
import { VitestAdapter } from '../adapters/vitest/vitest-adapter.js';
import { JestAdapter } from '../adapters/jest/jest-adapter.js';
import { PlaywrightAdapter } from '../adapters/playwright/playwright-adapter.js';
import { NodeTestAdapter } from '../adapters/node-test/node-test-adapter.js';
import { DiagnoseFailureService } from './diagnose-failure.js';
import { HealTestService } from './heal-test.js';
import { VisualAutoHealService } from './visual-autoheal.js';
import { SuggestFixService } from './suggest-fix.js';
import { AnalyzeChangesService } from './analyze-changes.js';
import { FlakyDetector } from '../domain/tests/flaky-detector.js';
import { ReleaseCheckService } from './release-check.js';
import { InspectCache } from './inspect-cache.js';
import { mergeExecutionPolicy } from '../shared/execution-policy.js';
import { RunHistoryService } from './run-history.js';

import { AgentAdaptationService, type AgentCapabilities, type AgentHandshakeResult } from './agent-handshake.js';
import { DocsAssistantService, type DocsAskResult } from './docs-assistant.js';
import { AppExplorationService, type SiteExplorationResult } from './explore-app.js';

import { ApiFuzzingService, type FuzzProbeResult } from './api-fuzzing.js';

import { LocalDashboardServer } from './dashboard-server.js';

import { CiGeneratorService } from './ci-generator.js';

import { MutationScoreService, type MutationScoreResult } from './mutation-scorer.js';

import { TestRefineService, type TestRefineRequest, type TestRefineResult } from './refine-test.js';
import { A11yAuditorService, type A11yAuditResult } from './a11y-auditor.js';
import { VisualDiffService, type VisualRegressionReport } from './visual-diff.js';
import { ContractDriftService, type ContractDriftReport } from './contract-drift.js';
import { WatchModeService } from './watch-mode.js';
import { MockSandboxService, type SandboxEnvironment } from './mock-sandbox.js';
import { LinterService, type LintOptions, type LintReport } from './linter-service.js';
import { SecurityAuditService, type SecurityAuditReport } from './security-audit.js';
import { PerformanceProfilerService, type PerformanceAuditReport } from './perf-profiler.js';
import { MockNetworkGenerator, type MockNetworkResult } from './mock-network.js';
import { QuarantineService, type QuarantineReport, type QuarantinedTestItem } from './quarantine-service.js';
import { CoverageHeatmapService, type HeatmapReport } from './coverage-heatmap.js';
import { TuiDashboardService } from './tui-dashboard.js';
import { FrameworkLearnerService, type LearnFrameworkRequest, type LearnFrameworkResult } from './framework-learner.js';
import {
  PostmanRunnerService,
  type PostmanCollection,
  type PostmanRunResult,
  type HttpRequestOptions,
  type HttpResponseResult
} from '../adapters/api/postman-runner.js';
import { LoadTesterService, type LoadTestOptions, type LoadTestReport } from './load-tester.js';
import { MockDataFactoryService, type MockDataOptions } from './mock-data-factory.js';
import { OwaspScannerService, type OwaspScanReport } from './owasp-scanner.js';
import {
  RealtimeTesterService,
  type GraphQLTestOptions,
  type GraphQLTestResult,
  type WebSocketTestOptions,
  type WebSocketTestResult
} from './realtime-tester.js';
import {
  RemoteBridgeService,
  type ProbeType,
  type RemoteProbeConfig,
  type RemoteHandshakeResult,
  type RemoteAuditReport
} from './remote-bridge.js';
import {
  ScenarioRecorderService,
  type ScenarioRecordingOptions,
  type GeneratedScenarioResult
} from './scenario-recorder.js';
import {
  FlakinessStabilizerService,
  type FlakinessAuditResult
} from './flakiness-stabilizer.js';
import {
  DatabaseSnapshotService,
  type DatabaseSnapshotInfo
} from './db-snapshot.js';
import {
  BugFixSynthesizerService,
  type BugFixReport
} from './bugfix-synthesizer.js';
import {
  StandaloneReportExporter,
  type StandaloneReportOptions,
  type StandaloneReportResult
} from './report-exporter.js';
import {
  ChaosEngineService,
  type ChaosTestOptions,
  type ChaosReport
} from './chaos-engine.js';
import {
  DockerOrchestratorService,
  type DockerEnvironmentConfig,
  type GeneratedDockerConfigResult
} from './docker-orchestrator.js';
import {
  BrowserMatrixService,
  type BrowserMatrixOptions,
  type BrowserMatrixResult
} from './browser-matrix.js';
import {
  BddGeneratorService,
  type BddFeatureFile
} from './bdd-generator.js';
import {
  WebhookAlertService,
  type WebhookDispatchOptions,
  type WebhookDispatchResult
} from './webhook-alerts.js';
import {
  FeatureParityAuditorService,
  type FeatureParityReport
} from './feature-parity-auditor.js';
import {
  MalwareScannerService,
  type MalwareScanReport,
  type RemediationResult
} from './malware-scanner.js';
import {
  AiHallucinationEvaluatorService,
  type AiEvaluationPrompt,
  type AiHallucinationReport
} from './ai-hallucination-evaluator.js';
import {
  GitBisectHunterService,
  type BisectHuntingResult
} from './git-bisect-hunter.js';
import {
  NetworkThrottlerService,
  type ThrottledRequestOptions,
  type ThrottledResponseResult
} from './network-throttler.js';
import {
  SmartContractAuditorService,
  type SmartContractAuditReport
} from './smart-contract-auditor.js';
import {
  DeadAssetPurgeService,
  type DeadAssetReport
} from './dead-asset-purge.js';
import {
  ScreenReaderSimulatorService,
  type ScreenReaderSimulationReport
} from './screen-reader-simulator.js';
import {
  DatabaseQueryAuditorService,
  type DbQueryAuditReport
} from './db-query-auditor.js';
import {
  EnvDriftAuditorService,
  type EnvDriftReport
} from './env-drift-auditor.js';
import {
  FailureReplayRecorderService,
  type FailureReplayPackage
} from './failure-replay-recorder.js';
import {
  RateLimitAuditorService,
  type RateLimitProbeResult
} from './rate-limit-auditor.js';
import {
  StatefulMockServerService,
  type StatefulMockServerConfig
} from './stateful-mock-server.js';
import {
  ArchitectureGraphService,
  type ArchitectureGraphReport
} from './architecture-graph.js';
import { SecurityEngine } from './security-engine.js';
import { SarifExporterService, type SarifLog } from './sarif-exporter.js';
import { SriCsrfValidatorService, type AdvancedWebSecurityReport } from './sri-csrf-validator.js';
import { TestDeduplicatorService, type TestDeduplicationReport } from '../domain/tests/test-deduplicator.js';
import { GitHookInstallerService, type HookInstallResult } from './git-hook-installer.js';
import {
  SmartDevServerService,
  type EnsureDevServerOptions,
  type EnsureDevServerResult
} from './smart-dev-server.js';
import {
  SecurityPolicyWizard,
  type SecurityPolicyInitOptions,
  type SecurityPolicyInitResult
} from './security-policy-wizard.js';
import type {
  SecurityAttackSurface,
  SecurityTestPlan,
  SecurityReport,
  SecurityTestingOptions
} from '../shared/types/security.js';
import {
  DoctorService,
  type DoctorReport
} from './doctor-service.js';
import fs from 'node:fs';






export class VeloProveEngine {
  public readonly guard: WorkspaceGuard;
  public readonly storage: LocalStorage;
  public readonly configLoader: ConfigLoader;

  constructor(projectRoot: string = process.cwd()) {
    this.guard = new WorkspaceGuard(projectRoot);
    this.storage = new LocalStorage(this.guard);
    this.configLoader = new ConfigLoader(this.guard);
  }

  public learnFramework(request: LearnFrameworkRequest = {}): LearnFrameworkResult {
    return FrameworkLearnerService.learn(this.guard, request);
  }

  public auditSecurity(): SecurityAuditReport {
    return SecurityAuditService.audit(this.guard);
  }

  public async profilePerf(): Promise<PerformanceAuditReport> {
    const { profile } = await this.inspect();
    return PerformanceProfilerService.profile(profile, this.guard);
  }

  public async generateMsw(): Promise<MockNetworkResult> {
    const { profile, requirements } = await this.inspect();
    return MockNetworkGenerator.generate(profile, requirements, this.guard);
  }

  public quarantineFlaky(threshold?: number): QuarantineReport {
    return QuarantineService.quarantineFlakyTests(this.guard, this.storage, threshold);
  }

  public getQuarantined(): QuarantinedTestItem[] {
    return QuarantineService.getQuarantined(this.guard);
  }

  public async getCoverageHeatmap(): Promise<HeatmapReport> {
    const { profile, requirements } = await this.inspect();
    const latestRun = this.storage.getLatestTestRun();
    return CoverageHeatmapService.generateHeatmap(requirements, profile, latestRun);
  }

  public async renderTui(): Promise<void> {
    return TuiDashboardService.renderTui(this);
  }

  public async lint(options: LintOptions = {}): Promise<LintReport> {
    return LinterService.runLint(this.guard, options);
  }

  public async refineTest(request: TestRefineRequest): Promise<TestRefineResult> {
    return TestRefineService.refine(this.guard, request);
  }

  public async auditA11y(): Promise<A11yAuditResult> {
    const { profile } = await this.inspect();
    return A11yAuditorService.audit(profile, this.guard);
  }

  public async compareVisuals(): Promise<VisualRegressionReport> {
    return VisualDiffService.compareSnapshots(this.guard);
  }

  public async checkContractDrift(): Promise<ContractDriftReport> {
    const { profile, requirements } = await this.inspect();
    return ContractDriftService.detectDrift(profile, requirements);
  }

  public async runPostmanCollection(
    collectionPathOrJson: string,
    envPathOrJson?: string,
    baseURL?: string
  ): Promise<PostmanRunResult> {
    const collection = PostmanRunnerService.loadCollection(this.guard, collectionPathOrJson);
    const initialEnv = envPathOrJson ? PostmanRunnerService.loadEnvironment(this.guard, envPathOrJson) : undefined;
    return PostmanRunnerService.runCollection(collection, { initialEnv, baseURL });
  }

  public async exportPostmanCollection(
    outputPath = 'veloprove_postman_collection.json',
    collectionName?: string
  ): Promise<{ collection: PostmanCollection; savedPath: string }> {
    const { profile, requirements } = await this.inspect();
    const collection = PostmanRunnerService.exportToPostman(profile, requirements, collectionName);
    const resolvedPath = this.guard.resolveSafePath(outputPath);
    fs.writeFileSync(resolvedPath, JSON.stringify(collection, null, 2), 'utf8');
    return { collection, savedPath: resolvedPath };
  }

  public async sendHttpRequest(options: HttpRequestOptions): Promise<HttpResponseResult> {
    return PostmanRunnerService.sendRequest(options);
  }

  public async runLoadTest(options: LoadTestOptions): Promise<LoadTestReport> {
    return LoadTesterService.runLoadTest(options);
  }

  public generateMockData(options: MockDataOptions = {}): unknown[] {
    return MockDataFactoryService.generate(options);
  }

  public async scanOwasp(targetUrl: string): Promise<OwaspScanReport> {
    return OwaspScannerService.scanEndpoint(targetUrl);
  }

  public async runGraphQL(options: GraphQLTestOptions): Promise<GraphQLTestResult> {
    return RealtimeTesterService.runGraphQL(options);
  }

  public async testWebSocket(options: WebSocketTestOptions): Promise<WebSocketTestResult> {
    return RealtimeTesterService.testWebSocket(options);
  }

  public generateRemoteProbe(type: ProbeType = 'standalone_js', config: RemoteProbeConfig = {}): { code: string; filename: string; instructions: string } {
    return RemoteBridgeService.generateProbeSnippet(type, config);
  }

  public async connectRemoteSite(remoteUrl: string, bridgeSecret?: string): Promise<RemoteHandshakeResult> {
    return RemoteBridgeService.connectAndHandshake(remoteUrl, bridgeSecret);
  }

  public async auditRemoteSite(
    remoteUrl: string,
    options: { includeLoadTest?: boolean; loadVus?: number; bridgeSecret?: string } = {}
  ): Promise<RemoteAuditReport> {
    return RemoteBridgeService.runRemoteAudit(remoteUrl, options);
  }

  public recordScenario(options: ScenarioRecordingOptions): GeneratedScenarioResult {
    return ScenarioRecorderService.synthesizeScenario(this.guard, options);
  }

  public getRecorderBookmarklet(): string {
    return ScenarioRecorderService.generateBookmarklet();
  }

  public recordScenarioFromPayload(payload: {
    title?: string;
    startUrl?: string;
    steps?: import('./scenario-recorder.js').RecordedUserStep[];
    outputFile?: string;
    framework?: 'playwright' | 'vitest';
  }): GeneratedScenarioResult {
    return ScenarioRecorderService.synthesizeFromPayload(this.guard, payload);
  }

  public stabilizeTests(targetFileOrCode: string, saveFix = false): FlakinessAuditResult {
    return FlakinessStabilizerService.stabilize(this.guard, targetFileOrCode, saveFix);
  }

  public createDbSnapshot(name: string, filePaths: string[]): DatabaseSnapshotInfo {
    return DatabaseSnapshotService.createSnapshot(this.guard, name, filePaths);
  }

  public restoreDbSnapshot(snapshotId: string): { success: boolean; restoredFiles: string[]; error?: string } {
    return DatabaseSnapshotService.restoreSnapshot(this.guard, snapshotId);
  }

  public listDbSnapshots(): DatabaseSnapshotInfo[] {
    return DatabaseSnapshotService.listSnapshots(this.guard);
  }

  public async autoFixBugs(apply = false): Promise<BugFixReport> {
    const diagnoses = await this.diagnose();
    return BugFixSynthesizerService.synthesizePatches(this.guard, diagnoses, apply);
  }

  public exportReport(options: StandaloneReportOptions = {}): StandaloneReportResult {
    return StandaloneReportExporter.export(this.guard, this.storage, options);
  }

  public async runChaosTest(options: ChaosTestOptions): Promise<ChaosReport> {
    return ChaosEngineService.runChaosTest(options);
  }

  public generateDockerEnv(config: DockerEnvironmentConfig): GeneratedDockerConfigResult {
    return DockerOrchestratorService.generateTestEnvironment(this.guard, config);
  }

  public generateBrowserMatrix(options: BrowserMatrixOptions = {}): BrowserMatrixResult {
    return BrowserMatrixService.generateMatrix(options);
  }

  public async generateBddFeatures(outputDir = 'features'): Promise<BddFeatureFile[]> {
    const { requirements } = await this.inspect();
    return BddGeneratorService.generateFromRequirements(this.guard, requirements, outputDir);
  }

  public async sendAlert(options: WebhookDispatchOptions): Promise<WebhookDispatchResult> {
    const history = this.getRunHistory();
    const enriched = {
      ...options,
      payload: {
        ...options.payload,
        branch: options.payload.branch ?? history?.aggregates.currentBranch,
        mttrHours:
          options.payload.mttrHours !== undefined
            ? options.payload.mttrHours
            : history?.aggregates.currentMttrHours,
        velocityDelta:
          options.payload.velocityDelta !== undefined
            ? options.payload.velocityDelta
            : history?.aggregates.branchStats?.find(
                (s) => s.branch === (options.payload.branch || history?.aggregates.currentBranch)
              )?.velocityDelta,
        regressionAlert:
          options.payload.regressionAlert ?? history?.aggregates.regressionAlert
      }
    };
    return WebhookAlertService.sendAlert(enriched);
  }

  public auditFeatureParity(options: { generateE2ESuite?: boolean } = {}): FeatureParityReport {
    return FeatureParityAuditorService.audit(this.guard, options);
  }

  public scanMalware(): MalwareScanReport {
    return MalwareScannerService.scan(this.guard);
  }

  public remediateMalware(threatIds?: string[]): RemediationResult {
    return MalwareScannerService.remediate(this.guard, threatIds);
  }

  public async evaluateAiOutputs(options: {
    endpointUrl?: string;
    modelResponses?: { promptId: string; prompt: string; response: string }[];
    testCases: AiEvaluationPrompt[];
  }): Promise<AiHallucinationReport> {
    return AiHallucinationEvaluatorService.evaluate(options);
  }

  public async huntRegression(options: { testCommand?: string; goodCommit?: string; badCommit?: string; maxCommits?: number } = {}): Promise<BisectHuntingResult> {
    return GitBisectHunterService.huntRegression(this.guard, options);
  }

  public async throttleRequest(options: ThrottledRequestOptions): Promise<ThrottledResponseResult> {
    return NetworkThrottlerService.runThrottledRequest(options);
  }

  public auditSmartContracts(): SmartContractAuditReport {
    return SmartContractAuditorService.auditContracts(this.guard);
  }

  public scanDeadAssets(): DeadAssetReport {
    return DeadAssetPurgeService.scan(this.guard);
  }

  public purgeDeadAssets(items?: string[]): { success: boolean; deletedFiles: string[]; bytesFreed: number } {
    return DeadAssetPurgeService.purge(this.guard, items);
  }

  public simulateScreenReader(options: { targetPaths?: string[]; rawHtml?: string } = {}): ScreenReaderSimulationReport {
    return ScreenReaderSimulatorService.simulate(this.guard, options);
  }

  public auditDbQueries(options: { targetDir?: string; scanAllExtensions?: boolean } = {}): DbQueryAuditReport {
    return DatabaseQueryAuditorService.audit(this.guard, options);
  }

  public auditEnvDrift(options: { generateExample?: boolean } = {}): EnvDriftReport {
    return EnvDriftAuditorService.audit(this.guard, options);
  }

  public recordFailureReplay(params: {
    testTitle: string;
    testFile: string;
    errorMessage: string;
    steps?: { action: string; target?: string; value?: string; durationMs?: number; passed?: boolean }[];
    saveToFile?: boolean;
  }): FailureReplayPackage {
    return FailureReplayRecorderService.recordFromFailure(this.guard, params);
  }

  public async auditRateLimit(options: {
    targetUrl: string;
    requestCount?: number;
    concurrency?: number;
    method?: string;
    headers?: Record<string, string>;
  }): Promise<RateLimitProbeResult> {
    return RateLimitAuditorService.auditEndpoint(options);
  }

  public async startStatefulMock(config: StatefulMockServerConfig = {}): Promise<{ port: number; status: string; collections: string[] }> {
    return StatefulMockServerService.startServer(config);
  }

  public stopStatefulMock(): { status: string } {
    return StatefulMockServerService.stopServer();
  }

  public resetStatefulMock(): { collections: string[]; itemCount: number } {
    return StatefulMockServerService.resetState();
  }

  public generateArchitectureGraph(): ArchitectureGraphReport {
    return ArchitectureGraphService.generateGraph(this.guard);
  }

  public async scanSecuritySurface(): Promise<SecurityAttackSurface> {
    const { profile } = await this.inspect();
    return SecurityEngine.scanSurface(this.guard, profile);
  }

  public async planSecurityTests(options: SecurityTestingOptions = {}): Promise<SecurityTestPlan> {
    const surface = await this.scanSecuritySurface();
    return SecurityEngine.createPlan(surface, options);
  }

  public async runSecurityTests(options: SecurityTestingOptions = {}): Promise<SecurityReport> {
    if (options.ensureDev === true) {
      await this.ensureDevServer({
        baseURL: options.baseURL,
        reuseExisting: true
      });
    }
    const { profile } = await this.inspect();
    const surface = await SecurityEngine.scanSurface(this.guard, profile);
    const plan = SecurityEngine.createPlan(surface, options);
    const report = await SecurityEngine.runTests(this.guard, plan, options, profile);
    RunHistoryService.recordSecurityScore(this.guard, report.securityScore);
    return report;
  }

  public async generateSecurityReport(options: SecurityTestingOptions = {}): Promise<SecurityReport> {
    return this.runSecurityTests(options);
  }

  public async ensureDevServer(options: EnsureDevServerOptions = {}): Promise<EnsureDevServerResult> {
    return SmartDevServerService.ensure(this.guard, options);
  }

  public initSecurityPolicy(options: SecurityPolicyInitOptions = {}): SecurityPolicyInitResult {
    return SecurityPolicyWizard.initPolicy(this.guard, options);
  }

  public exportSarif(report: SecurityReport, auditReport?: any, outputPath?: string): { sarifPath: string; log: SarifLog } {
    return SarifExporterService.exportSecurityReport(this.guard, report, auditReport, outputPath);
  }

  public auditSriAndCsrf(): AdvancedWebSecurityReport {
    return SriCsrfValidatorService.audit(this.guard);
  }

  public deduplicateTests(testFiles?: string[]): TestDeduplicationReport {
    return TestDeduplicatorService.analyze(this.guard, testFiles);
  }

  public installGitHook(command = 'npx veloprove changed'): HookInstallResult {
    return GitHookInstallerService.installPreCommit(this.guard, command);
  }

  public uninstallGitHook(): { uninstalled: boolean; message: string } {
    return GitHookInstallerService.uninstallPreCommit(this.guard);
  }

  public doctor(): DoctorReport {
    return DoctorService.diagnose(this.guard);
  }









  public watch(
    onIteration?: (info: {
      changedFile: string;
      impactedTests: string[];
      status: 'passed' | 'failed';
      mode?: 'watch' | 'verify' | 'interval';
    }) => void,
    options?: import('./watch-mode.js').WatchModeOptions
  ): { close: () => void } {
    return WatchModeService.startWatch(this, onIteration, options);
  }

  public async startSandbox(port = 8089): Promise<SandboxEnvironment> {
    return MockSandboxService.createSandbox(port);
  }

  public async evaluateMutationScore(): Promise<MutationScoreResult> {
    const { profile } = await this.inspect();
    return MutationScoreService.evaluateQuality(profile, this.guard);
  }

  public setupCi(): string {
    return CiGeneratorService.generateGitHubWorkflow(this.guard);
  }

  public async startUi(port = 4173): Promise<{ url: string; close: () => void }> {
    await this.inspect();
    return LocalDashboardServer.start(this.guard, this.storage, port, this);
  }

  public handshake(capabilities: AgentCapabilities = {}): AgentHandshakeResult {
    return AgentAdaptationService.handshake(this.guard, capabilities);
  }

  /** Answer a question using packaged documentation only (no cloud LLM). */
  public askDocs(question: string): DocsAskResult {
    return DocsAssistantService.ask(question, this.guard.getRoot());
  }

  public async explore(options: { baseURL?: string; ensureDev?: boolean } = {}): Promise<SiteExplorationResult> {
    if (options.ensureDev === true) {
      await this.ensureDevServer({ baseURL: options.baseURL, reuseExisting: true });
    }
    const { profile } = await this.inspect();
    return AppExplorationService.explore(profile, this.guard, options);
  }

  public async fuzzApi(): Promise<FuzzProbeResult[]> {
    const { profile } = await this.inspect();
    return ApiFuzzingService.generateFuzzProbes(profile.apiEndpoints);
  }

  public async inspect(options: { bypassCache?: boolean } = {}): Promise<{ profile: ProjectProfile; requirements: DiscoveredRequirement[]; featureMap: FeatureMap }> {
    const root = this.guard.getRoot();
    const cfg = await this.configLoader.loadConfig();
    const cacheEnabled = cfg.cache?.inspect !== false;

    if (cacheEnabled && !options.bypassCache) {
      const cached = InspectCache.get(root);
      if (cached) {
        return cached;
      }
    }

    const profile = ProjectScanner.scan(root);
    const requirements = RequirementDiscovery.discover(profile);
    const featureMap = FeatureMapBuilder.build(requirements, profile);

    this.storage.saveProjectProfile(profile);
    this.storage.saveRequirements(requirements);
    this.storage.saveFeatureMap(featureMap);

    const result = { profile, requirements, featureMap };
    if (cacheEnabled) {
      InspectCache.set(root, result);
    }
    return result;
  }

  /** Invalidate inspect cache (e.g. after large file writes). */
  public invalidateInspectCache(): void {
    InspectCache.invalidate();
  }

  public async getExecutionPolicy() {
    const cfg = await this.configLoader.loadConfig();
    return mergeExecutionPolicy(cfg.execution);
  }

  public async plan(options: PlanTestsOptions = {}): Promise<TestPlan> {
    const { profile, requirements } = await this.inspect();
    let impactedTestFiles = options.impactedTestFiles;
    if (options.scope === 'changed' && (!impactedTestFiles || impactedTestFiles.length === 0)) {
      try {
        const impact = await this.changed();
        impactedTestFiles = [...impact.impactedTestFiles, ...impact.changedFiles];
      } catch {
        impactedTestFiles = [];
      }
    }
    const plan = PlanTestsService.createPlan(profile, requirements, {
      ...options,
      impactedTestFiles,
      projectRoot: this.guard.getRoot()
    });
    this.storage.saveTestPlan(plan);
    return plan;
  }

  public async generate(options: {
    planId?: string;
    testCaseIds?: string[];
    overwritePolicy?: OverwritePolicy;
    liveGround?: boolean;
    baseURL?: string;
    writeFixtures?: boolean;
  } = {}): Promise<{
    generatedFiles: GeneratedTestFile[];
    skippedFiles: string[];
    writtenCount: number;
    groundedCount: number;
    fixturesDir?: string;
  }> {
    const plan = options.planId
      ? this.storage.getTestPlan(options.planId)
      : this.storage.getLatestTestPlan() || (await this.plan());

    if (!plan) {
      throw new Error('No test plan found to generate tests from.');
    }

    return GenerateTestsService.generate(plan, this.guard, options);
  }

  public async run(request: TestRunRequest = {}): Promise<TestRunResult> {
    const { profile } = await this.inspect();
    const context = { projectRoot: this.guard.getRoot() };

    let resolved: TestRunRequest = { ...request };
    const scope = request.scope || 'all';

    if (
      (scope === 'changed' || scope === 'affected') &&
      (!request.paths || request.paths.length === 0)
    ) {
      const impact = await AnalyzeChangesService.analyze(profile, this.guard);
      const allTestPaths = profile.testFiles.map((t) => t.relativePath);

      if (scope === 'affected') {
        const plan = planAffectedTests(impact, this.storage.getTwinLatest(), allTestPaths);
        resolved = {
          ...request,
          scope: plan.expandedToAll ? 'all' : 'paths',
          paths: plan.expandedToAll ? undefined : plan.paths,
          selectionRationale: plan.rationale
        };
      } else {
        // changed: never shrink below graph; empty → all
        const paths =
          impact.impactedTestFiles.length > 0 ? impact.impactedTestFiles : allTestPaths;
        resolved = {
          ...request,
          scope: impact.impactedTestFiles.length > 0 ? 'paths' : 'all',
          paths: impact.impactedTestFiles.length > 0 ? paths : undefined,
          selectionRationale: [
            impact.impactedTestFiles.length > 0
              ? `changed scope: ${impact.impactedTestFiles.length} impacted test(s) from DependencyGraph`
              : 'changed scope: no mapped tests — expanded to full suite'
          ]
        };
      }
    }

    let adapter;
    if (profile.testFrameworks.includes('vitest')) {
      adapter = new VitestAdapter();
    } else if (profile.testFrameworks.includes('jest')) {
      adapter = new JestAdapter();
    } else if (profile.testFrameworks.includes('playwright')) {
      adapter = new PlaywrightAdapter();
    } else if (profile.testFrameworks.includes('node:test')) {
      adapter = new NodeTestAdapter();
    } else {
      // No supported runner — do not spawn a phantom vitest (Windows EINVAL / missing binary).
      const empty: TestRunResult = {
        runId: `run_no_runner_${Date.now()}`,
        timestamp: new Date().toISOString(),
        scope: resolved.scope || 'all',
        status: 'passed',
        durationMs: 0,
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0 },
        testResults: [],
        failures: [],
        artifacts: []
      };
      this.storage.saveTestRun(empty);
      RunHistoryService.recordRun(this.guard, this.storage, empty);
      return empty;
    }

    const result = await adapter.run(resolved, context);
    if (resolved.selectionRationale?.length) {
      result.selectionRationale = resolved.selectionRationale;
    }
    this.storage.saveTestRun(result);

    // Update flaky analysis + durable history snapshot
    const allRuns = this.storage.getAllTestRuns();
    const flakyReports = FlakyDetector.analyzeHistory(allRuns);
    this.storage.saveFlakyHistory(flakyReports);
    RunHistoryService.recordRun(this.guard, this.storage, result);

    return result;
  }

  public getRunHistory() {
    return RunHistoryService.load(this.guard) || RunHistoryService.rebuild(this.guard, this.storage);
  }

  public async diagnose(runId?: string): Promise<DiagnosticResult[]> {
    const runResult = runId ? this.storage.getTestRun(runId) : this.storage.getLatestTestRun();
    if (!runResult) {
      throw new Error('No test run found to diagnose.');
    }
    return DiagnoseFailureService.diagnose(runResult);
  }

  public async heal(runId?: string): Promise<HealResult[]> {
    const diagnoses = await this.diagnose(runId);
    const standardHeals = await HealTestService.heal(diagnoses, this.guard);
    const visualHeals = await VisualAutoHealService.healWithVisualAria(diagnoses, this.guard);
    return [...standardHeals, ...visualHeals];
  }

  public suggestFix(diagnosis: DiagnosticResult): SourceFixSuggestion {
    return SuggestFixService.suggest(diagnosis);
  }

  public async changed(): Promise<ImpactAnalysisResult> {
    const { profile } = await this.inspect();
    return AnalyzeChangesService.analyze(profile, this.guard);
  }

  /**
   * Build / refresh Project Twin (composition over inspect SSOT).
   * Optional facets wrap existing `changed` and drift aggregator — no parallel engines.
   */
  public async twinBuild(options: TwinBuildOptions = {}): Promise<OperationResult<TwinLatestDocument>> {
    const started = Date.now();
    const previous = this.storage.getTwinLatest();
    const { profile, requirements, featureMap } = await this.inspect({
      bypassCache: options.bypassCache
    });

    const fingerprint = InspectCache.fingerprint(this.guard.getRoot());
    const reuseGraph =
      options.incremental !== false &&
      !options.force &&
      !!previous &&
      previous.fingerprint === fingerprint;

    // Fast path: fingerprint match, no facet refresh requested
    if (
      reuseGraph &&
      previous &&
      !options.withImpact &&
      !options.withDrift &&
      !options.force
    ) {
      const skipped = {
        ...previous,
        generatedAt: new Date().toISOString(),
        warnings: [
          ...previous.warnings.filter((w) => !w.startsWith('Incremental Twin:')),
          'Incremental Twin: skipped rebuild (fingerprint unchanged). Pass --force to rebuild.'
        ]
      };
      this.storage.saveTwinLatest(skipped);
      const result = ProjectTwinService.toOperationResult(skipped);
      result.durationMs = Date.now() - started;
      result.metadata = {
        ...result.metadata,
        incremental: true,
        skippedRebuild: true
      };
      return result;
    }

    let impact = null;
    const warnings: string[] = [];
    let driftFacet = null;

    if (options.withImpact) {
      try {
        impact = await AnalyzeChangesService.analyze(profile, this.guard);
      } catch (err) {
        warnings.push(
          `Impact facet skipped: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (options.withDrift) {
      try {
        const agg = aggregateDrift({
          guard: this.guard,
          profile,
          requirements
        });
        const sec = collectSecuritySurfaceHints(this.guard.getVeloProveDirectory());
        warnings.push(...agg.warnings, ...sec.warnings);
        if (sec.items.length) {
          agg.items.push(...sec.items);
          if (!agg.sources.includes('security-wrap')) {
            agg.sources.push('security-wrap');
          }
        }
        driftFacet = toTwinDriftFacet(agg);
      } catch (err) {
        warnings.push(
          `Drift facet skipped: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else {
      // Still surface prior security artifact hints as warnings (items need --with-drift facet)
      const sec = collectSecuritySurfaceHints(this.guard.getVeloProveDirectory());
      warnings.push(...sec.warnings);
    }

    const gitHead = await this.tryReadGitHead();

    const twin = ProjectTwinService.assemble(this.guard.getRoot(), profile, requirements, featureMap, {
      impact,
      driftFacet,
      warnings,
      previousTwin: previous,
      reuseGraph,
      gitHead
    });
    const savedPath = this.storage.saveTwinLatest(twin);
    const result = ProjectTwinService.toOperationResult(twin);
    result.durationMs = Date.now() - started;
    result.evidence = [
      ...result.evidence,
      { id: 'twin-saved', kind: 'file', summary: 'Wrote Twin snapshot', path: savedPath }
    ];
    if (reuseGraph) {
      result.metadata = { ...result.metadata, incremental: true };
    }
    return result;
  }

  /** Aggregated drift over contract + feature-parity + env + docs hints. */
  public async drift(options: { feature?: string; changed?: boolean } = {}): Promise<AggregatedDriftReport> {
    const { profile, requirements } = await this.inspect();
    const agg = aggregateDrift({
      guard: this.guard,
      profile,
      requirements,
      featureFilter: options.feature
    });

    if (options.changed) {
      try {
        const impact = await AnalyzeChangesService.analyze(profile, this.guard);
        const changedSet = new Set(
          impact.changedFiles.map((f) => f.replace(/\\/g, '/').toLowerCase())
        );
        if (changedSet.size > 0) {
          agg.items = agg.items.filter(
            (i) => i.path && [...changedSet].some((c) => i.path!.toLowerCase().includes(c) || c.includes(i.path!.toLowerCase()))
          );
        }
      } catch {
        /* keep full set */
      }
    }

    const previous = this.storage.getTwinLatest();
    const fingerprint = InspectCache.fingerprint(this.guard.getRoot());
    if (previous && previous.fingerprint !== fingerprint) {
      agg.items = [
        {
          category: 'twin:fingerprint',
          summary: 'Twin fingerprint disagrees with workspace — prior Twin is STALE',
          severity: 'medium',
          evidenceClass: 'STALE'
        },
        ...agg.items
      ];
    }
    return agg;
  }

  private async tryReadGitHead(): Promise<string | undefined> {
    try {
      const runner = new SafeProcessRunner(this.guard);
      const res = await runner.run('git', ['rev-parse', 'HEAD'], {
        cwd: this.guard.getRoot(),
        timeoutMs: 5000
      });
      const head = (res.stdout || '').trim();
      return head || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Incremental Twin refresh: reuse graph when fingerprint unchanged; otherwise full assemble.
   * Prefer this for `twin update` — never invents edges without rebuild when fingerprint drifts.
   */
  public async twinUpdate(
    options: Omit<TwinBuildOptions, 'incremental'> & { incremental?: boolean } = {}
  ): Promise<OperationResult<TwinLatestDocument>> {
    return this.twinBuild({
      ...options,
      incremental: options.incremental !== false,
      force: options.force === true
    });
  }

  /** Evidence-class counts for an on-disk Twin (no rebuild). */
  public twinEvidenceSummary(): {
    twin: TwinLatestDocument | null;
    evidenceClasses: Record<string, number> | null;
    verificationStatus: 'PARTIAL' | 'MISSING';
  } {
    const twin = this.twinStatus();
    if (!twin) {
      return { twin: null, evidenceClasses: null, verificationStatus: 'MISSING' };
    }
    return {
      twin,
      evidenceClasses: ProjectTwinService.summarizeEvidenceClasses(twin),
      verificationStatus: 'PARTIAL'
    };
  }

  public twinStatus(): TwinLatestDocument | null {
    return this.storage.getTwinLatest();
  }

  public twinInspect(featureQuery: string): TwinInspectResult {
    const twin = this.storage.getTwinLatest();
    if (!twin) {
      return { found: false, edges: [] };
    }
    return ProjectTwinService.inspectFeature(twin, featureQuery);
  }

  /**
   * Enriched impact view: wraps `changed()` and optionally attaches Twin feature context.
   * Does not replace `veloprove changed`.
   */
  public async impactAnalysis(): Promise<{
    impact: ImpactAnalysisResult;
    twinAttached: boolean;
    relatedFeatures: Array<{ id: string; title: string }>;
  }> {
    const impact = await this.changed();
    const twin = this.storage.getTwinLatest();
    const relatedFeatures: Array<{ id: string; title: string }> = [];
    if (twin) {
      const changed = new Set(impact.changedFiles.map((c) => c.replace(/\\/g, '/')));
      for (const node of twin.nodes) {
        if (node.kind !== 'feature') continue;
        const paths = node.paths || [];
        if (paths.some((p) => changed.has(p.replace(/\\/g, '/')))) {
          relatedFeatures.push({ id: node.id, title: node.title });
        }
      }
    }
    return { impact, twinAttached: !!twin, relatedFeatures };
  }

  public getFlaky(): FlakyTestReport[] {
    return this.storage.getFlakyHistory();
  }

  public async releaseCheck(): Promise<ReleaseConfidenceReport> {
    const { requirements } = await this.inspect();
    const latestRun = this.storage.getLatestTestRun();
    const diagnoses = latestRun ? DiagnoseFailureService.diagnose(latestRun) : [];
    const flakyTests = this.getFlaky();

    return ReleaseCheckService.evaluate({
      requirements,
      latestRun,
      diagnoses,
      flakyTests
    });
  }

  /**
   * Autonomous change-aware QA orchestrator.
   * inspect → impact → targeted tests → diagnose → heal TEST_BUG → release gate.
   */
  public async verify(options: import('./verify-orchestrator.js').VerifyOptions = {}) {
    const { VerifyOrchestrator } = await import('./verify-orchestrator.js');
    return VerifyOrchestrator.execute(this, options);
  }
}
