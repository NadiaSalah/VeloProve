#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { QAForgeEngine } from '../application/engine.js';
import { runMcpServer } from '../mcp/server.js';
import { DEFAULT_CONFIG } from '../shared/config-loader.js';
import { renderQAForgeBanner, renderCommandHeader, renderBox } from './banner.js';
import { createSpinner } from './spinner.js';
import { promptInitQuestions } from './prompts.js';
import { ReportSummaryService } from '../application/report-summary-service.js';

const program = new Command();

program
  .name('qaforge')
  .description('Local-First Agentic QA & Automated Testing Toolkit')
  .version('1.0.0')
  .addHelpText('before', renderQAForgeBanner());

// 1. init
program
  .command('init')
  .description('Initialize QAForge configuration, directory structure, and scripts in project')
  .option('-y, --yes', 'Skip confirmations and use sensible defaults', false)
  .option('--mcp', 'Configure local MCP server integration for AI agents', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    console.log(renderQAForgeBanner());
    renderCommandHeader('init', 'Project Setup & AI Agent Integration');

    // 1. Ensure .qaforge directory structure
    const qaforgeDirs = [
      path.join(cwd, '.qaforge'),
      path.join(cwd, '.qaforge', 'config'),
      path.join(cwd, '.qaforge', 'reports'),
      path.join(cwd, '.qaforge', 'state')
    ];
    for (const d of qaforgeDirs) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    }

    // 2. Scaffold qaforge.config.json if not present
    const configPath = path.join(cwd, 'qaforge.config.json');
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
      console.log(pc.green('✔ Created qaforge.config.json (user-editable configuration)'));
    } else {
      console.log(pc.dim('ℹ Existing qaforge.config.json preserved (idempotent setup).'));
    }

    // 3. Inspect project environment
    const engine = new QAForgeEngine(cwd);
    const spinner = createSpinner('Scanning project structure and dependencies...').start();
    const { profile, requirements } = await engine.inspect();
    spinner.succeed(`Discovered project: ${pc.bold(profile.projectName)} (${profile.frameworks.join(', ') || 'Node.js'})`);

    // Interactive configuration if not -y/--yes
    if (!opts.yes) {
      const answers = await promptInitQuestions({
        projectName: profile.projectName,
        frameworks: profile.frameworks,
        testFrameworks: profile.testFrameworks
      });
      if (answers.configureMcp) {
        opts.mcp = true;
      }
    }

    // 4. Safely configure package.json scripts (non-destructive)
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkgContent.scripts = pkgContent.scripts || {};
        const scriptsToAdd: Record<string, string> = {
          'qa': 'qaforge',
          'qa:doctor': 'qaforge doctor',
          'qa:test': 'qaforge test',
          'qa:changed': 'qaforge changed',
          'qa:release': 'qaforge release'
        };

        let addedCount = 0;
        for (const [key, val] of Object.entries(scriptsToAdd)) {
          if (!pkgContent.scripts[key]) {
            pkgContent.scripts[key] = val;
            addedCount++;
          }
        }

        if (addedCount > 0) {
          fs.writeFileSync(pkgPath, JSON.stringify(pkgContent, null, 2) + '\n', 'utf8');
          console.log(pc.green(`✔ Added ${addedCount} QAForge convenience scripts to package.json`));
        }
      } catch {
        // preserve package.json untouched if parse error
      }
    }

    // 5. Configure MCP integration if .cursor exists or --mcp passed
    const cursorDir = path.join(cwd, '.cursor');
    if (opts.mcp || fs.existsSync(cursorDir)) {
      if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
      const mcpPath = path.join(cursorDir, 'mcp.json');
      if (!fs.existsSync(mcpPath)) {
        const mcpConfig = {
          mcpServers: {
            qaforge: {
              command: 'npx',
              args: ['qaforge', 'mcp']
            }
          }
        };
        fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
        console.log(pc.green('✔ Configured AI Agent MCP integration in .cursor/mcp.json'));
      }
    }

    console.log(pc.bold(pc.green(`\n✔ QAForge initialized successfully for "${profile.projectName}"!`)));
    console.log(`- Project Type: ${pc.bold(profile.frameworks.join(', ') || 'Node.js')}`);
    console.log(`- Workspace: ${pc.bold(profile.workspaceType)}`);
    console.log(`- Package Manager: ${pc.bold(profile.packageManager)}`);
    console.log(`- Test Runners: ${pc.bold(profile.testFrameworks.join(', ') || 'None detected (Vitest recommended)')}`);
    console.log(`- Discovered Requirements: ${pc.bold(pc.green(requirements.length))}`);
    
    // Write summary report
    ReportSummaryService.writeSummary({
      projectRoot: cwd,
      commandName: 'init',
      title: `Project Initialized: ${profile.projectName}`,
      verdict: 'HEALTHY',
      metrics: {
        'Project Name': profile.projectName,
        'Framework': profile.frameworks.join(', ') || 'Node.js',
        'Package Manager': profile.packageManager,
        'Workspace Type': profile.workspaceType,
        'Discovered Requirements': requirements.length,
        'Test Runners': profile.testFrameworks.join(', ') || 'None'
      },
      details: [
        'Initialized configuration in qaforge.config.json',
        'Scaffolded local state and reports directories in .qaforge/',
        profile.apps.length > 1 ? `Discovered ${profile.apps.length} workspace applications / packages` : 'Single target project structure'
      ],
      recommendations: [
        'Run "npx qaforge doctor" to verify runtime dependencies',
        'Run "npx qaforge plan" to create your first test plan',
        'Launch "npx qaforge ui" to view the live HTML dashboard'
      ]
    });

    console.log('\n' + renderBox('Quick Start & Next Steps', [
      `1. ${pc.cyan('npx qaforge doctor')}   → Verify environment and test runners`,
      `2. ${pc.cyan('npx qaforge plan')}     → Generate risk-prioritized test plan`,
      `3. ${pc.cyan('npx qaforge ui')}       → Launch local live Web Command Center`,
      `4. ${pc.cyan('npx qaforge mcp')}      → Connect AI Coding Agents via stdio`
    ], pc.green) + '\n');
  });

// 1.1 doctor
program
  .command('doctor')
  .description('Run environmental, runtime, and project installation diagnostics')
  .action(() => {
    const cwd = process.cwd();
    const engine = new QAForgeEngine(cwd);
    renderCommandHeader('doctor', 'Environment & Installation Diagnostics');
    const spinner = createSpinner('Running environmental diagnostic probes...').start();
    const report = engine.doctor();
    spinner.succeed(`Diagnostics complete: ${report.verdict}`);

    const verdictColor = report.verdict === 'HEALTHY' ? pc.green : report.verdict === 'WARNINGS' ? pc.yellow : pc.red;
    console.log(pc.bold(verdictColor(`\n=== Diagnostic Verdict: ${report.verdict} (${report.passedCount}/${report.totalChecks} Passed) ===`)));
    console.log(`Platform: ${pc.cyan(report.platform)} | Node: ${pc.cyan(report.nodeVersion)} | Root: ${pc.dim(report.projectRoot)}\n`);

    for (const chk of report.checks) {
      let icon = pc.green('✔');
      let statusText = pc.green('PASS');
      if (chk.status === 'WARNING') {
        icon = pc.yellow('⚠');
        statusText = pc.yellow('WARN');
      } else if (chk.status === 'FAIL') {
        icon = pc.red('✖');
        statusText = pc.red('FAIL');
      } else if (chk.status === 'INFO') {
        icon = pc.cyan('ℹ');
        statusText = pc.cyan('INFO');
      }

      console.log(`  ${icon} [${statusText}] ${pc.bold(chk.title)}: ${chk.message}`);
      if (chk.remediation) {
        console.log(`     ${pc.dim('💡 Fix:')} ${pc.cyan(chk.remediation)}`);
      }
    }
    console.log('');

    ReportSummaryService.writeSummary({
      projectRoot: cwd,
      commandName: 'doctor',
      title: `Environment & Installation Diagnostics (${report.verdict})`,
      verdict: report.verdict,
      metrics: {
        'Verdict': report.verdict,
        'Checks Passed': `${report.passedCount}/${report.totalChecks}`,
        'Platform': report.platform,
        'Node Version': report.nodeVersion
      },
      details: report.checks.map(c => `[${c.status}] **${c.title}**: ${c.message}`),
      recommendations: report.checks.filter(c => c.remediation).map(c => `${c.title}: ${c.remediation}`)
    });
  });

