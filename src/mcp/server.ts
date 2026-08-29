import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { QAForgeEngine } from '../application/engine.js';

export async function runMcpServer(projectRoot: string = process.cwd()): Promise<void> {
  const engine = new QAForgeEngine(projectRoot);

  const server = new Server(
    {
      name: 'qaforge',
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
          name: 'qa.inspect',
          description: 'Inspect current project repository, detect frameworks, routes, API endpoints, and existing tests.',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Optional workspace path' }
            }
          }
        },
        {
          name: 'qa.bootstrap',
          description: 'Handshake and teach any AI Agent / Editor how to interact with QAForge autonomously.',
          inputSchema: {
            type: 'object',
            properties: {
              agentName: { type: 'string' },
              preferredOutput: { type: 'string', enum: ['json', 'markdown', 'compact'] }
            }
          }
        },
        {
          name: 'qa.learnFramework',
          description: 'Teach QAForge an uncommon or in-house custom framework using AGENTS.md, instructions, or directory rules.',
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
          name: 'qa.explore',
          description: 'Walk and explore live routes, elements, buttons, and build site visual exploration map.',
          inputSchema: {
            type: 'object',
            properties: {
              baseURL: { type: 'string' }
            }
          }
        },
        {
          name: 'qa.fuzzApi',
          description: 'Generate security and boundary probes (auth bypass, SQLi/injection, empty payload) for APIs.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.mutationScore',
          description: 'Evaluate test suite mutation score and quality verdict by checking assertion sensitivity.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.refine',
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
          name: 'qa.accessibility',
          description: 'Run automated WCAG 2.1 accessibility audit across project components and routes.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.visualDiff',
          description: 'Compare UI screenshot baselines and detect visual regression/drift.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.lint',
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
          name: 'qa.contractDrift',
          description: 'Detect API contract drift between OpenAPI documentation and active source code routes.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.auditSec',
          description: 'Scan dependencies and project files for known CVE vulnerabilities and hardcoded secrets.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.perf',
          description: 'Audit Core Web Vitals (LCP, FID, CLS, TTFB, bundle weight) across detected routes.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.mockNetwork',
          description: 'Generate Mock Service Worker (MSW) network mock handlers from discovered API endpoints.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.quarantine',
          description: 'Isolate and quarantine high-variance flaky tests from breaking CI pipelines.',
          inputSchema: {
            type: 'object',
            properties: {
              threshold: { type: 'number', description: 'Flakiness variance threshold (0-1, default 0.25)' }
            }
          }
        },
        {
          name: 'qa.coverage',
          description: 'Generate PRD requirements coverage heatmap matrix with test pass rate correlation.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.plan',
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
          name: 'qa.generate',
          description: 'Generate executable test files for Vitest, Jest, or Playwright based on the active test plan.',
          inputSchema: {
            type: 'object',
            properties: {
              planId: { type: 'string' },
              testCaseIds: { type: 'array', items: { type: 'string' } },
              overwritePolicy: { type: 'string', enum: ['never', 'generated-only', 'explicit'] }
            }
          }
        },
        {
          name: 'qa.run',
          description: 'Execute unit, integration, API, or Playwright E2E tests and collect structured execution evidence.',
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
          name: 'qa.run.get',
          description: 'Retrieve results and evidence for a specific test run.',
          inputSchema: {
            type: 'object',
            properties: {
              runId: { type: 'string', description: 'Run ID or "latest"' }
            }
          }
        },
        {
          name: 'qa.changed',
          description: 'Analyze Git changes and select only impacted unit, integration, API, and E2E tests.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.diagnose',
          description: 'Diagnose test run failures, classify root cause (APPLICATION_BUG vs TEST_BUG vs FLAKY_TEST), and suggest actions.',
          inputSchema: {
            type: 'object',
            properties: {
              runId: { type: 'string', description: 'Optional run ID to diagnose (defaults to latest)' }
            }
          }
        },
        {
          name: 'qa.heal',
          description: 'Safely repair stale selectors and fragile test locators in generated test files without modifying business logic.',
          inputSchema: {
            type: 'object',
            properties: {
              runId: { type: 'string' }
            }
          }
        },
        {
          name: 'qa.suggestFix',
          description: 'Generate specific code fix recommendation and diff for the coding agent to resolve an application bug.',
          inputSchema: {
            type: 'object',
            properties: {
              diagnosisId: { type: 'string' }
            }
          }
        },
        {
          name: 'qa.flaky',
          description: 'Inspect flaky test history and variance statistics across local test executions.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.releaseCheck',
          description: 'Evaluate release confidence score and readiness verdict (READY, READY_WITH_WARNINGS, NOT_READY).',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.runCollection',
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
          name: 'qa.exportCollection',
          description: 'Export all discovered project routes and API endpoints as a standard Postman Collection v2.1 JSON.',
          inputSchema: {
            type: 'object',
            properties: {
              outputPath: { type: 'string', description: 'Output file path (default: qaforge_postman_collection.json)' },
              collectionName: { type: 'string', description: 'Optional custom collection name' }
            }
          }
        },
        {
          name: 'qa.sendRequest',
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
          name: 'qa.loadTest',
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
          name: 'qa.mockData',
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
          name: 'qa.owaspScan',
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
          name: 'qa.graphqlTest',
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
          name: 'qa.wsTest',
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
          name: 'qa.remoteInit',
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
          name: 'qa.remoteConnect',
          description: 'Connect and verify handshake link with a live remote website running the QAForge companion probe.',
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
          name: 'qa.remoteAudit',
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
          name: 'qa.recordScenario',
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
          name: 'qa.stabilizeFlaky',
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
          name: 'qa.dbSnapshot',
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
          name: 'qa.dbRestore',
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
          name: 'qa.autoBugFix',
          description: 'Synthesize code repair patches for APPLICATION_BUG failures and generate unified Git diff.',
          inputSchema: {
            type: 'object',
            properties: {
              apply: { type: 'boolean', description: 'Directly apply synthesized repairs to source files (default: false)' }
            }
          }
        },
        {
          name: 'qa.exportReport',
          description: 'Export comprehensive standalone single-file executive QA & Security audit report (HTML, JSON, Markdown).',
          inputSchema: {
            type: 'object',
            properties: {
              outputPath: { type: 'string', description: 'Output destination path' },
              format: { type: 'string', enum: ['html', 'json', 'markdown'] },
              title: { type: 'string', description: 'Custom report title' }
            }
          }
        },
        {
          name: 'qa.chaosTest',
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
          name: 'qa.dockerEnv',
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
          name: 'qa.browserMatrix',
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
          name: 'qa.bddFeatures',
          description: 'Generate standard BDD / Gherkin .feature specs and step definitions from discovered PRD requirements.',
          inputSchema: {
            type: 'object',
            properties: {
              outputDir: { type: 'string', description: 'Output directory for .feature files (default: features)' }
            }
          }
        },
        {
          name: 'qa.sendAlert',
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
          name: 'qa.featureParity',
          description: 'Universal UI-to-Backend parity auditor: detects ghost features, no-op click handlers, unhandled Tauri/API commands, and missing enum options.',
          inputSchema: {
            type: 'object',
            properties: {
              generateE2ESuite: { type: 'boolean', description: 'Generate Playwright E2E test suite verifying each UI option' }
            }
          }
        },
        {
          name: 'qa.scanMalware',
          description: 'Scan repository files for malicious code, obfuscated payloads, suspicious lifecycle scripts, reverse shells, and exposed API keys.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.remediateMalware',
          description: 'One-click auto-remediation to clean, sanitize, and neutralize detected malware threats and suspicious scripts.',
          inputSchema: {
            type: 'object',
            properties: {
              threatIds: { type: 'array', items: { type: 'string' }, description: 'Optional list of threat IDs to remediate (default: all)' }
            }
          }
        },
        {
          name: 'qa.aiEvaluate',
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
          name: 'qa.gitBisect',
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
          name: 'qa.networkThrottle',
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
          name: 'qa.smartContractAudit',
          description: 'Deep security audit for Solidity / Web3 smart contracts (reentrancy, unprotected selfdestruct, tx.origin, timestamp manipulation).',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.deadAssetPurge',
          description: 'Scan and purge unreferenced images, fonts, dead CSS, and unused asset files to reclaim disk space.',
          inputSchema: {
            type: 'object',
            properties: {
              purge: { type: 'boolean', description: 'Automatically delete identified dead assets' }
            }
          }
        },
        {
          name: 'qa.screenReaderSim',
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
          name: 'qa.dbQueryAudit',
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
          name: 'qa.envDriftAudit',
          description: 'Multi-environment config & secret drift auditor: compare .env against .env.example, detect missing keys in code, and catch leaked secrets.',
          inputSchema: {
            type: 'object',
            properties: {
              generateExample: { type: 'boolean' }
            }
          }
        },
        {
          name: 'qa.recordFailureReplay',
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
          name: 'qa.rateLimitAudit',
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
          name: 'qa.statefulMock',
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
          name: 'qa.architectureGraph',
          description: 'Generate microservices & architecture dependency graph (UI, APIs, DBs, Caches, External Services) with Mermaid and topology view.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'qa.doctor',
          description: 'Run environmental, runtime, and project installation diagnostics to verify readiness.',
          inputSchema: {
            type: 'object',
            properties: {}
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
        case 'qa.inspect': {
          const result = await engine.inspect();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.bootstrap': {
          const result = engine.handshake(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.learnFramework': {
          const result = engine.learnFramework(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.explore': {
          const result = await engine.explore(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.fuzzApi': {
          const result = await engine.fuzzApi();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.mutationScore': {
          const result = await engine.evaluateMutationScore();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.refine': {
          const result = await engine.refineTest(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.accessibility': {
          const result = await engine.auditA11y();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.visualDiff': {
          const result = await engine.compareVisuals();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.contractDrift': {
          const result = await engine.checkContractDrift();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.auditSec': {
          const result = engine.auditSecurity();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.perf': {
          const result = await engine.profilePerf();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.mockNetwork': {
          const result = await engine.generateMsw();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.quarantine': {
          const result = engine.quarantineFlaky((args as any).threshold);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.coverage': {
          const result = await engine.getCoverageHeatmap();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.lint': {
          const result = await engine.lint(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.plan': {
          const plan = await engine.plan(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }]
          };
        }

        case 'qa.generate': {
          const result = await engine.generate(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.run': {
          const runResult = await engine.run(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(runResult, null, 2) }]
          };
        }

        case 'qa.run.get': {
          const runId = (args as any).runId || 'latest';
          const runResult = runId === 'latest'
            ? engine.storage.getLatestTestRun()
            : engine.storage.getTestRun(runId);
          return {
            content: [{ type: 'text', text: JSON.stringify(runResult || { error: 'Not found' }, null, 2) }]
          };
        }

        case 'qa.changed': {
          const impact = await engine.changed();
          return {
            content: [{ type: 'text', text: JSON.stringify(impact, null, 2) }]
          };
        }

        case 'qa.diagnose': {
          const diagnoses = await engine.diagnose((args as any).runId);
          return {
            content: [{ type: 'text', text: JSON.stringify(diagnoses, null, 2) }]
          };
        }

        case 'qa.heal': {
          const healResults = await engine.heal((args as any).runId);
          return {
            content: [{ type: 'text', text: JSON.stringify(healResults, null, 2) }]
          };
        }

        case 'qa.suggestFix': {
          const diagnoses = await engine.diagnose();
          const target = diagnoses.find(d => d.diagnosisId === (args as any).diagnosisId) || diagnoses[0];
          if (!target) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'No diagnosis available' }) }] };
          }
          const suggestion = engine.suggestFix(target);
          return {
            content: [{ type: 'text', text: JSON.stringify(suggestion, null, 2) }]
          };
        }

        case 'qa.flaky': {
          const flaky = engine.getFlaky();
          return {
            content: [{ type: 'text', text: JSON.stringify(flaky, null, 2) }]
          };
        }

        case 'qa.releaseCheck': {
          const release = await engine.releaseCheck();
          return {
            content: [{ type: 'text', text: JSON.stringify(release, null, 2) }]
          };
        }

        case 'qa.runCollection': {
          const { collectionPath, environmentPath, baseURL } = args as any;
          const result = await engine.runPostmanCollection(collectionPath, environmentPath, baseURL);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.exportCollection': {
          const { outputPath, collectionName } = args as any;
          const result = await engine.exportPostmanCollection(outputPath, collectionName);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.sendRequest': {
          const result = await engine.sendHttpRequest(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.loadTest': {
          const result = await engine.runLoadTest(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.mockData': {
          const result = engine.generateMockData(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.owaspScan': {
          const result = await engine.scanOwasp((args as any).targetUrl);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.graphqlTest': {
          const result = await engine.runGraphQL(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.wsTest': {
          const result = await engine.testWebSocket(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.remoteInit': {
          const { type, siteName, secretToken } = args as any;
          const result = engine.generateRemoteProbe(type, { siteName, secretToken });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.remoteConnect': {
          const { remoteUrl, bridgeSecret } = args as any;
          const result = await engine.connectRemoteSite(remoteUrl, bridgeSecret);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.remoteAudit': {
          const { remoteUrl, includeLoadTest, loadVus, bridgeSecret } = args as any;
          const result = await engine.auditRemoteSite(remoteUrl, { includeLoadTest, loadVus, bridgeSecret });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.recordScenario': {
          const result = engine.recordScenario(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.stabilizeFlaky': {
          const { targetFileOrCode, saveFix } = args as any;
          const result = engine.stabilizeTests(targetFileOrCode, saveFix);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.dbSnapshot': {
          const { name: snapName, filePaths } = args as any;
          const result = engine.createDbSnapshot(snapName, filePaths);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.dbRestore': {
          const { snapshotId } = args as any;
          const result = engine.restoreDbSnapshot(snapshotId);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.autoBugFix': {
          const { apply } = args as any;
          const result = await engine.autoFixBugs(apply);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.exportReport': {
          const result = engine.exportReport(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.chaosTest': {
          const result = await engine.runChaosTest(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.dockerEnv': {
          const result = engine.generateDockerEnv(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.browserMatrix': {
          const result = engine.generateBrowserMatrix(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.bddFeatures': {
          const result = await engine.generateBddFeatures((args as any).outputDir);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.sendAlert': {
          const result = await engine.sendAlert(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.featureParity': {
          const result = engine.auditFeatureParity(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.scanMalware': {
          const result = engine.scanMalware();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.remediateMalware': {
          const result = engine.remediateMalware((args as any).threatIds);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.aiEvaluate': {
          const result = await engine.evaluateAiOutputs(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.gitBisect': {
          const result = await engine.huntRegression(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.networkThrottle': {
          const result = await engine.throttleRequest(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.smartContractAudit': {
          const result = engine.auditSmartContracts();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.deadAssetPurge': {
          const { purge } = args as any;
          const result = purge ? engine.purgeDeadAssets() : engine.scanDeadAssets();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.screenReaderSim': {
          const result = engine.simulateScreenReader(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.dbQueryAudit': {
          const result = engine.auditDbQueries(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.envDriftAudit': {
          const result = engine.auditEnvDrift(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.recordFailureReplay': {
          const result = engine.recordFailureReplay(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.rateLimitAudit': {
          const result = await engine.auditRateLimit(args as any);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.statefulMock': {
          const { action, port, initialData } = args as any;
          let result: any;
          if (action === 'start') result = await engine.startStatefulMock({ port, initialData });
          else if (action === 'stop') result = engine.stopStatefulMock();
          else result = engine.resetStatefulMock();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.architectureGraph': {
          const result = engine.generateArchitectureGraph();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'qa.doctor': {
          const result = engine.doctor();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }









        default:
          throw new Error(`Unknown QAForge tool: ${name}`);
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `QAForge Error: ${err.message}` }]
      };
    }
  });

  // Resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'qa://project/profile',
          name: 'Project Profile',
          mimeType: 'application/json'
        },
        {
          uri: 'qa://requirements',
          name: 'Discovered Requirements',
          mimeType: 'application/json'
        },
        {
          uri: 'qa://test-plan/latest',
          name: 'Latest Test Plan',
          mimeType: 'application/json'
        },
        {
          uri: 'qa://runs/latest',
          name: 'Latest Test Run Results',
          mimeType: 'application/json'
        }
      ]
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (uri === 'qa://project/profile') {
      const profile = engine.storage.getProjectProfile() || (await engine.inspect()).profile;
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(profile, null, 2) }] };
    }
    if (uri === 'qa://requirements') {
      const reqs = engine.storage.getRequirements() || (await engine.inspect()).requirements;
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(reqs, null, 2) }] };
    }
    if (uri === 'qa://test-plan/latest') {
      const plan = engine.storage.getLatestTestPlan();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(plan || {}, null, 2) }] };
    }
    if (uri === 'qa://runs/latest') {
      const run = engine.storage.getLatestTestRun();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(run || {}, null, 2) }] };
    }

    throw new Error(`Resource not found: ${uri}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
