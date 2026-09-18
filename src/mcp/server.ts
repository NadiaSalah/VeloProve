/**
 * VeloProve MCP server (stdio).
 *
 * Exposes the same VeloProveEngine as the CLI/Dashboard via 75 `vp.*` tools.
 * Argument parsing goes through `arg-utils` so agent JSON stays type-safe.
 * Resources use the `vp://…` scheme only (no legacy aliases).
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { VeloProveEngine } from '../application/engine.js';
import { asRecord, boolFlag, boolOpt, numOpt, objOpt, strArrayOpt, strOpt, unknownOpt } from './arg-utils.js';

export async function runMcpServer(projectRoot: string = process.cwd()): Promise<void> {
  // Mark process as AI/MCP context so sensitive gates auto-execute for the agent
  process.env.VELOPROVE_MCP = '1';
  process.env.VELOPROVE_AGENT = '1';

  const engine = new VeloProveEngine(projectRoot);

  const server = new Server(
    {
      name: 'veloprove',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  // List Available Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'vp.inspect',
          description: 'Inspect current project repository, detect frameworks, routes, API endpoints, test runners (Vitest/Jest/Playwright/node:test), and existing tests.',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Optional workspace path' }
            }
          }
        },
        {
          name: 'vp.bootstrap',
          description:
            'Teach AI how to use VeloProve: writes AGENTS.md + agent-manifest, returns pasteToAi briefing (CLI: veloprove teach-ai).',
          inputSchema: {
            type: 'object',
            properties: {
              agentName: { type: 'string' },
              preferredOutput: { type: 'string', enum: ['json', 'markdown', 'compact'] },
              force: { type: 'boolean', description: 'Rewrite AGENTS.md even if present' },
              writeMcp: { type: 'boolean', description: 'Create .cursor/mcp.json when missing' }
            }
          }
        },
        {
          name: 'vp.ask',
          description:
            'Ask a question answered only from packaged VeloProve documentation (local docs search; no cloud LLM). CLI: veloprove ask.',
          inputSchema: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'User question about VeloProve usage, MCP, CLI, or AI linking' }
            },
            required: ['question']
          }
        },
        {
          name: 'vp.learnFramework',
          description: 'Teach VeloProve an uncommon or in-house custom framework using AGENTS.md, instructions, or directory rules.',
          inputSchema: {
            type: 'object',
            properties: {
              instructions: { type: 'string', description: 'Framework explanation or routing conventions' },
              frameworkName: { type: 'string' },
              routesDir: { type: 'string' },
              devCommand: { type: 'string' }
            }
          }
        },
        {
          name: 'vp.explore',
          description: 'Walk and explore live routes, elements, buttons, and build site visual exploration map.',
          inputSchema: {
            type: 'object',
            properties: {
              baseURL: { type: 'string' }
            }
          }
        },
        {
          name: 'vp.fuzzApi',
          description: 'Generate security and boundary probes (auth bypass, SQLi/injection, empty payload) for APIs.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.mutationScore',
          description: 'Evaluate test suite mutation score and quality verdict by checking assertion sensitivity.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.refine',
          description: 'Refine or adjust test assertions and steps using natural language instructions.',
          inputSchema: {
            type: 'object',
            properties: {
              testFilePath: { type: 'string' },
              instruction: { type: 'string', description: 'Natural language adjustment' }
            },
            required: ['instruction']
          }
        },
        {
          name: 'vp.accessibility',
          description: 'Run automated WCAG 2.1 accessibility audit across project components and routes.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.visualDiff',
          description: 'Compare UI screenshot baselines and detect visual regression/drift.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.lint',
          description: 'Run ESLint and static code analysis across codebase with auto-fix and changed scope support.',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { type: 'string', enum: ['all', 'changed', 'paths'] },
              paths: { type: 'array', items: { type: 'string' } },
              fix: { type: 'boolean' }
            }
          }
        },
        {
          name: 'vp.contractDrift',
          description: 'Detect API contract drift between OpenAPI documentation and active source code routes.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.auditSec',
          description: 'Scan dependencies and project files for known CVE vulnerabilities and hardcoded secrets.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.perf',
          description: 'Audit Core Web Vitals (LCP, FID, CLS, TTFB, bundle weight) across detected routes.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.mockNetwork',
          description: 'Generate Mock Service Worker (MSW) network mock handlers from discovered API endpoints.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.quarantine',
          description: 'Isolate and quarantine high-variance flaky tests from breaking CI pipelines.',
          inputSchema: {
            type: 'object',
            properties: {
              threshold: { type: 'number', description: 'Flakiness variance threshold (0-1, default 0.25)' }
            }
          }
        },
        {
          name: 'vp.coverage',
          description: 'Generate PRD requirements coverage heatmap matrix with test pass rate correlation.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.plan',
          description: 'Generate a risk-aware, prioritized test plan from project PRD, requirements, routes, and APIs without generating code.',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { type: 'string', enum: ['all', 'uncovered', 'critical', 'e2e', 'api', 'unit', 'changed'] },
              maxTests: { type: 'number', description: 'Maximum test cases to plan' }
            }
          }
        },
        {
          name: 'vp.generate',
          description: 'Generate executable test files for Vitest, Jest, Playwright, or node:test (+ node:assert/strict) based on the active test plan. Live-grounds API assertions via GET when the local app is up.',
          inputSchema: {
            type: 'object',
            properties: {
              planId: { type: 'string' },
              testCaseIds: { type: 'array', items: { type: 'string' } },
              overwritePolicy: { type: 'string', enum: ['never', 'generated-only', 'explicit'] },
              liveGround: { type: 'boolean', description: 'Probe live local GET endpoints before writing API asserts (default true)' },
              baseURL: { type: 'string', description: 'Base URL for live grounding (default API_BASE_URL or http://localhost:3000)' }
            }
          }
        },
        {
          name: 'vp.run',
          description: 'Execute unit, integration, API, Playwright E2E, or node --test suites and collect structured execution evidence.',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { type: 'string', enum: ['all', 'changed', 'paths', 'plan', 'testIds', 'critical'] },
              paths: { type: 'array', items: { type: 'string' } },
              browser: { type: 'string', enum: ['chromium', 'firefox', 'webkit'] },
              timeoutMs: { type: 'number' }
            }
          }
        },
        {
          name: 'vp.run.get',
          description: 'Retrieve results and evidence for a specific test run.',
          inputSchema: {
            type: 'object',
            properties: {
              runId: { type: 'string', description: 'Run ID or "latest"' }
            }
          }
        },
        {
          name: 'vp.changed',
          description: 'Analyze Git changes and select only impacted unit, integration, API, and E2E tests.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.diagnose',
          description: 'Diagnose test run failures, classify root cause (APPLICATION_BUG vs TEST_BUG vs FLAKY_TEST), and suggest actions.',
          inputSchema: {
            type: 'object',
            properties: {
              runId: { type: 'string', description: 'Optional run ID to diagnose (defaults to latest)' }
            }
          }
        },
        {
          name: 'vp.heal',
          description: 'Safely repair stale selectors and fragile test locators in generated test files without modifying business logic.',
          inputSchema: {
            type: 'object',
            properties: {
              runId: { type: 'string' }
            }
          }
        },
        {
          name: 'vp.suggestFix',
          description: 'Generate specific code fix recommendation and diff for the coding agent to resolve an application bug.',
          inputSchema: {
            type: 'object',
            properties: {
              diagnosisId: { type: 'string' }
            }
          }
        },
        {
          name: 'vp.flaky',
          description: 'Inspect flaky test history and variance statistics across local test executions.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.releaseCheck',
          description: 'Evaluate release confidence score and readiness verdict (READY, READY_WITH_WARNINGS, NOT_READY).',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.runCollection',
          description: 'Execute a Postman Collection v2.1/v2.0 test suite locally with variable chaining.',
          inputSchema: {
            type: 'object',
            properties: {
              collectionPath: { type: 'string', description: 'Path to *.postman_collection.json file or raw JSON' },
              environmentPath: { type: 'string', description: 'Optional path to *.postman_environment.json' },
              baseURL: { type: 'string', description: 'Optional base URL override' }
            },
            required: ['collectionPath']
          }
        },
        {
          name: 'vp.exportCollection',
          description: 'Export all discovered project routes and API endpoints as a standard Postman Collection v2.1 JSON.',
          inputSchema: {
            type: 'object',
            properties: {
              outputPath: { type: 'string', description: 'Output file path (default: veloprove_postman_collection.json)' },
              collectionName: { type: 'string', description: 'Optional custom collection name' }
            }
          }
        },
        {
          name: 'vp.sendRequest',
          description: 'Send an ad-hoc HTTP request (GET, POST, PUT, DELETE, PATCH) and inspect response, latency, and headers.',
          inputSchema: {
            type: 'object',
            properties: {
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] },
              url: { type: 'string' },
              headers: { type: 'object' },
              params: { type: 'object' },
              body: { type: 'object' }
            },
            required: ['method', 'url']
          }
        },
        {
          name: 'vp.loadTest',
          description: 'Execute high-throughput local load & stress testing on endpoint with virtual users (VUs) and latency percentiles.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
              vus: { type: 'number', description: 'Concurrent Virtual Users (default: 10)' },
              durationSec: { type: 'number', description: 'Duration in seconds (default: 5)' },
              headers: { type: 'object' },
              body: { type: 'object' }
            },
            required: ['url']
          }
        },
        {
          name: 'vp.mockData',
          description: 'Generate realistic contextual mock test data (users, orders, products, addresses, payments, arabic locales).',
          inputSchema: {
            type: 'object',
            properties: {
              preset: { type: 'string', enum: ['user', 'order', 'product', 'address', 'payment', 'auth', 'arabic_user', 'custom'] },
              count: { type: 'number', description: 'Number of items to generate (default: 1)' },
              locale: { type: 'string', enum: ['en', 'ar'] },
              schema: { type: 'object', description: 'Optional custom field definitions' }
            }
          }
        },
        {
          name: 'vp.owaspScan',
          description: 'Run deep local OWASP Top 10 security audit (CORS, CSP, Clickjacking, MIME sniffing, Server leaks, Stack traces).',
          inputSchema: {
            type: 'object',
            properties: {
              targetUrl: { type: 'string', description: 'Target HTTP/HTTPS endpoint' }
            },
            required: ['targetUrl']
          }
        },
        {
          name: 'vp.graphqlTest',
          description: 'Execute and validate GraphQL queries/mutations with variables and schema assertion.',
          inputSchema: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              query: { type: 'string' },
              variables: { type: 'object' },
              expectedDataKey: { type: 'string' }
            },
            required: ['endpoint', 'query']
          }
        },
        {
          name: 'vp.wsTest',
          description: 'Test WebSocket connection handshake and real-time message interchange.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              messagesToSend: { type: 'array', items: { type: 'string' } },
              expectedResponseSubstring: { type: 'string' }
            },
            required: ['url']
          }
        },
        {
          name: 'vp.remoteInit',
          description: 'Generate a drop-in companion probe script/middleware to place on a live website for remote QA connection.',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['standalone_js', 'nextjs_route', 'express_middleware', 'html_snippet'], description: 'Format of companion probe' },
              siteName: { type: 'string', description: 'Name of remote website' },
              secretToken: { type: 'string', description: 'Optional custom bridge secret token' }
            }
          }
        },
        {
          name: 'vp.remoteConnect',
          description: 'Connect and verify handshake link with a live remote website running the VeloProve companion probe.',
          inputSchema: {
            type: 'object',
            properties: {
              remoteUrl: { type: 'string', description: 'URL of live remote website (e.g. https://my-app.com)' },
              bridgeSecret: { type: 'string', description: 'Secret authentication token' }
            },
            required: ['remoteUrl']
          }
        },
        {
          name: 'vp.remoteAudit',
          description: 'Execute full live remote QA, OWASP security, load benchmark, and route health audit against a live website.',
          inputSchema: {
            type: 'object',
            properties: {
              remoteUrl: { type: 'string', description: 'Target live website URL' },
              includeLoadTest: { type: 'boolean', description: 'Include load & stress test (default: false)' },
              loadVus: { type: 'number', description: 'Concurrent Virtual Users if load test enabled (default: 8)' },
              bridgeSecret: { type: 'string', description: 'Optional bridge secret token' }
            },
            required: ['remoteUrl']
          }
        },
        {
          name: 'vp.recordScenario',
          description: 'Generate robust Playwright or Vitest E2E test files from structured user actions (click, fill, assert).',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Scenario test title' },
              startUrl: { type: 'string', description: 'Starting page URL' },
              framework: { type: 'string', enum: ['playwright', 'vitest'] },
              steps: { type: 'array', items: { type: 'object' }, description: 'Recorded user steps' },
              outputFile: { type: 'string', description: 'Optional path to save generated test file' }
            },
            required: ['title', 'steps']
          }
        },
        {
          name: 'vp.stabilizeFlaky',
          description: 'Scan and automatically refactor brittle, flaky test code (replacing sleep with auto-wait and web-first assertions).',
          inputSchema: {
            type: 'object',
            properties: {
              targetFileOrCode: { type: 'string', description: 'File path or raw test code' },
              saveFix: { type: 'boolean', description: 'Save stabilized code directly to file (default: false)' }
            },
            required: ['targetFileOrCode']
          }
        },
        {
          name: 'vp.dbSnapshot',
          description: 'Create an isolated backup snapshot of database and fixture files prior to running destructive tests.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Snapshot identifier name' },
              filePaths: { type: 'array', items: { type: 'string' }, description: 'List of database / fixture files to backup' }
            },
            required: ['name', 'filePaths']
          }
        },
        {
          name: 'vp.dbRestore',
          description: 'Restore database and fixture state from a previous snapshot.',
          inputSchema: {
            type: 'object',
            properties: {
              snapshotId: { type: 'string', description: 'ID of snapshot to restore' }
            },
            required: ['snapshotId']
          }
        },
        {
          name: 'vp.autoBugFix',
          description: 'Synthesize code repair patches for APPLICATION_BUG failures and generate unified Git diff.',
          inputSchema: {
            type: 'object',
            properties: {
              apply: { type: 'boolean', description: 'Directly apply synthesized repairs to source files (default: false)' }
            }
          }
        },
        {
          name: 'vp.exportReport',
          description: 'Export executive QA report (HTML, JSON, Markdown, JUnit XML, or PDF summary). Use preview=true to inspect content and save path without writing.',
          inputSchema: {
            type: 'object',
            properties: {
              outputPath: { type: 'string', description: 'Output destination path' },
              format: { type: 'string', enum: ['html', 'json', 'markdown', 'junit', 'pdf', 'allure'] },
              title: { type: 'string', description: 'Custom report title' },
              preview: { type: 'boolean', description: 'When true, return preview + save path without writing files' }
            }
          }
        },
        {
          name: 'vp.chaosTest',
          description: 'Run autonomous chaos & edge-case monkey testing (malformed payloads, prototype pollution, type confusion).',
          inputSchema: {
            type: 'object',
            properties: {
              targetUrl: { type: 'string', description: 'Target API/HTTP endpoint' },
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
              strategies: { type: 'array', items: { type: 'string' } },
              iterations: { type: 'number' }
            },
            required: ['targetUrl']
          }
        },
        {
          name: 'vp.dockerEnv',
          description: 'Generate isolated containerized test dependencies (PostgreSQL, Redis, MongoDB, MySQL) and docker-compose.test.yml.',
          inputSchema: {
            type: 'object',
            properties: {
              services: { type: 'array', items: { type: 'string', enum: ['postgres', 'redis', 'mongodb', 'mysql'] } },
              outputPath: { type: 'string' },
              projectName: { type: 'string' }
            }
          }
        },
        {
          name: 'vp.browserMatrix',
          description: 'Generate multi-browser & mobile viewport Playwright matrix configuration (Chromium, Firefox, WebKit, Mobile devices).',
          inputSchema: {
            type: 'object',
            properties: {
              browsers: { type: 'array', items: { type: 'string' } },
              devices: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        {
          name: 'vp.bddFeatures',
          description: 'Generate standard BDD / Gherkin .feature specs and step definitions from discovered PRD requirements.',
          inputSchema: {
            type: 'object',
            properties: {
              outputDir: { type: 'string', description: 'Output directory for .feature files (default: features)' }
            }
          }
        },
        {
          name: 'vp.sendAlert',
          description: 'Dispatch formatted QA quality, security, and test run alert notifications to Slack, Discord, MS Teams, or Webhooks.',
          inputSchema: {
            type: 'object',
            properties: {
              webhookUrl: { type: 'string', description: 'Webhook URL (Slack, Discord, Teams)' },
              provider: { type: 'string', enum: ['slack', 'discord', 'teams', 'generic'] },
              payload: { type: 'object', description: 'Alert summary payload' }
            },
            required: ['webhookUrl', 'payload']
          }
        },
        {
          name: 'vp.featureParity',
          description: 'Universal UI-to-Backend parity auditor: detects ghost features, no-op click handlers, unhandled Tauri/API commands, and missing enum options.',
          inputSchema: {
            type: 'object',
            properties: {
              generateE2ESuite: { type: 'boolean', description: 'Generate Playwright E2E test suite verifying each UI option' }
            }
          }
        },
        {
          name: 'vp.scanMalware',
          description: 'Scan repository files for malicious code, obfuscated payloads, suspicious lifecycle scripts, reverse shells, and exposed API keys.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.remediateMalware',
          description: 'One-click auto-remediation to clean, sanitize, and neutralize detected malware threats and suspicious scripts.',
          inputSchema: {
            type: 'object',
            properties: {
              threatIds: { type: 'array', items: { type: 'string' }, description: 'Optional list of threat IDs to remediate (default: all)' }
            }
          }
        },
        {
          name: 'vp.aiEvaluate',
          description: 'Evaluate AI / LLM output accuracy, detect hallucinations against ground truth facts, and validate JSON schema compliance.',
          inputSchema: {
            type: 'object',
            properties: {
              endpointUrl: { type: 'string' },
              testCases: { type: 'array', items: { type: 'object' } }
            },
            required: ['testCases']
          }
        },
        {
          name: 'vp.gitBisect',
          description: 'Autonomous Git bisect regression hunter: pinpoint the exact commit that introduced a test failure or bug.',
          inputSchema: {
            type: 'object',
            properties: {
              testCommand: { type: 'string' },
              maxCommits: { type: 'number' }
            }
          }
        },
        {
          name: 'vp.networkThrottle',
          description: 'Simulate mobile network conditions (3G, GPRS, 4G, packet loss, offline drops) to verify frontend/API resilience.',
          inputSchema: {
            type: 'object',
            properties: {
              targetUrl: { type: 'string' },
              profile: { type: 'string', enum: ['GPRS_SLOW', 'REGULAR_3G', 'GOOD_4G', 'OFFLINE_DROP', 'PACKET_LOSS'] }
            },
            required: ['targetUrl', 'profile']
          }
        },
        {
          name: 'vp.smartContractAudit',
          description: 'Deep security audit for Solidity / Web3 smart contracts (reentrancy, unprotected selfdestruct, tx.origin, timestamp manipulation).',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.deadAssetPurge',
          description: 'Scan and purge unreferenced images, fonts, dead CSS, and unused asset files to reclaim disk space.',
          inputSchema: {
            type: 'object',
            properties: {
              purge: { type: 'boolean', description: 'Automatically delete identified dead assets' }
            }
          }
        },
        {
          name: 'vp.screenReaderSim',
          description: 'Simulate screen reader (NVDA/VoiceOver) auditory speech order, detect unlabelled buttons/inputs, redundant image text, and heading hierarchy skips.',
          inputSchema: {
            type: 'object',
            properties: {
              targetPaths: { type: 'array', items: { type: 'string' } },
              rawHtml: { type: 'string' }
            }
          }
        },
        {
          name: 'vp.dbQueryAudit',
          description: 'Deep audit for SQL N+1 queries in loops, unindexed queries, raw string concatenations (SQLi), and unbounded collection fetches.',
          inputSchema: {
            type: 'object',
            properties: {
              targetDir: { type: 'string' },
              scanAllExtensions: { type: 'boolean' }
            }
          }
        },
        {
          name: 'vp.envDriftAudit',
          description: 'Multi-environment config & secret drift auditor: compare .env against .env.example, detect missing keys in code, and catch leaked secrets.',
          inputSchema: {
            type: 'object',
            properties: {
              generateExample: { type: 'boolean' }
            }
          }
        },
        {
          name: 'vp.recordFailureReplay',
          description: 'Generate interactive step-by-step visual timeline replay package (.html / SVG) for failed tests.',
          inputSchema: {
            type: 'object',
            properties: {
              testTitle: { type: 'string' },
              testFile: { type: 'string' },
              errorMessage: { type: 'string' },
              steps: { type: 'array', items: { type: 'object' } },
              saveToFile: { type: 'boolean' }
            },
            required: ['testTitle', 'testFile', 'errorMessage']
          }
        },
        {
          name: 'vp.rateLimitAudit',
          description: 'API rate-limiting & DoS threshold profiler: burst-test endpoints to verify 429 status enforcement and server resilience.',
          inputSchema: {
            type: 'object',
            properties: {
              targetUrl: { type: 'string' },
              requestCount: { type: 'number' },
              concurrency: { type: 'number' },
              method: { type: 'string' }
            },
            required: ['targetUrl']
          }
        },
        {
          name: 'vp.statefulMock',
          description: 'Start, stop, or reset local zero-cloud in-memory stateful RESTful CRUD mock server.',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['start', 'stop', 'reset'] },
              port: { type: 'number' },
              initialData: { type: 'object' }
            },
            required: ['action']
          }
        },
        {
          name: 'vp.architectureGraph',
          description: 'Generate microservices & architecture dependency graph (UI, APIs, DBs, Caches, External Services) with Mermaid and topology view.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.securityScan',
          description: 'Discover and inspect security attack surfaces (auth routes, protected routes, forms, file uploads, JWT, cookies, and database technologies).',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.securityPlan',
          description: 'Generate prioritized, risk-scored security test plan for authentication, authorization, injection, forms, session theft/hijacking, and uploads.',
          inputSchema: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: { type: 'string', enum: ['authentication', 'authorization', 'forms_inputs', 'injection', 'api_security', 'sessions_tokens', 'file_uploads'] },
                description: 'Optional categories to target'
              },
              safeMode: { type: 'boolean', description: 'Enable safe non-destructive mode (default: true)' }
            }
          }
        },
        {
          name: 'vp.securityRun',
          description: 'Execute automated non-destructive security tests (including session theft: cookie flags, fixation, URL leaks, client storage, logout invalidation) against a live target or codebase.',
          inputSchema: {
            type: 'object',
            properties: {
              baseURL: { type: 'string', description: 'Target application URL' },
              categories: {
                type: 'array',
                items: { type: 'string', enum: ['authentication', 'authorization', 'forms_inputs', 'injection', 'api_security', 'sessions_tokens', 'file_uploads'] }
              },
              safeMode: { type: 'boolean', description: 'Enforce safe mode restrictions (default: true)' },
              deepMode: { type: 'boolean', description: 'Run deeper security checks (requires explicit opt-in)' },
              environment: { type: 'string', enum: ['test', 'staging', 'production', 'local'] },
              allowProduction: { type: 'boolean', description: 'Allow execution against production (default: false)' }
            }
          }
        },
        {
          name: 'vp.securityReport',
          description: 'Generate comprehensive security report with explainable score (0-100), findings, evidence, redacted logs, and remediation roadmap.',
          inputSchema: {
            type: 'object',
            properties: {
              baseURL: { type: 'string' },
              safeMode: { type: 'boolean' },
              format: { type: 'string', enum: ['json', 'markdown', 'console'] }
            }
          }
        },
        {
          name: 'vp.exportSarif',
          description: 'Export security findings and CVE vulnerabilities in standard SARIF v2.1.0 JSON format for GitHub Security integration.',
          inputSchema: {
            type: 'object',
            properties: {
              outputPath: { type: 'string', description: 'Optional relative path for SARIF output' }
            }
          }
        },
        {
          name: 'vp.auditSriCsrf',
          description: 'Audit Subresource Integrity (SRI) on external CDN assets, CSRF token protections on mutating forms, and CORS policy wildcards.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.dedupTests',
          description: 'Analyze test suites to identify duplicate, redundant, and overlapping test cases across Vitest/Playwright suites.',
          inputSchema: {
            type: 'object',
            properties: {
              testFiles: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        {
          name: 'vp.doctor',
          description: 'Run environmental, runtime, and project installation diagnostics to verify readiness (incl. Vitest/Jest/Playwright/node:test).',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vp.ensureDev',
          description: 'Smart DevServer auto-launcher: probe baseURL, detect package scripts, and start npm/pnpm/yarn/bun dev when offline.',
          inputSchema: {
            type: 'object',
            properties: {
              baseURL: { type: 'string', description: 'Target URL to bring online' },
              command: { type: 'string', description: 'Override spawn command (e.g. npm run dev)' },
              port: { type: 'number' },
              timeoutMs: { type: 'number' },
              forceRestart: { type: 'boolean' }
            }
          }
        },
        {
          name: 'vp.verify',
          description: 'Autonomous change-aware QA orchestrator: inspect → impact → targeted tests → diagnose → heal TEST_BUG → release assessment. Returns OperationResult with evidence. On failures writes .veloprove/evidence/<runId>/.',
          inputSchema: {
            type: 'object',
            properties: {
              fullSuite: { type: 'boolean', description: 'Run full suite instead of impacted tests' },
              includeSecurity: { type: 'boolean', description: 'Force non-destructive security suite' },
              includeA11y: { type: 'boolean', description: 'Force accessibility audit' },
              noHeal: { type: 'boolean', description: 'Disable automatic TEST_BUG healing' },
              intent: { type: 'string', description: 'Natural-language QA goal (deterministic keyword planner)' },
              sandbox: { type: 'boolean', description: 'Start local mock sandbox and set API_BASE_URL for this run' },
              dockerEnv: { type: 'boolean', description: 'Generate local docker-compose test env files before verify' }
            }
          }
        },
        {
          name: 'vp.history',
          description: 'Load local test-run history trends (pass rate, duration, flaky aggregates) from .veloprove state.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max history points to return (1-50)' }
            }
          }
        }
      ]
    };
  });

  // Handle Tool Executions
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'vp.inspect': {
          const result = await engine.inspect();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.bootstrap': {
          const preferredOutput = strOpt(args, 'preferredOutput');
          const result = engine.handshake({
            agentName: strOpt(args, 'agentName'),
            preferredOutput: preferredOutput as 'json' | 'markdown' | 'compact' | undefined,
            forceAgentsMd: boolOpt(args, 'force'),
            writeMcpConfig: boolOpt(args, 'writeMcp')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.ask': {
          const question = strOpt(args, 'question') || '';
          const result = engine.askDocs(question);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.learnFramework': {
          const result = engine.learnFramework(asRecord(args) as Parameters<VeloProveEngine['learnFramework']>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.explore': {
          const result = await engine.explore({
            baseURL: strOpt(args, 'baseURL'),
            ensureDev: boolOpt(args, 'ensureDev')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.fuzzApi': {
          const result = await engine.fuzzApi();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.mutationScore': {
          const result = await engine.evaluateMutationScore();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.refine': {
          const result = await engine.refineTest({
            testFilePath: strOpt(args, 'testFilePath'),
            testId: strOpt(args, 'testId'),
            instruction: strOpt(args, 'instruction') || ''
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.accessibility': {
          const result = await engine.auditA11y();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.visualDiff': {
          const result = await engine.compareVisuals();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.contractDrift': {
          const result = await engine.checkContractDrift();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.auditSec': {
          const result = engine.auditSecurity();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.perf': {
          const result = await engine.profilePerf();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.mockNetwork': {
          const result = await engine.generateMsw();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.quarantine': {
          const result = engine.quarantineFlaky(numOpt(args, 'threshold'));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.coverage': {
          const result = await engine.getCoverageHeatmap();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.lint': {
          const scope = strOpt(args, 'scope');
          const result = await engine.lint({
            scope: scope as 'all' | 'changed' | 'paths' | undefined,
            paths: strArrayOpt(args, 'paths'),
            fix: boolOpt(args, 'fix')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.plan': {
          const scope = strOpt(args, 'scope');
          const plan = await engine.plan({
            scope: scope as 'all' | 'uncovered' | 'critical' | 'e2e' | 'api' | 'unit' | 'changed' | undefined,
            maxTests: numOpt(args, 'maxTests')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }]
          };
        }

        case 'vp.generate': {
          const overwritePolicy = strOpt(args, 'overwritePolicy');
          const liveGroundOpt = boolOpt(args, 'liveGround');
          const result = await engine.generate({
            planId: strOpt(args, 'planId'),
            testCaseIds: strArrayOpt(args, 'testCaseIds'),
            overwritePolicy: overwritePolicy as 'never' | 'generated-only' | 'explicit' | undefined,
            liveGround: liveGroundOpt === undefined ? true : liveGroundOpt,
            baseURL: strOpt(args, 'baseURL')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.run': {
          const scope = strOpt(args, 'scope');
          const runResult = await engine.run({
            scope: scope as 'all' | 'changed' | 'paths' | 'plan' | 'testIds' | 'critical' | undefined,
            paths: strArrayOpt(args, 'paths'),
            timeoutMs: numOpt(args, 'timeoutMs')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(runResult, null, 2) }]
          };
        }

        case 'vp.run.get': {
          const runId = strOpt(args, 'runId') || 'latest';
          const runResult = runId === 'latest'
            ? engine.storage.getLatestTestRun()
            : engine.storage.getTestRun(runId);
          return {
            content: [{ type: 'text', text: JSON.stringify(runResult || { error: 'Not found' }, null, 2) }]
          };
        }

        case 'vp.changed': {
          const impact = await engine.changed();
          return {
            content: [{ type: 'text', text: JSON.stringify(impact, null, 2) }]
          };
        }

        case 'vp.diagnose': {
          const diagnoses = await engine.diagnose(strOpt(args, 'runId'));
          return {
            content: [{ type: 'text', text: JSON.stringify(diagnoses, null, 2) }]
          };
        }

        case 'vp.heal': {
          const healResults = await engine.heal(strOpt(args, 'runId'));
          return {
            content: [{ type: 'text', text: JSON.stringify(healResults, null, 2) }]
          };
        }

        case 'vp.suggestFix': {
          const diagnoses = await engine.diagnose();
          const diagnosisId = strOpt(args, 'diagnosisId');
          const target = diagnoses.find(d => d.diagnosisId === diagnosisId) || diagnoses[0];
          if (!target) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'No diagnosis available' }) }] };
          }
          const suggestion = engine.suggestFix(target);
          return {
            content: [{ type: 'text', text: JSON.stringify(suggestion, null, 2) }]
          };
        }

        case 'vp.flaky': {
          const flaky = engine.getFlaky();
          return {
            content: [{ type: 'text', text: JSON.stringify(flaky, null, 2) }]
          };
        }

        case 'vp.releaseCheck': {
          const release = await engine.releaseCheck();
          return {
            content: [{ type: 'text', text: JSON.stringify(release, null, 2) }]
          };
        }

        case 'vp.runCollection': {
          const collectionPath = strOpt(args, 'collectionPath') || '';
          const environmentPath = strOpt(args, 'environmentPath');
          const baseURL = strOpt(args, 'baseURL');
          const result = await engine.runPostmanCollection(collectionPath, environmentPath, baseURL);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.exportCollection': {
          const outputPath = strOpt(args, 'outputPath');
          const collectionName = strOpt(args, 'collectionName');
          const result = await engine.exportPostmanCollection(
            outputPath || 'veloprove_postman_collection.json',
            collectionName
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.sendRequest': {
          const method = strOpt(args, 'method') || 'GET';
          const result = await engine.sendHttpRequest({
            method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
            url: strOpt(args, 'url') || '',
            headers: objOpt(args, 'headers') as Record<string, string> | undefined,
            params: objOpt(args, 'params') as Record<string, string> | undefined,
            body: unknownOpt(args, 'body'),
            timeoutMs: numOpt(args, 'timeoutMs')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.loadTest': {
          const method = strOpt(args, 'method');
          const result = await engine.runLoadTest({
            url: strOpt(args, 'url') || '',
            method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined,
            vus: numOpt(args, 'vus'),
            durationSec: numOpt(args, 'durationSec'),
            headers: objOpt(args, 'headers') as Record<string, string> | undefined,
            body: unknownOpt(args, 'body')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.mockData': {
          const preset = strOpt(args, 'preset');
          const locale = strOpt(args, 'locale');
          const result = engine.generateMockData({
            preset: preset as 'user' | 'order' | 'product' | 'address' | 'payment' | 'auth' | 'arabic_user' | 'custom' | undefined,
            count: numOpt(args, 'count'),
            locale: locale as 'en' | 'ar' | undefined,
            schema: objOpt(args, 'schema') as NonNullable<Parameters<VeloProveEngine['generateMockData']>[0]>['schema']
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.owaspScan': {
          const result = await engine.scanOwasp(strOpt(args, 'targetUrl') || '');
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.graphqlTest': {
          const result = await engine.runGraphQL({
            endpoint: strOpt(args, 'endpoint') || '',
            query: strOpt(args, 'query') || '',
            variables: objOpt(args, 'variables'),
            expectedDataKey: strOpt(args, 'expectedDataKey')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.wsTest': {
          const result = await engine.testWebSocket({
            url: strOpt(args, 'url') || '',
            messagesToSend: strArrayOpt(args, 'messagesToSend'),
            expectedResponseSubstring: strOpt(args, 'expectedResponseSubstring')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.remoteInit': {
          const type = strOpt(args, 'type') || 'standalone_js';
          const result = engine.generateRemoteProbe(
            type as 'standalone_js' | 'nextjs_route' | 'express_middleware' | 'html_snippet',
            {
              siteName: strOpt(args, 'siteName'),
              secretToken: strOpt(args, 'secretToken')
            }
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.remoteConnect': {
          const result = await engine.connectRemoteSite(
            strOpt(args, 'remoteUrl') || '',
            strOpt(args, 'bridgeSecret')
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.remoteAudit': {
          const result = await engine.auditRemoteSite(
            strOpt(args, 'remoteUrl') || '',
            {
              includeLoadTest: boolOpt(args, 'includeLoadTest'),
              loadVus: numOpt(args, 'loadVus'),
              bridgeSecret: strOpt(args, 'bridgeSecret')
            }
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.recordScenario': {
          const framework = strOpt(args, 'framework');
          const result = engine.recordScenario({
            title: strOpt(args, 'title') || '',
            startUrl: strOpt(args, 'startUrl') || '',
            framework: framework as 'playwright' | 'vitest' | undefined,
            steps: (unknownOpt(args, 'steps') as NonNullable<Parameters<VeloProveEngine['recordScenario']>[0]>['steps']) || [],
            outputFile: strOpt(args, 'outputFile')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.stabilizeFlaky': {
          const result = engine.stabilizeTests(
            strOpt(args, 'targetFileOrCode') || '',
            boolFlag(args, 'saveFix')
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.dbSnapshot': {
          const result = engine.createDbSnapshot(
            strOpt(args, 'name') || '',
            strArrayOpt(args, 'filePaths') || []
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.dbRestore': {
          const result = engine.restoreDbSnapshot(strOpt(args, 'snapshotId') || '');
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.autoBugFix': {
          const result = await engine.autoFixBugs(boolFlag(args, 'apply'));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.exportReport': {
          const result = engine.exportReport({
            outputPath: strOpt(args, 'outputPath'),
            format: strOpt(args, 'format') as 'html' | 'json' | 'markdown' | 'junit' | 'pdf' | 'allure' | undefined,
            title: strOpt(args, 'title'),
            preview: boolFlag(args, 'preview')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.chaosTest': {
          const method = strOpt(args, 'method');
          const result = await engine.runChaosTest({
            targetUrl: strOpt(args, 'targetUrl') || '',
            method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined,
            strategies: strArrayOpt(args, 'strategies') as NonNullable<Parameters<VeloProveEngine['runChaosTest']>[0]>['strategies'],
            iterations: numOpt(args, 'iterations')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.dockerEnv': {
          const result = engine.generateDockerEnv({
            services: (strArrayOpt(args, 'services') as NonNullable<Parameters<VeloProveEngine['generateDockerEnv']>[0]>['services']) || [],
            outputPath: strOpt(args, 'outputPath'),
            projectName: strOpt(args, 'projectName')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.browserMatrix': {
          const result = engine.generateBrowserMatrix({
            browsers: strArrayOpt(args, 'browsers') as NonNullable<Parameters<VeloProveEngine['generateBrowserMatrix']>[0]>['browsers'],
            devices: strArrayOpt(args, 'devices') as NonNullable<Parameters<VeloProveEngine['generateBrowserMatrix']>[0]>['devices']
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.bddFeatures': {
          const result = await engine.generateBddFeatures(strOpt(args, 'outputDir'));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.sendAlert': {
          const provider = strOpt(args, 'provider');
          const result = await engine.sendAlert({
            webhookUrl: strOpt(args, 'webhookUrl') || '',
            provider: provider as 'slack' | 'discord' | 'teams' | 'generic' | undefined,
            payload: (objOpt(args, 'payload') || {}) as unknown as NonNullable<Parameters<VeloProveEngine['sendAlert']>[0]>['payload']
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.featureParity': {
          const result = engine.auditFeatureParity({
            generateE2ESuite: boolOpt(args, 'generateE2ESuite')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.scanMalware': {
          const result = engine.scanMalware();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.remediateMalware': {
          const result = engine.remediateMalware(strArrayOpt(args, 'threatIds'));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.aiEvaluate': {
          const result = await engine.evaluateAiOutputs({
            endpointUrl: strOpt(args, 'endpointUrl'),
            testCases: (unknownOpt(args, 'testCases') as NonNullable<Parameters<VeloProveEngine['evaluateAiOutputs']>[0]>['testCases']) || []
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.gitBisect': {
          const result = await engine.huntRegression({
            testCommand: strOpt(args, 'testCommand'),
            goodCommit: strOpt(args, 'goodCommit'),
            badCommit: strOpt(args, 'badCommit'),
            maxCommits: numOpt(args, 'maxCommits')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.networkThrottle': {
          const profile = strOpt(args, 'profile') || 'REGULAR_3G';
          const result = await engine.throttleRequest({
            targetUrl: strOpt(args, 'targetUrl') || '',
            profile: profile as 'GPRS_SLOW' | 'REGULAR_3G' | 'GOOD_4G' | 'OFFLINE_DROP' | 'PACKET_LOSS'
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.smartContractAudit': {
          const result = engine.auditSmartContracts();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.deadAssetPurge': {
          const result = boolFlag(args, 'purge') ? engine.purgeDeadAssets() : engine.scanDeadAssets();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.screenReaderSim': {
          const result = engine.simulateScreenReader({
            targetPaths: strArrayOpt(args, 'targetPaths'),
            rawHtml: strOpt(args, 'rawHtml')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.dbQueryAudit': {
          const result = engine.auditDbQueries({
            targetDir: strOpt(args, 'targetDir'),
            scanAllExtensions: boolOpt(args, 'scanAllExtensions')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.envDriftAudit': {
          const result = engine.auditEnvDrift({
            generateExample: boolOpt(args, 'generateExample')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.recordFailureReplay': {
          const result = engine.recordFailureReplay({
            testTitle: strOpt(args, 'testTitle') || '',
            testFile: strOpt(args, 'testFile') || '',
            errorMessage: strOpt(args, 'errorMessage') || '',
            steps: unknownOpt(args, 'steps') as NonNullable<Parameters<VeloProveEngine['recordFailureReplay']>[0]>['steps'],
            saveToFile: boolOpt(args, 'saveToFile')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.rateLimitAudit': {
          const result = await engine.auditRateLimit({
            targetUrl: strOpt(args, 'targetUrl') || '',
            requestCount: numOpt(args, 'requestCount'),
            concurrency: numOpt(args, 'concurrency'),
            method: strOpt(args, 'method')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.statefulMock': {
          const action = strOpt(args, 'action');
          let result: unknown;
          if (action === 'start') {
            result = await engine.startStatefulMock({
              port: numOpt(args, 'port'),
              initialData: unknownOpt(args, 'initialData') as NonNullable<Parameters<VeloProveEngine['startStatefulMock']>[0]>['initialData']
            });
          } else if (action === 'stop') {
            result = engine.stopStatefulMock();
          } else {
            result = engine.resetStatefulMock();
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.architectureGraph': {
          const result = engine.generateArchitectureGraph();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.securityScan': {
          const result = await engine.scanSecuritySurface();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.securityPlan': {
          const result = await engine.planSecurityTests({
            categories: strArrayOpt(args, 'categories') as NonNullable<Parameters<VeloProveEngine['planSecurityTests']>[0]>['categories'],
            safeMode: boolOpt(args, 'safeMode')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.securityRun': {
          const environment = strOpt(args, 'environment');
          const format = strOpt(args, 'format');
          const result = await engine.runSecurityTests({
            baseURL: strOpt(args, 'baseURL'),
            categories: strArrayOpt(args, 'categories') as NonNullable<Parameters<VeloProveEngine['runSecurityTests']>[0]>['categories'],
            safeMode: boolOpt(args, 'safeMode'),
            deepMode: boolOpt(args, 'deepMode'),
            environment: environment as 'test' | 'staging' | 'production' | 'local' | undefined,
            allowProduction: boolOpt(args, 'allowProduction'),
            allowUnknownRemote: boolOpt(args, 'allowUnknownRemote'),
            maxSafeAttempts: numOpt(args, 'maxSafeAttempts'),
            format: format as 'console' | 'json' | 'markdown' | 'html' | undefined,
            outputFile: strOpt(args, 'outputFile'),
            ensureDev: boolOpt(args, 'ensureDev')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.securityReport': {
          const environment = strOpt(args, 'environment');
          const format = strOpt(args, 'format');
          const result = await engine.generateSecurityReport({
            baseURL: strOpt(args, 'baseURL'),
            categories: strArrayOpt(args, 'categories') as NonNullable<Parameters<VeloProveEngine['generateSecurityReport']>[0]>['categories'],
            safeMode: boolOpt(args, 'safeMode'),
            deepMode: boolOpt(args, 'deepMode'),
            environment: environment as 'test' | 'staging' | 'production' | 'local' | undefined,
            allowProduction: boolOpt(args, 'allowProduction'),
            allowUnknownRemote: boolOpt(args, 'allowUnknownRemote'),
            maxSafeAttempts: numOpt(args, 'maxSafeAttempts'),
            format: format as 'console' | 'json' | 'markdown' | 'html' | undefined,
            outputFile: strOpt(args, 'outputFile'),
            ensureDev: boolOpt(args, 'ensureDev')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.exportSarif': {
          const outputPath = strOpt(args, 'outputPath');
          const report = await engine.runSecurityTests({ safeMode: true });
          const audit = engine.auditSecurity();
          const result = engine.exportSarif(report, audit, outputPath);
          return {
            content: [{ type: 'text', text: JSON.stringify({ sarifPath: result.sarifPath, rulesCount: result.log.runs[0].tool.driver.rules.length, resultsCount: result.log.runs[0].results.length }, null, 2) }]
          };
        }

        case 'vp.auditSriCsrf': {
          const result = engine.auditSriAndCsrf();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.dedupTests': {
          const result = engine.deduplicateTests(strArrayOpt(args, 'testFiles'));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.doctor': {
          const result = engine.doctor();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.ensureDev': {
          const result = await engine.ensureDevServer({
            baseURL: strOpt(args, 'baseURL'),
            command: strOpt(args, 'command'),
            port: numOpt(args, 'port'),
            timeoutMs: numOpt(args, 'timeoutMs'),
            forceRestart: boolFlag(args, 'forceRestart')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.verify': {
          const result = await engine.verify({
            fullSuite: boolFlag(args, 'fullSuite'),
            includeSecurity: boolFlag(args, 'includeSecurity'),
            includeA11y: boolFlag(args, 'includeA11y'),
            noHeal: boolFlag(args, 'noHeal'),
            intent: strOpt(args, 'intent'),
            sandbox: boolFlag(args, 'sandbox'),
            dockerEnv: boolFlag(args, 'dockerEnv')
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'vp.history': {
          const snapshot = engine.getRunHistory();
          const limitRaw = numOpt(args, 'limit');
          const limit = Math.max(1, Math.min(limitRaw ?? 20, 50));
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ ...snapshot, points: snapshot.points.slice(-limit) }, null, 2)
            }]
          };
        }

        default:
          throw new Error(`Unknown VeloProve tool: ${name}`);
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `VeloProve Error: ${err.message}` }]
      };
    }
  });

  // Resources — vp:// only (VeloProve product namespace; no legacy aliases)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const catalog = [
      { path: 'project/profile', name: 'Project Profile' },
      { path: 'requirements', name: 'Discovered Requirements' },
      { path: 'test-plan/latest', name: 'Latest Test Plan' },
      { path: 'runs/latest', name: 'Latest Test Run Results' },
      { path: 'release/confidence', name: 'Release Confidence' }
    ];
    return {
      resources: catalog.map((r) => ({
        uri: `vp://${r.path}`,
        name: r.name,
        mimeType: 'application/json'
      }))
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (!uri.startsWith('vp://')) {
      throw new Error(
        `Unsupported resource URI "${uri}". VeloProve resources use the vp:// scheme only (example: vp://project/profile).`
      );
    }
    const key = uri.slice('vp://'.length);

    if (key === 'project/profile') {
      const profile = engine.storage.getProjectProfile() || (await engine.inspect()).profile;
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(profile, null, 2) }] };
    }
    if (key === 'requirements') {
      const reqs = engine.storage.getRequirements() || (await engine.inspect()).requirements;
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(reqs, null, 2) }] };
    }
    if (key === 'test-plan/latest') {
      const plan = engine.storage.getLatestTestPlan();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(plan || {}, null, 2) }] };
    }
    if (key === 'runs/latest') {
      const run = engine.storage.getLatestTestRun();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(run || {}, null, 2) }] };
    }
    if (key === 'release/confidence') {
      const report = await engine.releaseCheck();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(report, null, 2) }] };
    }

    throw new Error(`Resource not found: ${uri}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