// 2. inspect
program
  .command('inspect')
  .description('Inspect project structure, routes, API endpoints, and existing tests')
  .action(async () => {
    const cwd = process.cwd();
    const engine = new QAForgeEngine(cwd);
    renderCommandHeader('inspect', 'Project Stack & Route Architecture');
    const spinner = createSpinner('Scanning AST, routes, endpoints and requirements...').start();
    const { profile, requirements, featureMap } = await engine.inspect();
    spinner.succeed(`Inspected ${profile.projectName} (${profile.workspaceType})`);

    console.log(pc.bold(pc.cyan('\n=== QAForge Project Profile ===')));
    console.log(`Project: ${pc.bold(profile.projectName)} (${profile.packageManager})`);
    console.log(`Workspace Type: ${pc.bold(profile.workspaceType)}`);
    console.log(`Frameworks: ${profile.frameworks.join(', ')}`);
    if (profile.apps.length > 1) {
      console.log(`Discovered Sub-Apps / Packages (${profile.apps.length}): ${pc.cyan(profile.apps.map(a => a.name).join(', '))}`);
    }
    console.log(`Routes: ${profile.routes.length}`);
    console.log(`API Endpoints: ${profile.apiEndpoints.length}`);
    console.log(`Source Modules: ${profile.sourceFiles.length}`);
    console.log(`Existing Tests: ${profile.testFiles.length}`);
    console.log(`Discovered Requirements: ${pc.green(requirements.length)}`);
    console.log(`Feature Groups: ${pc.yellow(featureMap.features.length)}`);

    ReportSummaryService.writeSummary({
      projectRoot: cwd,
      commandName: 'inspect',
      title: `Project Inspection: ${profile.projectName}`,
      verdict: 'INFO',
      metrics: {
        'Project Name': profile.projectName,
        'Workspace': profile.workspaceType,
        'Routes Count': profile.routes.length,
        'API Endpoints': profile.apiEndpoints.length,
        'Source Files': profile.sourceFiles.length,
        'Existing Tests': profile.testFiles.length,
        'PRD Requirements': requirements.length
      },
      details: [
        `Frameworks: ${profile.frameworks.join(', ') || 'Node.js'}`,
        `Languages: ${profile.languages.join(', ')}`,
        `Apps / Packages: ${profile.apps.map(a => a.name).join(', ')}`
      ]
    });
  });

// 2.1 agent-handshake
program
  .command('agent-handshake')
  .description('Perform universal agent handshake & teach AI how to use QAForge')
  .option('-a, --agent-name <name>', 'Name of AI agent or editor', 'CustomAI')
  .option('-o, --output <type>', 'Output preference (json, markdown, compact)', 'json')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const res = engine.handshake({ agentName: opts.agentName, preferredOutput: opts.output });

    console.log(pc.bold(pc.green(`\n✔ QAForge Handshake Successful for: ${res.agentName}`)));
    console.log(pc.cyan(`Manifest written to: ${res.manifestPath}`));
    console.log(pc.bold('\nInstructions for AI Agent:'));
    console.log(pc.dim(res.instructionPrompt));
  });

// 2.1.1 learn-framework
program
  .command('learn-framework')
  .description('Teach QAForge an uncommon or custom in-house framework from AGENTS.md or instructions')
  .option('-i, --instructions <instructions>', 'Natural language or markdown framework specification')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const result = engine.learnFramework({ instructions: opts.instructions });

    console.log(pc.bold(pc.green(`\n✔ ${result.summary}`)));
    console.log(`Config file: ${pc.cyan(result.configPath)}`);
    console.log(`Routes detected: ${pc.bold(result.inferredRoutesCount)} | APIs detected: ${pc.bold(result.inferredApisCount)}`);
  });

// 2.2 explore
program
  .command('explore')
  .description('Explore live application screens, interactive elements, and build exploration map')
  .option('-u, --url <url>', 'Base URL', 'http://localhost:5173')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan('\nStarting application exploration...'));
    const res = await engine.explore({ baseURL: opts.url });

    console.log(pc.bold(pc.green(`\n✔ Explored ${res.totalRoutes} route(s) with ${res.totalInteractiveElements} interactive element(s):`)));
    for (const screen of res.screens) {
      console.log(`\n  📍 Route: ${pc.bold(screen.routePath)} (${screen.elements.length} elements)`);
      for (const el of screen.elements.slice(0, 5)) {
        console.log(`     • [${el.tag}] ${el.name || el.selector}`);
      }
    }
  });

// 2.3 fuzz-api
program
  .command('fuzz-api')
  .description('Generate API security probes and boundary validation tests')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const probes = await engine.fuzzApi();

    console.log(pc.bold(pc.cyan(`\n=== QAForge API Fuzz & Security Probes (${probes.length} generated) ===`)));
    for (const p of probes) {
      console.log(`  🛡️  [${p.probeType.toUpperCase()}] ${p.method} ${p.endpoint}`);
      console.log(pc.dim(`     ${p.riskDescription}`));
    }
  });

// 3. plan
program
  .command('plan')
  .description('Generate a risk-aware, prioritized test plan from project PRD and routes')
  .option('-s, --scope <scope>', 'Scope (all, uncovered, critical, e2e, api, unit, changed)', 'all')
  .option('-m, --max <max>', 'Maximum test cases', parseInt)
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const plan = await engine.plan({ scope: opts.scope, maxTests: opts.max });

    console.log(pc.bold(pc.cyan(`\n=== QAForge Test Plan (${plan.planId}) ===`)));
    console.log(`Total Planned Tests: ${pc.bold(plan.summary.totalTests)}`);
    console.log(`Critical Priority: ${pc.red(plan.summary.criticalCount)}`);
    console.log(`Est. Execution Time: ~${plan.summary.estimatedExecutionTimeSec}s`);

    console.log(pc.bold('\nPlanned Test Cases:'));
    for (const tc of plan.testCases.slice(0, 10)) {
      const pColor = tc.priority === 'critical' ? pc.red : tc.priority === 'high' ? pc.yellow : pc.blue;
      console.log(`  ${pColor(`[${tc.priority.toUpperCase()}]`)} ${pc.bold(tc.title)} (${tc.type})`);
    }

    if (plan.testCases.length > 10) {
      console.log(pc.dim(`  ... and ${plan.testCases.length - 10} more test cases.`));
    }
  });

// 4. generate
program
  .command('generate')
  .description('Generate executable tests from the current test plan')
  .option('--overwrite <policy>', 'Overwrite policy (never, generated-only, explicit)', 'generated-only')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const res = await engine.generate({ overwritePolicy: opts.overwrite });

    console.log(pc.bold(pc.green(`\n✔ Generated ${res.writtenCount} test files.`)));
    for (const file of res.generatedFiles) {
      console.log(`  + ${file.relativePath} (${file.framework})`);
    }
    if (res.skippedFiles.length > 0) {
      console.log(pc.yellow(`\nℹ Skipped ${res.skippedFiles.length} existing non-generated files.`));
    }
  });

// 5. test
program
  .command('test')
  .description('Execute test suites and collect structured results')
  .option('-s, --scope <scope>', 'Execution scope (all, changed, paths, critical)', 'all')
  .option('-p, --paths <paths...>', 'Specific test paths')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan('\nRunning QAForge test execution...'));

    const res = await engine.run({ scope: opts.scope, paths: opts.paths });

    const statusColor = res.status === 'passed' ? pc.green : pc.red;
    console.log(pc.bold(statusColor(`\n=== Run Result: ${res.status.toUpperCase()} (${res.durationMs}ms) ===`)));
    console.log(`Total: ${res.summary.total} | Passed: ${pc.green(res.summary.passed)} | Failed: ${pc.red(res.summary.failed)}`);

    if (res.failures.length > 0) {
      console.log(pc.bold(pc.red('\nFailures:')));
      for (const f of res.failures) {
        console.log(`  ✖ ${f.filePath} -> ${f.title}`);
        if (f.error?.message) {
          console.log(pc.dim(`    ${f.error.message.slice(0, 150)}`));
        }
      }
    }
  });

// 6. changed
program
  .command('changed')
  .description('Analyze Git changes and run impacted tests only')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const impact = await engine.changed();

    console.log(pc.bold(pc.cyan('\n=== Git Change Impact Analysis ===')));
    console.log(`Changed Files: ${impact.changedFiles.length}`);
    for (const cf of impact.changedFiles) {
      console.log(`  • ${cf}`);
    }

    console.log(pc.bold(`\nImpacted Tests (${impact.impactedTestFiles.length}):`));
    for (const t of impact.impactedTestFiles) {
      console.log(`  🎯 ${pc.green(t)}`);
    }
  });

// 7. diagnose
program
  .command('diagnose')
  .description('Diagnose test failures and classify root causes')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const diagnoses = await engine.diagnose();

    console.log(pc.bold(pc.cyan(`\n=== Diagnostics Report (${diagnoses.length} failures) ===`)));
    for (const diag of diagnoses) {
      const color = diag.classification === 'APPLICATION_BUG' ? pc.red : pc.yellow;
      console.log(pc.bold(color(`\n[${diag.classification}] (Confidence: ${diag.confidence})`)));
      console.log(`Test: ${diag.testId}`);
      console.log(`Root Cause: ${diag.rootCause}`);
      console.log(`Affected Files: ${diag.affectedFiles.join(', ')}`);
      console.log(`Actions:`);
      for (const act of diag.suggestedActions) {
        console.log(`  - ${act}`);
      }
    }
  });

// 8. heal
program
  .command('heal')
  .description('Safely repair stale selectors and locators in generated tests')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const heals = await engine.heal();

    if (heals.length === 0) {
      console.log(pc.yellow('\nℹ No healable test failures detected.'));
      return;
    }

    console.log(pc.bold(pc.green(`\n✔ Successfully healed ${heals.length} test locator(s):`)));
    for (const h of heals) {
      console.log(`  • ${h.testFile}`);
      console.log(pc.dim(`    Before: ${h.beforeSnippet}`));
      console.log(pc.green(`    After:  ${h.afterSnippet}`));
    }
  });

// 9. release
program
  .command('release')
  .description('Run release verification check and calculate confidence score')
  .option('--ci', 'CI deterministic mode (exits 1 on failure)')
  .action(async (opts) => {
    const cwd = process.cwd();
    const engine = new QAForgeEngine(cwd);
    renderCommandHeader('release', 'Release Confidence & Gatekeeper');
    const spinner = createSpinner('Evaluating PRD coverage, test results, and release confidence...').start();
    const report = await engine.releaseCheck();
    spinner.succeed(`Release assessment complete: ${report.verdict} (${report.confidenceScore}/100)`);

    const vColor = report.verdict === 'READY' ? pc.green : report.verdict === 'READY_WITH_WARNINGS' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Release Verdict: ${report.verdict} (Score: ${report.confidenceScore}/100) ===`)));

    console.log(`- Requirements: ${report.summary.coveredRequirements}/${report.summary.totalRequirements} covered`);
    console.log(`- Tests: ${report.summary.testsPassed}/${report.summary.testsTotal} passed`);

    if (report.blockers.length > 0) {
      console.log(pc.bold(pc.red('\nBlockers:')));
      for (const b of report.blockers) console.log(`  ✖ ${b}`);
    }

    ReportSummaryService.writeSummary({
      projectRoot: cwd,
      commandName: 'release',
      title: `Release Readiness Gate: ${report.verdict} (${report.confidenceScore}/100)`,
      verdict: report.verdict === 'READY' ? 'PASSED' : report.verdict === 'READY_WITH_WARNINGS' ? 'WARNINGS' : 'FAILED',
      metrics: {
        'Confidence Score': `${report.confidenceScore}/100`,
        'Verdict': report.verdict,
        'Requirements Covered': `${report.summary.coveredRequirements}/${report.summary.totalRequirements}`,
        'Tests Passed': `${report.summary.testsPassed}/${report.summary.testsTotal}`
      },
      details: [
        `Release confidence evaluation completed with verdict: **${report.verdict}**`,
        report.blockers.length > 0 ? `Detected ${report.blockers.length} blocker(s)` : `Zero release blockers detected`
      ],
      recommendations: report.blockers.length > 0 ? report.blockers.map(b => `Fix blocker: ${b}`) : ['Ready for production deployment and release tagging!']
    });

    if (opts.ci && report.verdict === 'NOT_READY') {
      process.exit(1);
    }
  });

// 9.1 ui
program
  .command('ui')
  .description('Start local HTML/Live Dashboard server')
  .option('-p, --port <port>', 'Server port', parseInt, 4173)
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const { url } = await engine.startUi(opts.port);
    console.log(pc.bold(pc.green(`\n🚀 QAForge Local Dashboard running at: ${url}`)));
    console.log(pc.dim('Press Ctrl+C to stop.'));
  });

// 9.2 setup-ci
program
  .command('setup-ci')
  .description('Generate GitHub Actions autonomous QA workflow')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const filePath = engine.setupCi();
    console.log(pc.bold(pc.green(`\n✔ Created GitHub Actions workflow at: ${filePath}`)));
  });

// 9.3 mutation-score
program
  .command('mutation-score')
  .description('Calculate mutation score to evaluate actual test assertion quality')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const res = await engine.evaluateMutationScore();

    const qColor = res.qualityVerdict === 'EXCELLENT' ? pc.green : res.qualityVerdict === 'GOOD' ? pc.cyan : pc.yellow;
    console.log(pc.bold(qColor(`\n=== Test Quality Score: ${res.mutationScorePct}% (${res.qualityVerdict}) ===`)));
    console.log(`- Killed Mutants: ${pc.green(res.killedMutants)}/${res.totalMutants}`);
    console.log(`- Survived Mutants: ${pc.yellow(res.survivedMutants)}`);
  });

// 9.4 refine
program
  .command('refine <instruction>')
  .description('Refine test assertions using natural language instructions')
  .option('-f, --file <file>', 'Specific test file path')
  .action(async (instruction, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const result = await engine.refineTest({ instruction, testFilePath: opts.file });
    console.log(pc.bold(pc.green(`\n✨ Successfully refined ${result.filePath}:`)));
    for (const ref of result.appliedRefinements) {
      console.log(`  + ${ref}`);
    }
  });

// 9.5 a11y
program
  .command('a11y')
  .description('Run automated WCAG 2.1 accessibility audit')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const result = await engine.auditA11y();
    console.log(pc.bold(pc.cyan(`\n♿ Accessibility Audit Score: ${result.score}/100 (${result.wcagLevel})`)));
    console.log(`Passed Checks: ${result.passesCount}/${result.totalChecks}`);
    if (result.violations.length > 0) {
      console.log(pc.yellow(`\nFound ${result.violations.length} violation(s):`));
      for (const v of result.violations) {
        console.log(`  - [${v.impact.toUpperCase()}] ${v.rule}: ${v.description} (${v.file}:${v.line || 1})`);
        console.log(`    Fix: ${v.suggestedFix}`);
      }
    }
  });

// 9.6 visual-diff
program
  .command('visual-diff')
  .description('Compare UI screenshots with baseline for visual regression')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const result = await engine.compareVisuals();
    console.log(pc.bold(pc.cyan('\n👁️ Visual Regression Report:')));
    console.log(`Total Snapshots: ${result.totalSnapshots}`);
    console.log(`Matching: ${result.matchingSnapshots} | Mismatches: ${result.mismatchedSnapshots} | New: ${result.newSnapshots}`);
  });

// 9.7 contract-drift
program
  .command('contract-drift')
  .description('Detect API contract drift between OpenAPI specs and code')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const result = await engine.checkContractDrift();
    console.log(pc.bold(pc.cyan(`\n📑 Contract Drift Compatibility Score: ${result.compatibilityScore}%`)));
    console.log(`Checked Endpoints: ${result.totalEndpointsChecked} | Drifts Found: ${result.driftDetectedCount}`);
    for (const d of result.drifts) {
      console.log(`  - [${d.severity.toUpperCase()}] ${d.method} ${d.endpoint}: ${d.description}`);
    }
  });

// 9.8 sandbox
program
  .command('sandbox')
  .option('-p, --port <port>', 'Sandbox port', '8089')
  .description('Launch an ephemeral mock DB & environment sandbox')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const sandbox = await engine.startSandbox(parseInt(opts.port, 10));
    console.log(pc.bold(pc.green(`\n🛡️ QAForge Ephemeral Mock Sandbox started at ${sandbox.baseURL}`)));
    console.log('Available mock collections: /api/users, /api/orders, /api/products');
    console.log('Press Ctrl+C to terminate sandbox.');
  });

// 9.9 watch
program
  .command('watch')
  .description('Start interactive real-time test watch mode')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan('\n👀 QAForge Watch Mode active. Listening for file changes...')));
    engine.watch((info) => {
      const statusColor = info.status === 'passed' ? pc.green : pc.red;
      console.log(`\n[${new Date().toLocaleTimeString()}] Changed: ${info.changedFile}`);
      console.log(`Impacted tests: ${info.impactedTests.join(', ')} -> ${statusColor(info.status.toUpperCase())}`);
    });
  });

// 9.10 lint
program
  .command('lint')
  .description('Run ESLint and static code quality checks')
  .option('-s, --scope <scope>', 'Scope (all, changed, paths)', 'all')
  .option('--fix', 'Automatically fix lint errors where possible')
  .option('-p, --paths <paths...>', 'Specific paths to lint')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const report = await engine.lint({ scope: opts.scope, fix: opts.fix, paths: opts.paths });

    const statusColor = report.passed ? pc.green : pc.red;
    console.log(pc.bold(statusColor(`\n=== Static Code Lint (${report.linterType}): ${report.passed ? 'PASSED' : 'FAILED'} ===`)));
    console.log(`Files Checked: ${report.checkedFilesCount} | Errors: ${pc.red(report.totalErrors)} | Warnings: ${pc.yellow(report.totalWarnings)} | Fixable: ${pc.cyan(report.fixableCount)}`);

    if (report.messages.length > 0) {
      console.log(pc.bold('\nMessages:'));
      for (const msg of report.messages.slice(0, 15)) {
        const sevColor = msg.severity === 'error' ? pc.red : pc.yellow;
        console.log(`  ${sevColor(`[${msg.severity.toUpperCase()}]`)} ${msg.filePath}:${msg.line}:${msg.column} - ${msg.message} (${pc.dim(msg.ruleId)})`);
      }
      if (report.messages.length > 15) {
        console.log(pc.dim(`  ... and ${report.messages.length - 15} more messages.`));
      }
    }
  });

// 9.11 audit
program
  .command('audit')
  .description('Run local CVE vulnerability scan and detect hardcoded secrets')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const report = engine.auditSecurity();
    const scoreColor = report.score > 80 ? pc.green : report.score > 50 ? pc.yellow : pc.red;

    console.log(pc.bold(scoreColor(`\n🛡️ QAForge Security Audit Score: ${report.score}/100`)));
    console.log(`Dependencies Scanned: ${report.dependenciesScanned} | Total Issues: ${report.totalVulnerabilities}`);
    console.log(`Critical: ${pc.red(report.criticalCount)} | High: ${pc.red(report.highCount)} | Moderate: ${pc.yellow(report.moderateCount)} | Low: ${pc.cyan(report.lowCount)}`);

    for (const v of report.vulnerabilities) {
      console.log(`\n  ✖ [${v.severity.toUpperCase()}] ${v.packageName} (${v.installedVersion}) - ${v.title}`);
      console.log(`    Recommendation: ${pc.green(v.recommendation)} (${v.cveId || 'Security Check'})`);
    }
  });

// 9.12 perf
program
  .command('perf')
  .description('Audit Core Web Vitals and route performance metrics')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const report = await engine.profilePerf();
    const rColor = report.rating === 'EXCELLENT' ? pc.green : report.rating === 'GOOD' ? pc.cyan : pc.yellow;

    console.log(pc.bold(rColor(`\n⚡ QAForge Performance Score: ${report.overallScore}/100 (${report.rating})`)));
    console.log(`Routes Profiled: ${report.totalRoutesProfiled}`);

    for (const m of report.metrics) {
      console.log(`\n  📍 Route: ${pc.bold(m.routePath)} [${m.rating}]`);
      console.log(`     LCP: ${m.estimatedLcpMs}ms | FID: ${m.estimatedFidMs}ms | CLS: ${m.estimatedClsScore} | TTFB: ${m.ttfbMs}ms | Bundle: ${m.bundleSizeKb}KB`);
      for (const rec of m.recommendations) {
        console.log(`     Tip: ${pc.dim(rec)}`);
      }
    }
  });

// 9.13 mock-gen
program
  .command('mock-gen')
  .description('Generate Mock Service Worker (MSW) network mock handlers')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const result = await engine.generateMsw();
    console.log(pc.bold(pc.green(`\n✔ Generated MSW Network Mock Handlers:`)));
    console.log(`Output Directory: ${result.outputDir} (${result.totalHandlers} mock endpoints)`);
    for (const f of result.generatedFiles) {
      console.log(`  + ${f.relativePath}`);
    }
  });

// 9.14 quarantine
program
  .command('quarantine')
  .description('Isolate and quarantine flaky tests from braking CI pipelines')
  .option('-t, --threshold <threshold>', 'Flakiness rate threshold', parseFloat, 0.25)
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const result = engine.quarantineFlaky(opts.threshold);
    console.log(pc.bold(pc.cyan(`\n🚷 QAForge Flaky Test Quarantine:`)));
    console.log(`Quarantined Tests: ${pc.yellow(result.activeQuarantineCount)}`);
    for (const q of result.quarantinedTests) {
      console.log(`  - ${q.testTitle} in ${q.testFile} (${Math.round(q.flakinessRate * 100)}% flakiness)`);
    }
  });

// 9.15 coverage
program
  .command('coverage')
  .description('Generate PRD requirements coverage heatmap matrix')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const report = await engine.getCoverageHeatmap();
    console.log(pc.bold(pc.cyan(`\n📊 Requirements Coverage Heatmap: ${report.overallCoverageScore}%`)));
    console.log(`Full: ${pc.green(report.fullCount)} | Partial: ${pc.yellow(report.partialCount)} | Uncovered: ${pc.red(report.uncoveredCount)}`);
    for (const item of report.items.slice(0, 10)) {
      console.log(`  [${item.coverageLevel}] ${item.id}: ${item.title} (Pass Rate: ${item.passRate}%)`);
    }
  });

// 9.16 tui
program
  .command('tui')
  .description('Open interactive Terminal Command Center')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    await engine.renderTui();
  });

// 9.17 run-collection
program
  .command('run-collection <collectionFile>')
  .description('Run Postman Collection v2.1/v2.0 test suite locally')
  .option('-e, --env <envFile>', 'Postman environment JSON file')
  .option('-u, --base-url <url>', 'Base URL for requests')
  .action(async (collectionFile, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\n🚀 Executing Postman Collection: ${collectionFile}`));
    const result = await engine.runPostmanCollection(collectionFile, opts.env, opts.baseUrl);

    const statusColor = result.failedCount === 0 ? pc.green : pc.red;
    console.log(pc.bold(statusColor(`\n=== Collection Run: ${result.collectionName} (${result.passedCount}/${result.totalRequests} Passed) in ${result.totalDurationMs}ms ===`)));

    for (const step of result.steps) {
      const stepColor = step.status === 'passed' ? pc.green : pc.red;
      console.log(`  ${stepColor(step.status === 'passed' ? '✔' : '✖')} [${step.method}] ${step.name} -> HTTP ${step.httpStatus} (${step.durationMs}ms)`);
      if (step.errorMessage) {
        console.log(`    ${pc.red(step.errorMessage)}`);
      }
    }
  });

// 9.18 export-postman
program
  .command('export-postman')
  .description('Export discovered routes and APIs to Postman Collection v2.1 JSON')
  .option('-o, --output <outputFile>', 'Output file path', 'qaforge_postman_collection.json')
  .option('-n, --name <name>', 'Collection name')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const res = await engine.exportPostmanCollection(opts.output, opts.name);
    console.log(pc.bold(pc.green(`\n✔ Exported Postman Collection to: ${res.savedPath}`)));
    console.log(`Total Requests Exported: ${res.collection.item.reduce((acc, it) => acc + (it.item?.length || 1), 0)}`);
  });

// 9.19 request
program
  .command('request <method> <url>')
  .description('Send an ad-hoc HTTP request like Postman and inspect response')
  .option('-H, --header <headers...>', 'Headers in Key:Value format')
  .option('-d, --data <data>', 'JSON body or raw payload')
  .action(async (method, url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const headers: Record<string, string> = {};
    if (opts.header) {
      for (const h of opts.header) {
        const [k, ...v] = h.split(':');
        if (k) headers[k.trim()] = v.join(':').trim();
      }
    }

    let bodyPayload: any = opts.data;
    if (bodyPayload) {
      try {
        bodyPayload = JSON.parse(bodyPayload);
      } catch {}
    }

    console.log(pc.cyan(`\nSending [${method.toUpperCase()}] ${url}...`));
    const res = await engine.sendHttpRequest({
      method: method.toUpperCase() as any,
      url,
      headers,
      body: bodyPayload
    });

    const statusColor = res.status >= 200 && res.status < 400 ? pc.green : pc.red;
    console.log(pc.bold(statusColor(`\nHTTP ${res.status} ${res.statusText} (${res.durationMs}ms, ${res.sizeBytes} bytes)`)));
    console.log(pc.bold('Response Body:'));
    console.log(typeof res.body === 'object' ? JSON.stringify(res.body, null, 2) : res.rawText);
  });

// 9.20 load-test
program
  .command('load-test <url>')
  .description('Run local load & stress testing on HTTP/API endpoint')
  .option('-m, --method <method>', 'HTTP method (GET, POST, etc.)', 'GET')
  .option('-u, --vus <vus>', 'Number of concurrent Virtual Users', parseInt, 10)
  .option('-d, --duration <sec>', 'Duration in seconds', parseInt, 5)
  .action(async (url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n⚡ Starting Load & Stress Test against: ${url}`)));
    console.log(`Virtual Users: ${pc.yellow(opts.vus)} | Duration: ${pc.yellow(opts.duration + 's')} | Method: ${opts.method}`);

    const report = await engine.runLoadTest({
      url,
      method: opts.method.toUpperCase(),
      vus: opts.vus,
      durationSec: opts.duration
    });

    const statusColor = report.status === 'PASSED' ? pc.green : report.status === 'DEGRADED' ? pc.yellow : pc.red;
    console.log(pc.bold(statusColor(`\n=== Load Test Status: ${report.status} ===`)));
    console.log(`Requests: ${pc.bold(report.totalRequests)} (${pc.green(report.successfulRequests)} OK / ${pc.red(report.failedRequests)} Fail)`);
    console.log(`Throughput: ${pc.bold(report.requestsPerSecond)} req/s | Bandwidth: ${Math.round(report.bytesPerSecond / 1024)} KB/s`);
    console.log(`Error Rate: ${report.errorRatePercent > 0 ? pc.red(report.errorRatePercent + '%') : pc.green('0%')}`);
    console.log(`Latency: Avg: ${report.latency.avg}ms | p50: ${report.latency.p50}ms | p90: ${report.latency.p90}ms | p95: ${report.latency.p95}ms | p99: ${report.latency.p99}ms | Max: ${report.latency.max}ms`);
  });

// 9.21 mock-data
program
  .command('mock-data')
  .description('Generate realistic mock test data (users, orders, products, addresses, arabic_user)')
  .option('-p, --preset <preset>', 'Preset template (user, order, product, address, payment, auth, arabic_user)', 'user')
  .option('-c, --count <count>', 'Number of records to generate', parseInt, 3)
  .option('-l, --locale <locale>', 'Locale (en, ar)', 'en')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const data = engine.generateMockData({
      preset: opts.preset as any,
      count: opts.count,
      locale: opts.locale as any
    });
    console.log(pc.bold(pc.green(`\n✔ Generated ${opts.count} record(s) with preset "${opts.preset}":`)));
    console.log(JSON.stringify(data, null, 2));
  });

// 9.22 owasp-scan
program
  .command('owasp-scan <url>')
  .description('Run local OWASP Top 10 security & headers audit on endpoint')
  .action(async (url) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🛡️ Running OWASP Top 10 Security Audit against: ${url}`)));
    const report = await engine.scanOwasp(url);

    const scoreColor = report.overallScore >= 80 ? pc.green : report.overallScore >= 60 ? pc.yellow : pc.red;
    console.log(pc.bold(scoreColor(`\n=== OWASP Security Rating: Grade ${report.grade} (${report.overallScore}/100) ===`)));
    console.log(`Checks Passed: ${pc.green(report.passedChecks)} / ${report.totalChecks}`);

    for (const p of report.probes) {
      const pColor = p.passed ? pc.green : p.severity === 'HIGH' ? pc.red : pc.yellow;
      console.log(`  ${pColor(p.passed ? '✔' : '✖')} [${p.severity}] ${p.title}`);
      if (!p.passed) {
        console.log(`    Evidence: ${pc.dim(p.evidence || '')}`);
        console.log(`    Remediation: ${pc.cyan(p.remediation)}`);
      }
    }
  });

// 9.23 graphql
program
  .command('graphql <endpoint> <query>')
  .description('Execute and test GraphQL query or mutation')
  .action(async (endpoint, query) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nExecuting GraphQL against ${endpoint}...`));
    const res = await engine.runGraphQL({ endpoint, query });
    if (res.status === 'passed') {
      console.log(pc.bold(pc.green(`\n✔ GraphQL Query Passed (${res.durationMs}ms):`)));
      console.log(JSON.stringify(res.data, null, 2));
    } else {
      console.log(pc.bold(pc.red(`\n✖ GraphQL Query Failed: ${res.errorMessage}`)));
      if (res.errors) console.log(JSON.stringify(res.errors, null, 2));
    }
  });

// 9.24 ws-test
program
  .command('ws-test <url>')
  .description('Test WebSocket connection and message handshake')
  .option('-m, --message <msg>', 'Message to send on open')
  .action(async (url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nConnecting to WebSocket: ${url}...`));
    const res = await engine.testWebSocket({
      url,
      messagesToSend: opts.message ? [opts.message] : undefined
    });
    if (res.connected) {
      console.log(pc.bold(pc.green(`\n✔ WebSocket Connected Successfully (${res.handshakeDurationMs}ms)`)));
      console.log(`Messages Received: ${res.messagesReceived.length}`);
    } else {
      console.log(pc.bold(pc.red(`\n✖ WebSocket Failed: ${res.errorMessage}`)));
    }
  });

// 9.25 remote-init
program
  .command('remote-init')
  .description('Generate drop-in companion probe file to connect a live website to local QAForge')
  .option('-t, --type <type>', 'Probe type: standalone_js, nextjs_route, express_middleware, html_snippet', 'standalone_js')
  .option('-n, --name <name>', 'Remote site display name', 'LiveApp')
  .option('-o, --out <path>', 'Save probe to local file directly')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const snippet = engine.generateRemoteProbe(opts.type as any, { siteName: opts.name });

    console.log(pc.bold(pc.cyan(`\n⚡ QAForge Live Remote Companion Probe Generated:`)));
    console.log(pc.bold(`Recommended File: `) + pc.yellow(snippet.filename));
    console.log(pc.bold(`Instructions: `) + snippet.instructions);

    if (opts.out) {
      const targetPath = engine.guard.resolveSafePath(opts.out);
      fs.writeFileSync(targetPath, snippet.code, 'utf8');
      console.log(pc.bold(pc.green(`✔ Saved probe file directly to: ${targetPath}`)));
    } else {
      console.log(pc.dim('\n--- Probe Code Snippet ---'));
      console.log(snippet.code);
      console.log(pc.dim('--------------------------'));
    }
  });

// 9.26 remote-connect
program
  .command('remote-connect <url>')
  .description('Establish and test authenticated link with live remote website')
  .option('-s, --secret <token>', 'Secret authentication token')
  .action(async (url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nEstablishing link with live website: ${url}...`));
    const handshake = await engine.connectRemoteSite(url, opts.secret);

    if (handshake.connected) {
      console.log(pc.bold(pc.green(`\n✔ LINK ESTABLISHED: ${handshake.siteName} (${handshake.environment})`)));
      console.log(`Server Time: ${handshake.serverTime} | Uptime: ${handshake.uptimeSeconds || 0}s`);
      if (handshake.nodeVersion) console.log(`Runtime: Node ${handshake.nodeVersion}`);
      console.log(`Live Routes Discovered: ${pc.bold(handshake.routesDiscovered.length)}`);
      if (handshake.routesDiscovered.length > 0) {
        console.log(`  ` + handshake.routesDiscovered.slice(0, 10).join(', '));
      }
      if (handshake.recentErrors.length > 0) {
        console.log(pc.yellow(`\n⚠ Captured ${handshake.recentErrors.length} live runtime exception(s) from server!`));
      }
    } else {
      console.log(pc.bold(pc.red(`\n✖ Connection Failed: ${handshake.statusMessage}`)));
      console.log(pc.dim(`Tip: Run "npx qaforge remote-init" to generate the companion probe for your live site.`));
    }
  });

// 9.27 remote-audit
program
  .command('remote-audit <url>')
  .description('Execute full live remote QA, OWASP security, and health audit on live URL')
  .option('--load', 'Include live load and stress testing benchmark')
  .option('-u, --vus <vus>', 'Virtual users for load test', parseInt, 8)
  .option('-s, --secret <token>', 'Optional bridge secret token')
  .action(async (url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🌐 Running Full Live Remote Audit on: ${url}`)));

    const report = await engine.auditRemoteSite(url, {
      includeLoadTest: Boolean(opts.load),
      loadVus: opts.vus,
      bridgeSecret: opts.secret
    });

    const vColor = report.verdict === 'HEALTHY' ? pc.green : report.verdict === 'DEGRADED' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Live Remote Audit Verdict: ${report.verdict} (${report.overallHealthScore}/100) ===`)));
    console.log(`Target Status: ${report.reachability.isOnline ? pc.green('ONLINE (' + report.reachability.status + ')') : pc.red('OFFLINE')} | Latency: ${report.reachability.responseTimeMs}ms`);
    console.log(`Discovered Live Elements: ${pc.bold(report.discoveredLinks.length)} links | ${pc.bold(report.discoveredForms.length)} forms`);
    console.log(`OWASP Security Rating: Grade ${report.owaspReport.grade} (${report.owaspReport.overallScore}/100)`);

    if (report.loadBenchmark) {
      console.log(`Load Throughput: ${report.loadBenchmark.requestsPerSecond} req/s | p95 Latency: ${report.loadBenchmark.latency.p95}ms | Error: ${report.loadBenchmark.errorRatePercent}%`);
    }

    console.log(`\nSummary: ${report.summary}`);
  });

// 9.28 record-scenario
program
  .command('record-scenario <title>')
  .description('Synthesize resilient Playwright E2E scenario from start URL')
  .option('-u, --url <url>', 'Starting page URL', 'http://localhost:3000')
  .option('-o, --out <path>', 'Destination test file path')
  .action(async (title, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nSynthesizing recorded E2E journey: "${title}"...`));
    const scenario = engine.recordScenario({
      title,
      startUrl: opts.url,
      framework: 'playwright',
      steps: [
        { type: 'navigate', url: opts.url, description: 'Open home view' },
        { type: 'assert_visible', selector: 'body', description: 'Ensure page rendered' }
      ],
      outputFile: opts.out
    });

    console.log(pc.bold(pc.green(`✔ Synthesized scenario (${scenario.stepsCount} steps):`)));
    if (scenario.savedPath) {
      console.log(`Saved to: ${pc.bold(scenario.savedPath)}`);
    } else {
      console.log(scenario.code);
    }
  });

// 9.29 stabilize
program
  .command('stabilize <file>')
  .description('Audit and refactor flaky test files (auto-wait and web-first assertions)')
  .option('--fix', 'Save refactored code directly to file', false)
  .action(async (file, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nAuditing test flakiness patterns in: ${file}...`));
    const result = engine.stabilizeTests(file, opts.fix);

    if (result.issuesFound === 0) {
      console.log(pc.bold(pc.green(`✔ Clean! No flakiness anti-patterns detected.`)));
    } else {
      console.log(pc.bold(pc.yellow(`⚠ Found ${result.issuesFound} flakiness issue(s):`)));
      for (const iss of result.issues) {
        console.log(`  Line ${iss.line}: [${pc.red(iss.type)}] ${pc.dim(iss.snippet)}`);
        console.log(`    Fix: ${pc.cyan(iss.recommendation)}`);
      }
      if (opts.fix) {
        console.log(pc.bold(pc.green(`\n✔ Applied auto-waiting repairs directly to file!`)));
      } else {
        console.log(pc.dim(`Tip: Run with --fix to apply refactoring automatically.`));
      }
    }
  });

// 9.30 db-snapshot
program
  .command('db-snapshot <name> [files...]')
  .description('Create an isolated snapshot of database / fixture files')
  .action(async (name, files) => {
    const engine = new QAForgeEngine(process.cwd());
    const targetFiles = files && files.length > 0 ? files : ['package.json'];
    console.log(pc.cyan(`\nCreating snapshot "${name}" for files: ${targetFiles.join(', ')}...`));
    const meta = engine.createDbSnapshot(name, targetFiles);
    console.log(pc.bold(pc.green(`✔ Snapshot created: ${meta.id} (${meta.totalBytes} bytes, ${meta.targetFiles.length} files)`)));
  });

// 9.31 db-restore
program
  .command('db-restore <snapshotId>')
  .description('Restore database / fixture files from snapshot ID')
  .action(async (snapshotId) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nRestoring state from snapshot: ${snapshotId}...`));
    const res = engine.restoreDbSnapshot(snapshotId);
    if (res.success) {
      console.log(pc.bold(pc.green(`✔ State successfully restored! (${res.restoredFiles.length} files restored)`)));
    } else {
      console.log(pc.bold(pc.red(`✖ Restore failed: ${res.error}`)));
    }
  });

// 9.32 auto-fix
program
  .command('auto-fix')
  .description('Synthesize code repair patches from latest test diagnostics')
  .option('--apply', 'Apply patch repairs directly to source code', false)
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nSynthesizing code repairs from diagnostic engine...`));
    const report = await engine.autoFixBugs(opts.apply);

    if (report.patches.length === 0) {
      console.log(pc.green(`✔ No application bugs require automated patching.`));
    } else {
      console.log(pc.bold(pc.yellow(`\nSynthesized ${report.patches.length} patch candidate(s):`)));
      for (const p of report.patches) {
        console.log(`\nFile: ${pc.bold(p.targetFile)} (Confidence: ${p.confidence * 100}%)`);
        console.log(`  - ${pc.red(p.originalCodeSnippet)}`);
        console.log(`  + ${pc.green(p.repairedCodeSnippet)}`);
        console.log(`  Reason: ${pc.dim(p.explanation)}`);
      }
      if (opts.apply) {
        console.log(pc.bold(pc.green(`\n✔ Patches applied to source files.`)));
      } else {
        console.log(pc.dim(`Tip: Run with --apply to apply patches directly.`));
      }
    }
  });

// 9.33 export-report
program
  .command('export-report')
  .description('Export standalone single-file executive QA & Security audit report')
  .option('-f, --format <format>', 'Output format: html, json, markdown', 'html')
  .option('-o, --out <path>', 'Destination output file path')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nExporting executive QA report (${opts.format})...`));
    const res = engine.exportReport({
      format: opts.format as any,
      outputPath: opts.out
    });
    console.log(pc.bold(pc.green(`✔ Executive audit report generated (${res.sizeBytes} bytes):`)));
    console.log(`Path: ${pc.bold(res.filePath)}`);
  });

// 9.34 chaos
program
  .command('chaos <url>')
  .description('Run autonomous chaos & edge-case monkey test against HTTP/API endpoint')
  .option('-m, --method <method>', 'HTTP method', 'POST')
  .option('-i, --iterations <count>', 'Number of iterations per chaos strategy', parseInt, 3)
  .action(async (url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🐒 Starting Chaos & Edge-Case Monkey Test on: ${url}`)));

    const report = await engine.runChaosTest({
      targetUrl: url,
      method: opts.method.toUpperCase(),
      iterations: opts.iterations
    });

    const vColor = report.overallVerdict === 'HIGHLY_RESILIENT' ? pc.green : report.overallVerdict === 'DEGRADED' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Chaos Resilience Verdict: ${report.overallVerdict} (${report.resilienceScore}%) ===`)));
    console.log(`Probes: ${pc.bold(report.totalProbes)} Total | ${pc.green(report.resilientCount)} Handled Gracefully | ${pc.red(report.unhandled500Count)} 500 Crashes | ${pc.yellow(report.timeoutCount)} Timeouts`);

    for (const p of report.probes) {
      const pColor = p.resilienceVerdict === 'RESILIENT' ? pc.green : pc.red;
      console.log(`  ${pColor(p.resilienceVerdict === 'RESILIENT' ? '✔' : '✖')} [${p.strategy}] ${p.name} -> ${p.detail}`);
    }
  });

// 9.35 docker-env
program
  .command('docker-env')
  .description('Generate isolated containerized test dependencies (PostgreSQL, Redis, MongoDB, MySQL)')
  .option('-s, --services <services...>', 'Services list (postgres, redis, mongodb, mysql)', ['postgres', 'redis'])
  .option('-o, --out <path>', 'Output docker-compose file path', 'docker-compose.test.yml')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const res = engine.generateDockerEnv({
      services: opts.services,
      outputPath: opts.out
    });
    console.log(pc.bold(pc.green(`\n✔ Generated Docker test environment:`)));
    console.log(`Compose File: ${pc.bold(res.savedComposePath || opts.out)}`);
    console.log(`Services: ${pc.cyan(res.servicesIncluded.join(', '))}`);
    console.log(`\nInstructions:\n${pc.dim(res.instructions)}`);
  });

// 9.36 browser-matrix
program
  .command('browser-matrix')
  .description('Generate multi-browser & mobile viewport Playwright matrix snippet')
  .action(async () => {
    const engine = new QAForgeEngine(process.cwd());
    const matrix = engine.generateBrowserMatrix();
    console.log(pc.bold(pc.green(`\n✔ Generated Cross-Browser Matrix (${matrix.matrixCount} targets):`)));
    console.log(matrix.playwrightProjectsSnippet);
  });

// 9.37 bdd
program
  .command('bdd')
  .description('Generate standard BDD Gherkin .feature files from discovered PRD requirements')
  .option('-o, --out <dir>', 'Output directory for feature files', 'features')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.cyan(`\nExtracting requirements and generating BDD feature specs...`));
    const features = await engine.generateBddFeatures(opts.out);
    console.log(pc.bold(pc.green(`✔ Generated ${features.length} BDD feature file(s) in "${opts.out}":`)));
    for (const f of features) {
      console.log(`  - Feature: ${pc.bold(f.featureName)} (${f.scenarios.length} scenarios) -> ${f.savedPath || 'memory'}`);
    }
  });

// 9.38 alert
program
  .command('alert <webhookUrl>')
  .description('Dispatch latest test run & security verdict alert to Slack, Discord, or Teams')
  .action(async (webhookUrl) => {
    const engine = new QAForgeEngine(process.cwd());
    const { profile } = await engine.inspect();
    const latestRun = engine.storage.getLatestTestRun();
    const secAudit = engine.auditSecurity();

    console.log(pc.cyan(`\nDispatching alert to webhook...`));
    const res = await engine.sendAlert({
      webhookUrl,
      payload: {
        projectName: profile.projectName,
        verdict: latestRun?.status === 'passed' ? 'PASSED' : 'FAILED',
        totalTests: latestRun?.summary.total || 0,
        passedCount: latestRun?.summary.passed || 0,
        failedCount: latestRun?.summary.failed || 0,
        securityIssuesCount: secAudit.totalVulnerabilities,
        score: secAudit.score
      }
    });

    if (res.success) {
      console.log(pc.bold(pc.green(`✔ ${res.message} (${res.durationMs}ms)`)));
    } else {
      console.log(pc.bold(pc.red(`✖ Alert failed: ${res.message}`)));
    }
  });

// 9.39 feature-parity
program
  .command('feature-parity')
  .description('Audit UI-to-Backend parity and detect ghost/unimplemented UI features (Tauri, React, Vue, Express, Python)')
  .option('-e, --e2e', 'Generate Playwright E2E parity test suite', true)
  .action((opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🔍 Scanning UI elements against Backend Handlers & Enums...`)));

    const report = engine.auditFeatureParity({ generateE2ESuite: opts.e2e });

    const statusColor = report.overallStatus === 'FULL_PARITY' ? pc.green : report.overallStatus === 'PARTIAL_GHOSTS_FOUND' ? pc.yellow : pc.red;
    console.log(pc.bold(statusColor(`\n=== UI Feature Parity: ${report.overallStatus} (${report.parityScore}%) ===`)));
    console.log(`UI Features: ${pc.bold(report.totalUiFeaturesFound)} Total | ${pc.green(report.connectedFeaturesCount)} Connected | ${pc.red(report.ghostFeaturesCount)} Ghost/Missing Handlers`);

    if (report.issues.length > 0) {
      console.log(pc.bold(pc.yellow(`\nIdentified ${report.issues.length} Ghost Feature Issue(s):`)));
      for (const issue of report.issues) {
        const iColor = issue.severity === 'CRITICAL' ? pc.red : pc.yellow;
        console.log(`\n  ${iColor(issue.severity === 'CRITICAL' ? '✖' : '⚠')} [${issue.issueType}] ${issue.description}`);
        console.log(`    ${pc.dim('Remediation:')} ${pc.cyan(issue.remediation)}`);
      }
    } else {
      console.log(pc.green(`✔ All discovered UI features are properly bound to backend commands and routes!`));
    }

    if (report.generatedE2ETestCode) {
      console.log(pc.bold(pc.green(`\n✔ Dynamic E2E IPC/API Parity Test Suite Generated:`)));
      console.log(pc.dim(`  Scaffolded tests for ${report.discoveredUiElements.length} UI interactive element(s).`));
    }
  });

// 9.40 scan-malware
program
  .command('scan-malware')
  .description('Deep scan for malicious code, backdoors, obfuscated payloads, and lifecycle script attacks')
  .option('--fix', 'Automatically remediate and neutralize all detected threats', false)
  .action((opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🛡️ Scanning repository files for malware, backdoors, and obfuscation...`)));

    const report = engine.scanMalware();

    const vColor = report.overallVerdict === 'SECURE_CLEAN' ? pc.green : report.overallVerdict === 'THREATS_DETECTED' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Malware & Threat Verdict: ${report.overallVerdict} (Health: ${report.healthScore}/100) ===`)));
    console.log(`Files Scanned: ${pc.bold(report.scannedFilesCount)} | Threats: ${report.threatCount > 0 ? pc.red(report.threatCount) : pc.green(0)} (${pc.red(report.criticalCount)} Critical, ${pc.yellow(report.highCount)} High)`);

    if (report.threats.length === 0) {
      console.log(pc.bold(pc.green(`\n✔ No malicious payloads or backdoors detected in project.`)));
    } else {
      console.log(pc.bold(pc.yellow(`\nDetected Security Threats:`)));
      for (const t of report.threats) {
        const sColor = t.severity === 'CRITICAL' ? pc.red : pc.yellow;
        console.log(`\n  ${sColor(t.severity === 'CRITICAL' ? '✖' : '⚠')} [${t.severity} - ${t.category}] in ${pc.bold(t.file)}:${t.line}`);
        console.log(`    ${pc.dim('Pattern:')} ${pc.red(t.detectedPattern)}`);
        console.log(`    ${pc.dim('Threat:')} ${t.threatDescription}`);
        console.log(`    ${pc.dim('Remediation:')} ${pc.cyan(t.remediation.description)}`);
      }

      if (opts.fix) {
        console.log(pc.bold(pc.cyan(`\nApplying automated remediations...`)));
        const res = engine.remediateMalware();
        if (res.success) {
          console.log(pc.bold(pc.green(`✔ ${res.message}`)));
        } else {
          console.log(pc.yellow(`⚠ ${res.message}`));
        }
      } else {
        console.log(pc.dim(`\nTip: Run "npx qaforge scan-malware --fix" to automatically neutralize and clean all threats.`));
      }
    }
  });

// 9.41 ai-eval
program
  .command('ai-eval <url>')
  .description('Evaluate AI / LLM outputs for hallucinations, keyword grounding, and JSON schema compliance')
  .action(async (url) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🧠 Evaluating AI model accuracy & hallucinations on: ${url}`)));

    const report = await engine.evaluateAiOutputs({
      endpointUrl: url,
      testCases: [
        {
          id: 'TEST-1',
          prompt: 'What is QAForge?',
          expectedKeywords: ['local-first', 'QA', 'autonomous'],
          groundTruthContext: 'QAForge is a 100% local-first autonomous QA testing engine.'
        }
      ]
    });

    const statusColor = report.overallVerdict === 'HIGHLY_ACCURATE' ? pc.green : report.overallVerdict === 'MODERATE_DRIFT' ? pc.yellow : pc.red;
    console.log(pc.bold(statusColor(`\n=== AI Evaluation Verdict: ${report.overallVerdict} (Accuracy: ${report.averageFaithfulnessScore}%) ===`)));
    console.log(`Evaluated: ${pc.bold(report.totalEvaluated)} | Passed: ${pc.green(report.passedCount)} | Hallucinations: ${report.hallucinationCount > 0 ? pc.red(report.hallucinationCount) : pc.green(0)}`);
  });

// 9.42 bisect
program
  .command('bisect')
  .description('Autonomous Git bisect regression hunter to find commit causing test failure')
  .option('-c, --cmd <cmd>', 'Test command to run', 'npm test')
  .option('-m, --max <count>', 'Max commits to examine', parseInt, 10)
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🔍 Running Autonomous Git Bisect Regression Hunter...`)));
    const res = await engine.huntRegression({ testCommand: opts.cmd, maxCommits: opts.max });
    if (res.culpritCommit) {
      console.log(pc.bold(pc.red(`\n✖ Culprit Commit Found: ${res.culpritCommit.commitHash.substring(0, 7)}`)));
      console.log(`  Author: ${pc.bold(res.culpritCommit.author)}`);
      console.log(`  Message: ${pc.yellow(res.culpritCommit.message)}`);
    } else {
      console.log(pc.bold(pc.green(`\n✔ ${res.summary}`)));
    }
  });

// 9.43 throttle
program
  .command('throttle <url>')
  .description('Simulate network latency, 3G/GPRS, or offline conditions')
  .option('-p, --profile <profile>', 'Profile: GPRS_SLOW, REGULAR_3G, GOOD_4G, OFFLINE_DROP, PACKET_LOSS', 'REGULAR_3G')
  .action(async (url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n📶 Throttling network to ${opts.profile} for: ${url}`)));
    const res = await engine.throttleRequest({
      targetUrl: url,
      profile: opts.profile as any
    });
    console.log(pc.bold(res.passed ? pc.green(`✔ ${res.detail}`) : pc.red(`✖ ${res.detail}`)));
  });

// 9.44 audit-contracts
program
  .command('audit-contracts')
  .description('Audit Solidity & Web3 smart contracts for reentrancy, selfdestruct, and vulnerabilities')
  .action(() => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n⛓️ Auditing Smart Contracts & Web3 code for vulnerabilities...`)));
    const rep = engine.auditSmartContracts();
    const vColor = rep.overallVerdict === 'SECURE' ? pc.green : rep.overallVerdict === 'AUDIT_WARNINGS' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Smart Contract Audit: ${rep.overallVerdict} (${rep.securityScore}/100) ===`)));
    console.log(`Contracts Scanned: ${pc.bold(rep.scannedFilesCount)} | Issues: ${rep.issues.length > 0 ? pc.red(rep.issues.length) : pc.green(0)}`);
    for (const iss of rep.issues) {
      console.log(`  - [${iss.severity}] in ${pc.bold(iss.file)}:${iss.line}: ${iss.description}`);
    }
  });

// 9.45 dead-assets
program
  .command('dead-assets')
  .description('Scan and purge unused image assets, fonts, and dead code')
  .option('--purge', 'Purge and delete unreferenced dead assets', false)
  .action((opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🧹 Scanning for unreferenced images, fonts, and dead assets...`)));
    if (opts.purge) {
      const del = engine.purgeDeadAssets();
      console.log(pc.bold(pc.green(`✔ Purged ${del.deletedFiles.length} dead asset(s) (~${Math.round(del.bytesFreed / 1024)} KB freed).`)));
    } else {
      const rep = engine.scanDeadAssets();
      console.log(pc.bold(pc.green(`\n✔ ${rep.summary}`)));
      for (const it of rep.unusedItems) {
        console.log(`  - [${it.type}] ${pc.bold(it.identifier)} in ${it.file} (${Math.round((it.sizeBytes || 0) / 1024)} KB)`);
      }
      console.log(pc.dim(`Tip: Run "npx qaforge dead-assets --purge" to delete these files.`));
    }
  });

// 9.46 screen-reader
program
  .command('screen-reader')
  .description('Simulate screen reader auditory speech flow, verify heading hierarchy and accessibility tags')
  .action(() => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🎙️ Simulating screen reader speech flow & accessibility auditory checks...`)));
    const rep = engine.simulateScreenReader();
    const vColor = rep.verdict === 'EXCELLENT' ? pc.green : rep.verdict === 'GOOD' ? pc.cyan : rep.verdict === 'NEEDS_IMPROVEMENT' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Screen Reader Simulation: ${rep.verdict} (${rep.readabilityScore}/100) ===`)));
    console.log(`Scanned Elements: ${pc.bold(rep.totalElementsScanned)} | Interactive: ${pc.bold(rep.interactiveElements)} | Issues: ${rep.issues.length}`);
    for (const item of rep.speechFlow.slice(0, 8)) {
      console.log(`  ${pc.dim(`[#${item.index}]`)} 🗣️ "${pc.bold(item.spokenText)}" (${item.tagName})`);
    }
    if (rep.speechFlow.length > 8) console.log(pc.dim(`  ... and ${rep.speechFlow.length - 8} more elements.`));
    for (const iss of rep.issues) {
      console.log(`  ${iss.severity === 'CRITICAL' ? pc.red('✖') : pc.yellow('⚠')} [${iss.severity}] ${iss.message} (${iss.file})`);
    }
  });

// 9.47 db-audit
program
  .command('db-audit')
  .description('Audit source code for SQL N+1 queries in loops, unindexed queries, and raw string concatenation')
  .action(() => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🗄️ Auditing database query patterns for SQL N+1 and performance bottlenecks...`)));
    const rep = engine.auditDbQueries();
    const vColor = rep.verdict === 'OPTIMIZED' ? pc.green : rep.verdict === 'ACCEPTABLE' ? pc.cyan : rep.verdict === 'NEEDS_OPTIMIZATION' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Database Query Audit: ${rep.verdict} (${rep.efficiencyScore}/100) ===`)));
    console.log(`Files Analyzed: ${pc.bold(rep.filesAnalyzed)} | Total Invocations: ${pc.bold(rep.totalDbInvocations)} | Issues: ${rep.totalIssues}`);
    for (const iss of rep.issues) {
      console.log(`  ${iss.severity === 'CRITICAL' ? pc.red('✖') : pc.yellow('⚠')} [${iss.category}] in ${pc.bold(iss.file)}:${iss.line}`);
      console.log(`    ${pc.dim(iss.description)}`);
      console.log(`    💡 ${pc.green(iss.remediationAdvice)}`);
    }
  });

// 9.48 env-drift
program
  .command('env-drift')
  .description('Audit .env configuration files, compare with .env.example, and detect undeclared variables')
  .option('--generate-example', 'Generate synchronized .env.example template', false)
  .action((opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n⚖️ Auditing environment configuration and secret drift...`)));
    const rep = engine.auditEnvDrift({ generateExample: opts.generateExample });
    const vColor = rep.verdict === 'SYNCHRONIZED' ? pc.green : rep.verdict === 'MINOR_DRIFT' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Environment Config Audit: ${rep.verdict} (${rep.healthScore}/100) ===`)));
    console.log(`Scanned Env Files: ${rep.scannedEnvFiles.map(f => f.fileName).join(', ') || 'None'}`);
    console.log(`Missing in Active .env: ${rep.missingInActive.length > 0 ? pc.red(rep.missingInActive.join(', ')) : pc.green('None')}`);
    console.log(`Undeclared in .env: ${rep.undeclaredInEnv.length > 0 ? pc.yellow(rep.undeclaredInEnv.join(', ')) : pc.green('None')}`);
    for (const iss of rep.issues) {
      console.log(`  ${iss.severity === 'CRITICAL' ? pc.red('✖') : pc.yellow('⚠')} [${iss.type}] ${iss.message}`);
    }
  });

// 9.49 replay
program
  .command('replay')
  .description('Record and view failure replay simulation for tests')
  .option('-t, --title <title>', 'Test title', 'Sample Login Test')
  .option('-f, --file <file>', 'Test file', 'tests/e2e/auth.spec.ts')
  .option('-m, --message <msg>', 'Error message', 'Timeout 5000ms waiting for locator .dashboard-header')
  .action((opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🎬 Generating failure visual replay package...`)));
    const rep = engine.recordFailureReplay({
      testTitle: opts.title,
      testFile: opts.file,
      errorMessage: opts.message,
      saveToFile: true
    });
    console.log(pc.bold(pc.green(`✔ Failure replay package generated: ${rep.id}`)));
    console.log(`Duration: ${rep.totalDurationMs}ms | Failed at Step: #${rep.failedStepIndex}`);
    if (rep.suggestedFixLocator) {
      console.log(`💡 Suggested Selector Repair: ${pc.cyan(rep.suggestedFixLocator)}`);
    }
  });

// 9.50 rate-limit
program
  .command('rate-limit <url>')
  .description('Audit API rate limiting enforcement and DoS resilience threshold')
  .option('-n, --count <count>', 'Number of probe requests', '30')
  .option('-c, --concurrency <concurrency>', 'Concurrency level', '10')
  .option('-m, --method <method>', 'HTTP Method', 'GET')
  .action(async (url, opts) => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n⏱️ Probing ${url} for rate limiting & burst resilience (${opts.count} requests, ${opts.concurrency} concurrent)...`)));
    const rep = await engine.auditRateLimit({
      targetUrl: url,
      requestCount: parseInt(opts.count, 10),
      concurrency: parseInt(opts.concurrency, 10),
      method: opts.method
    });
    const vColor = rep.verdict === 'STRONG_PROTECTION' || rep.verdict === 'BASIC_PROTECTION' ? pc.green : pc.red;
    console.log(pc.bold(vColor(`\n=== Rate Limiting Audit: ${rep.verdict} (${rep.resilienceScore}/100) ===`)));
    console.log(`2xx Success: ${pc.green(rep.successful2xxCount)} | 429 Throttled: ${pc.cyan(rep.rateLimited429Count)} | 5xx Errors: ${rep.serverError5xxCount > 0 ? pc.red(rep.serverError5xxCount) : pc.green(0)}`);
    for (const rec of rep.recommendations) {
      console.log(`  💡 ${rec}`);
    }
  });

// 9.51 mock-server
program
  .command('mock-server')
  .description('Start local stateful in-memory CRUD REST mock server')
  .option('-p, --port <port>', 'Port number', '4040')
  .action(async (opts) => {
    const engine = new QAForgeEngine(process.cwd());
    const port = parseInt(opts.port, 10);
    console.log(pc.bold(pc.cyan(`\n🔄 Starting QAForge Stateful Dynamic Mock Server on port ${port}...`)));
    const res = await engine.startStatefulMock({ port });
    console.log(pc.bold(pc.green(`✔ Stateful Mock Server running at http://localhost:${res.port}`)));
    console.log(`Available Collections: ${pc.bold(res.collections.join(', '))}`);
    console.log(pc.dim(`Endpoints: GET /api/:resource, POST /api/:resource, PUT /api/:resource/:id, DELETE /api/:resource/:id`));
    console.log(pc.dim(`Press Ctrl+C to stop.`));
  });

// 9.52 arch-graph
program
  .command('arch-graph')
  .description('Generate architecture topology graph and microservices dependency map')
  .action(() => {
    const engine = new QAForgeEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🗺️ Generating microservices & architecture dependency graph...`)));
    const rep = engine.generateArchitectureGraph();
    console.log(pc.bold(pc.green(`\n=== Architecture Topology: ${rep.nodesCount} Nodes | ${rep.edgesCount} Connections ===`)));
    console.log(`Databases: ${rep.summary.databases.join(', ') || 'Local Store'}`);
    console.log(`External Integrations: ${rep.summary.externalIntegrations.join(', ') || 'None'}`);
    console.log(`\n${pc.cyan(rep.mermaidDiagram)}`);
  });









// 10. mcp
program
  .command('mcp')
  .description('Start QAForge MCP Server over stdio')
  .action(async () => {
    await runMcpServer(process.cwd());
  });

program.parse(process.argv);
