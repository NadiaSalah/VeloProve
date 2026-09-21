#!/usr/bin/env node

import { Command, Help } from 'commander';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VeloProveEngine } from '../application/engine.js';
import { runMcpServer } from '../mcp/server.js';
import { DEFAULT_CONFIG } from '../shared/config-loader.js';
import { renderVeloProveBanner, renderCommandHeader, renderBox } from './banner.js';
import { createSpinner } from './spinner.js';
import { promptInitQuestions } from './prompts.js';
import { linkAiEditors, resolveAiLinkPolicy, MCP_SNIPPET, editorsWithHints } from '../application/ai-link.js';
import { ReportSummaryService } from '../application/report-summary-service.js';
import {
  ALIAS_HELP_NOTE,
  DAILY_10_COMMANDS,
  HELP_GROUP_ORDER,
  groupForCommand,
  type HelpGroupId
} from './help-groups.js';
import { msg } from './messages.js';
import { getPackageVersion } from '../shared/package-meta.js';

const program = new Command();
const defaultHelp = new Help();

function resolveTargetUrl(
  positional: string | undefined,
  optionUrl: string | undefined,
  fallback?: string
): string | undefined {
  return positional || optionUrl || fallback;
}

program
  .name('veloprove')
  .description('Local-First Agentic QA & Automated Testing Toolkit')
  .version(getPackageVersion())
  .configureHelp({
    formatHelp(cmd, helper) {
      if (cmd.parent) {
        return defaultHelp.formatHelp(cmd, helper);
      }

      const lines: string[] = [];
      // Banner + grouped command listing (flat command count unchanged).
      lines.push(renderVeloProveBanner().trimEnd());
      lines.push('');
      lines.push(`Usage: ${helper.commandUsage(cmd)}`);
      lines.push('');
      lines.push(helper.commandDescription(cmd) || cmd.description());
      lines.push('');
      lines.push('Daily-10: ' + DAILY_10_COMMANDS.map((c) => pc.cyan(c)).join(', '));
      lines.push(pc.dim(ALIAS_HELP_NOTE));

      const opts = helper.visibleOptions(cmd);
      if (opts.length) {
        lines.push('');
        lines.push('Options:');
        for (const opt of opts) {
          lines.push(`  ${helper.optionTerm(opt).padEnd(28)}${helper.optionDescription(opt)}`);
        }
      }

      const cmds = helper.visibleCommands(cmd);
      const buckets = new Map<HelpGroupId, typeof cmds>();
      for (const g of HELP_GROUP_ORDER) buckets.set(g, []);
      for (const c of cmds) {
        const g = groupForCommand(c.name());
        buckets.get(g)!.push(c);
      }

      for (const g of HELP_GROUP_ORDER) {
        const list = buckets.get(g) || [];
        if (!list.length) continue;
        lines.push('');
        lines.push(`${g}:`);
        for (const c of list) {
          const term = helper.subcommandTerm(c);
          lines.push(`  ${term.padEnd(28)}${helper.subcommandDescription(c)}`);
        }
      }

      lines.push('');
      return lines.join('\n');
    }
  });

// 1. init
program
  .command('init')
  .description('Initialize VeloProve configuration, directory structure, and scripts in project')
  .option('-y, --yes', 'Skip confirmations and use sensible defaults', false)
  .option('--mcp', 'Deprecated alias for --link-ai', false)
  .option('--link-ai', 'Write MCP configs for detected/selected AI editors', false)
  .option('--no-link-ai', 'Skip AI editor linking', false)
  .option('--teach', 'After init, teach AI (AGENTS.md + agent-manifest + paste briefing)', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    console.log(renderVeloProveBanner());
    renderCommandHeader('init', 'Project Setup & AI Agent Integration');

    // 1. Ensure .veloprove directory structure
    const veloproveDirs = [
      path.join(cwd, '.veloprove'),
      path.join(cwd, '.veloprove', 'config'),
      path.join(cwd, '.veloprove', 'reports'),
      path.join(cwd, '.veloprove', 'state')
    ];
    for (const d of veloproveDirs) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    }

    // 2. Scaffold veloprove.config.json if not present
    const configPath = path.join(cwd, 'veloprove.config.json');
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
      console.log(pc.green('✔ Created veloprove.config.json (user-editable configuration)'));
    } else {
      console.log(pc.dim('ℹ Existing veloprove.config.json preserved (idempotent setup).'));
    }

    // 3. Inspect project environment
    const engine = new VeloProveEngine(cwd);
    const spinner = createSpinner('Scanning project structure and dependencies...').start();
    const { profile, requirements } = await engine.inspect();
    spinner.succeed(`Discovered project: ${pc.bold(profile.projectName)} (${profile.frameworks.join(', ') || 'Node.js'})`);

    let configureMcpFromPrompt = false;
    let mcpTargetsFromPrompt: Array<'cursor' | 'claude' | 'windsurf' | 'cline'> | undefined;
    let teachFromPrompt = false;

    // Interactive configuration if not -y/--yes
    if (!opts.yes) {
      const answers = await promptInitQuestions(
        {
          projectName: profile.projectName,
          frameworks: profile.frameworks,
          testFrameworks: profile.testFrameworks
        },
        cwd
      );
      configureMcpFromPrompt = answers.configureMcp;
      mcpTargetsFromPrompt = answers.mcpTargets;
      teachFromPrompt = answers.teachAi;
    }

    // 4. Safely configure package.json scripts (non-destructive)
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkgContent.scripts = pkgContent.scripts || {};
        const scriptsToAdd: Record<string, string> = {
          vp: 'veloprove',
          'vp:doctor': 'veloprove doctor',
          'vp:test': 'veloprove test',
          'vp:changed': 'veloprove changed',
          'vp:release': 'veloprove release',
          'vp:ask': 'veloprove ask'
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
          console.log(pc.green(`✔ Added ${addedCount} VeloProve convenience scripts to package.json`));
        }
      } catch {
        // preserve package.json untouched if parse error
      }
    }

    // 5. AI link policy (detect editors, respect flags / prompts)
    const policy = resolveAiLinkPolicy({
      yes: Boolean(opts.yes),
      teach: Boolean(opts.teach) || teachFromPrompt,
      linkAi: Boolean(opts.linkAi) || Boolean(opts.mcp) || configureMcpFromPrompt,
      noLinkAi: Boolean(opts.noLinkAi),
      configureMcpFromPrompt,
      mcpTargetsFromPrompt,
      projectRoot: cwd
    });

    const hinted = editorsWithHints(policy.detected);
    if (hinted.length > 0) {
      console.log(pc.cyan(`ℹ AI editors detected: ${hinted.map((h) => h.label).join(', ')}`));
    } else {
      console.log(pc.dim('ℹ No AI editor folders detected yet (Cursor/Claude/Windsurf/Cline).'));
    }
    console.log(pc.dim(`AI link policy: ${policy.autoReason}`));

    if (policy.shouldLink && policy.targets.length > 0) {
      const link = linkAiEditors(cwd, policy.targets);
      for (const f of link.writtenFiles) {
        console.log(pc.green(`✔ Linked AI MCP config: ${f}`));
      }
      if (link.writtenFiles.length === 0) {
        console.log(pc.dim('ℹ MCP configs already present (idempotent).'));
      }
    } else if (!policy.shouldLink) {
      console.log(pc.bold('\nMCP snippet (paste into your editor if needed):'));
      console.log(pc.dim(MCP_SNIPPET));
    }

    if (policy.shouldTeach || Boolean(opts.teach)) {
      const teach = engine.handshake({
        agentName: 'ProjectInit',
        forceAgentsMd: true,
        writeMcpConfig: policy.shouldLink && policy.targets.includes('cursor'),
        preferredOutput: 'json'
      });
      console.log(pc.green(`✔ Taught AI — AGENTS.md: ${teach.agentsMdPath}`));
      console.log(pc.cyan(`Manifest: ${teach.manifestPath}`));
      console.log(pc.bold('\nPaste this into your AI chat:'));
      console.log(pc.white(teach.pasteToAi));
    }

    console.log(pc.bold(pc.green(`\n✔ VeloProve initialized successfully for "${profile.projectName}"!`)));
    console.log(`- Project Type: ${pc.bold(profile.frameworks.join(', ') || 'Node.js')}`);
    console.log(`- Workspace: ${pc.bold(profile.workspaceType)}`);
    console.log(`- Package Manager: ${pc.bold(profile.packageManager)}`);
    console.log(`- Test Runners: ${pc.bold(profile.testFrameworks.join(', ') || 'None detected (Vitest or node --test recommended)')}`);
    console.log(`- Discovered Requirements: ${pc.bold(pc.green(requirements.length))}`);
    msg.notice('Next steps (first verify)', [
      'npx veloprove doctor',
      'npx veloprove teach-ai --force --mcp   # if not already taught',
      'npx veloprove plan && npx veloprove generate   # if suite empty',
      'npx veloprove verify --json --ci',
      'Or tell your AI: "test this project with VeloProve"'
    ]);

    // Write summary report
    ReportSummaryService.writeSummary({
      projectRoot: cwd,
      commandName: 'init',
      title: `Project Initialized: ${profile.projectName}`,
      verdict: 'HEALTHY',
      metrics: {
        'Project Name': profile.projectName,
        Framework: profile.frameworks.join(', ') || 'Node.js',
        'Package Manager': profile.packageManager,
        'Workspace Type': profile.workspaceType,
        'Discovered Requirements': requirements.length,
        'Test Runners': profile.testFrameworks.join(', ') || 'None'
      },
      details: [
        'Initialized configuration in veloprove.config.json',
        'Scaffolded local state and reports directories in .veloprove/',
        profile.apps.length > 1
          ? `Discovered ${profile.apps.length} workspace applications / packages`
          : 'Single target project structure'
      ],
      recommendations: [
        'Run "npx veloprove doctor" to verify runtime dependencies',
        'Ask docs: "npx veloprove ask how do I verify changes?"',
        'Run "npx veloprove verify --ci" after code changes',
        'Launch "npx veloprove ui" for Docs Chat + command center'
      ]
    });

    console.log(
      '\n' +
        renderBox(
          'Quick Start & Next Steps',
          [
            `1. ${pc.cyan('npx veloprove doctor')}              → Verify environment`,
            `2. ${pc.cyan('npx veloprove ask "how do I verify?"')} → Docs-grounded Q&A`,
            `3. ${pc.cyan('npx veloprove verify --ci')}          → Change-aware QA gate`,
            `4. ${pc.cyan('npx veloprove ui')}                   → Dashboard + Docs Chat`
          ],
          pc.green
        ) +
        '\n'
    );
  });

// 1.1 doctor
program
  .command('doctor')
  .description('Run environmental, runtime, and project installation diagnostics (incl. Vitest/Jest/Playwright/node:test)')
  .option('--json', 'Emit machine-readable JSON', false)
  .action((opts) => {
    const cwd = process.cwd();
    const engine = new VeloProveEngine(cwd);
    const report = engine.doctor();

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    renderCommandHeader('doctor', 'Environment & Installation Diagnostics');
    const spinner = createSpinner('Running environmental diagnostic probes...').start();
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
  .description('Inspect project structure, routes, API endpoints, test runners (incl. node:test), and existing tests')
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    const engine = new VeloProveEngine(cwd);
    const { profile, requirements, featureMap } = await engine.inspect();

    if (opts.json) {
      console.log(JSON.stringify({ profile, requirements, featureMap }, null, 2));
      return;
    }

    renderCommandHeader('inspect', 'Project Stack & Route Architecture');
    const spinner = createSpinner('Scanning AST, routes, endpoints and requirements...').start();
    spinner.succeed(`Inspected ${profile.projectName} (${profile.workspaceType})`);

    console.log(pc.bold(pc.cyan('\n=== VeloProve Project Profile ===')));
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

// 2.1 teach-ai (alias: agent-handshake)
program
  .command('teach-ai')
  .alias('agent-handshake')
  .description('Teach the project AI how to use VeloProve (writes AGENTS.md + paste-ready briefing)')
  .option('-a, --agent-name <name>', 'Name of AI agent or editor', 'CustomAI')
  .option('-F, --format <type>', 'Briefing preference (json, markdown, compact)', 'json')
  .option('--output <type>', 'Deprecated alias for --format')
  .option('--force', 'Rewrite AGENTS.md even if it already exists', false)
  .option('--mcp', 'Create .cursor/mcp.json when missing', false)
  .option('-y, --yes', 'Skip confirmation when --force rewrites AGENTS.md', false)
  .option('--allow-no-ai', 'Allow this step without a linked AI agent', false)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    if (opts.force) {
      const ok = await msg.confirmSensitive({
        projectRoot: process.cwd(),
        allowNoAi: true,
        title: 'Rewrite AGENTS.md (--force)',
        lines: [
          'Existing AGENTS.md will be overwritten with the VeloProve playbook.',
          'Pass -y to skip this prompt in CI/scripts.'
        ],
        yes: Boolean(opts.yes)
      });
      if (!ok) return;
    }
    const preferredOutput = (opts.format || opts.output || 'json') as 'json' | 'markdown' | 'compact';
    const res = engine.handshake({
      agentName: opts.agentName,
      preferredOutput,
      forceAgentsMd: Boolean(opts.force),
      writeMcpConfig: Boolean(opts.mcp)
    });

    console.log(pc.bold(pc.green(`\n✔ VeloProve taught AI: ${res.agentName}`)));
    console.log(pc.cyan(`Manifest: ${res.manifestPath}`));
    console.log(pc.cyan(`AGENTS.md: ${res.agentsMdPath}`));
    if (res.writtenFiles.length > 0) {
      console.log(pc.dim(`Written: ${res.writtenFiles.join(', ')}`));
    }
    if (res.mcpConfigPath && res.writtenFiles.includes(res.mcpConfigPath)) {
      console.log(pc.green(`✔ Created ${res.mcpConfigPath}`));
    }

    console.log(pc.bold('\nPaste this into your AI chat:'));
    console.log(pc.white(res.pasteToAi));

    console.log(pc.bold('\nMCP config (if not already set):'));
    console.log(pc.dim(res.mcpSnippet));
    msg.notice('One-prompt next step', [
      'Tell your AI: "test this project with VeloProve"',
      'or run: npx veloprove verify --json --ci'
    ]);
  });

// 2.1.05 ask / chat — docs-grounded Q&A (no cloud LLM)
program
  .command('ask')
  .alias('chat')
  .description('Ask VeloProve a question answered from packaged documentation only (local, English-only, no cloud LLM)')
  .argument('[question...]', 'Question text (omit with --repl for interactive chat)')
  .option('--repl', 'Interactive docs chat loop in the terminal', false)
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (questionParts: string[], opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const printAnswer = (q: string) => {
      const res = engine.askDocs(q);
      if (opts.json) {
        console.log(JSON.stringify(res, null, 2));
        return;
      }
      console.log(pc.bold(pc.cyan(`\nDocs root: ${res.docsRoot}`)));
      if (res.englishOnlyBlocked) {
        console.log(pc.bold(pc.yellow('⚠ English only — Docs Chat has no AI translator for other languages.')));
      }
      console.log(pc.white(res.answer));
      if (res.confidence) {
        console.log(pc.dim(`confidence: ${res.confidence}`));
      }
      if (res.sources.length > 0) {
        console.log(pc.bold('\nSources:'));
        for (const s of res.sources) {
          console.log(pc.dim(`  - ${s.file} · ${s.title} (score ${s.score})`));
        }
      }
      if (res.suggestedCommands.length > 0) {
        console.log(pc.bold('\nSuggested commands:'));
        for (const c of res.suggestedCommands) console.log(pc.cyan(`  ${c}`));
      }
    };

    if (opts.repl) {
      const readline = await import('node:readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      console.log(pc.bold(pc.green('\nVeloProve Docs Chat (local, English only). Type exit to quit.')));
      const loop = () => {
        rl.question(pc.cyan('you> '), (line) => {
          const q = line.trim();
          if (!q || q === 'exit' || q === 'quit') {
            rl.close();
            return;
          }
          printAnswer(q);
          loop();
        });
      };
      loop();
      return;
    }

    const question = (questionParts || []).join(' ').trim();
    if (!question) {
      console.error(pc.red('Usage: veloprove ask "how do I link Cursor?"   or   veloprove ask --repl'));
      process.exitCode = 1;
      return;
    }
    printAnswer(question);
  });

// 2.1.1 learn-framework
program
  .command('learn-framework')
  .alias('learn')
  .description('Teach VeloProve an uncommon or custom in-house framework from AGENTS.md or instructions')
  .option('-i, --instructions <instructions>', 'Natural language or markdown framework specification')
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const result = engine.learnFramework({ instructions: opts.instructions });

    console.log(pc.bold(pc.green(`\n✔ ${result.summary}`)));
    console.log(`Config file: ${pc.cyan(result.configPath)}`);
    console.log(`Routes detected: ${pc.bold(result.inferredRoutesCount)} | APIs detected: ${pc.bold(result.inferredApisCount)}`);
  });

// 2.2 explore
program
  .command('explore')
  .description('Explore live application screens, interactive elements, and build exploration map')
  .argument('[url]', 'Base URL (same as -u/--url)')
  .option('-u, --url <url>', 'Base URL')
  .option('--ensure-dev', 'Auto-start local app when URL is offline (default: true)', true)
  .option('--no-ensure-dev', 'Skip Smart DevServer auto-launch')
  .action(async (urlArg, opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const baseURL = resolveTargetUrl(urlArg, opts.url, 'http://localhost:5173')!;
    console.log(pc.cyan('\nStarting application exploration...'));
    const res = await engine.explore({ baseURL, ensureDev: opts.ensureDev !== false });

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
  .alias('fuzz')
  .description('Generate API security probes and boundary validation tests')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
    const probes = await engine.fuzzApi();

    console.log(pc.bold(pc.cyan(`\n=== VeloProve API Fuzz & Security Probes (${probes.length} generated) ===`)));
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
    const engine = new VeloProveEngine(process.cwd());
    const plan = await engine.plan({ scope: opts.scope, maxTests: opts.max });

    console.log(pc.bold(pc.cyan(`\n=== VeloProve Test Plan (${plan.planId}) ===`)));
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
  .description('Generate executable tests from the current test plan (Vitest/Jest/Playwright/node:test emitters)')
  .option('--overwrite <policy>', 'Overwrite policy (never, generated-only, explicit)', 'generated-only')
  .option('--no-live-ground', 'Skip live GET probing before API assertions')
  .option('-u, --url <url>', 'Base URL for live grounding')
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const res = await engine.generate({
      overwritePolicy: opts.overwrite,
      liveGround: opts.liveGround !== false,
      baseURL: opts.url
    });

    console.log(pc.bold(pc.green(`\n✔ Generated ${res.writtenCount} test files.`)));
    if (res.groundedCount > 0) {
      console.log(pc.cyan(`  Live-grounded API assertions: ${res.groundedCount}`));
    }
    if (res.fixturesDir) {
      console.log(pc.dim(`  Fixtures pack: ${res.fixturesDir}`));
    }
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
  .description('Execute test suites (Vitest, Jest, Playwright, or node --test) and collect structured results')
  .option('-s, --scope <scope>', 'Execution scope (all, changed, affected, paths, critical)', 'all')
  .option('-p, --paths <paths...>', 'Specific test paths')
  .option('--affected', 'Twin-aware affected tests (expands when confidence is low)', false)
  .option('--security', 'Also execute comprehensive security testing suite', false)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    console.log(pc.cyan('\nRunning VeloProve test execution...'));

    const scope = opts.affected ? 'affected' : opts.scope;
    const res = await engine.run({ scope, paths: opts.paths });

    const rationale = res.selectionRationale;
    if (rationale?.length) {
      console.log(pc.dim('Selection:'));
      for (const line of rationale) {
        console.log(pc.dim(`  • ${line}`));
      }
    }

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

    if (opts.security) {
      console.log(pc.cyan('\nRunning VeloProve Security Suite...'));
      const secRep = await engine.runSecurityTests({ safeMode: true });
      console.log(pc.bold(`Security Score: ${secRep.securityScore}/100 (Verdict: ${secRep.verdict})`));
      if (secRep.findings.length > 0) {
        console.log(pc.yellow(`Security Findings: ${secRep.findings.length} issues identified.`));
      }
    }
  });

// 6. changed
program
  .command('changed')
  .description('List tests impacted by Git changes (run them with: veloprove test -s changed)')
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const impact = await engine.changed();

    if (opts.json) {
      console.log(JSON.stringify(impact, null, 2));
      return;
    }

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
    const engine = new VeloProveEngine(process.cwd());
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
  .option('-y, --yes', 'Skip confirmation before writing healed locators', false)
  .option('--allow-no-ai', 'Run heal locally without a linked AI agent', false)
  .action(async (opts) => {
    const ok = await msg.confirmSensitive({
      projectRoot: process.cwd(),
      allowNoAi: Boolean(opts.allowNoAi),
      title: 'Heal test locators',
      lines: [
        'May rewrite selectors in generated test files based on failure evidence.',
        'Review the before/after snippets after the run.'
      ],
      yes: Boolean(opts.yes)
    });
    if (!ok) return;

    const engine = new VeloProveEngine(process.cwd());
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
  .description('Release confidence gate only (0–100). For full change-aware QA use: veloprove verify')
  .option('--ci', 'CI deterministic mode (exits 1 on failure)')
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    const engine = new VeloProveEngine(cwd);
    const report = await engine.releaseCheck();

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
      if (opts.ci && report.verdict === 'NOT_READY') {
        process.exit(1);
      }
      return;
    }

    renderCommandHeader('release', 'Release Confidence & Gatekeeper');
    const spinner = createSpinner('Evaluating PRD coverage, test results, and release confidence...').start();
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
  .option('-p, --port <port>', 'Server port', (v) => parseInt(v, 10), 4173)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const { url } = await engine.startUi(opts.port);
    console.log(pc.bold(pc.green(`\n🚀 VeloProve Local Dashboard running at: ${url}`)));
    console.log(pc.dim('Press Ctrl+C to stop.'));
  });

// 9.2 setup-ci
program
  .command('setup-ci')
  .description('Generate GitHub Actions autonomous QA workflow')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
    const filePath = engine.setupCi();
    console.log(pc.bold(pc.green(`\n✔ Created GitHub Actions workflow at: ${filePath}`)));
  });

// 9.3 mutation-score
program
  .command('mutation-score')
  .alias('mutation')
  .description('Calculate mutation score to evaluate actual test assertion quality')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
    const result = await engine.refineTest({ instruction, testFilePath: opts.file });
    console.log(pc.bold(pc.green(`\n✨ Successfully refined ${result.filePath}:`)));
    for (const ref of result.appliedRefinements) {
      console.log(`  + ${ref}`);
    }
  });

// 9.5 a11y
program
  .command('a11y')
  .description('Run static WCAG-oriented accessibility heuristics (not a certified WCAG audit)')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('vdiff')
  .description('Compare UI screenshots with baseline for visual regression')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
    const result = await engine.compareVisuals();
    console.log(pc.bold(pc.cyan('\n👁️ Visual Regression Report:')));
    console.log(`Total Snapshots: ${result.totalSnapshots}`);
    console.log(`Matching: ${result.matchingSnapshots} | Mismatches: ${result.mismatchedSnapshots} | New: ${result.newSnapshots}`);
  });

// 9.7 contract-drift
program
  .command('contract-drift')
  .description('Detect API contract drift between OpenAPI specs and code (also covered by `veloprove drift` aggregator)')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
    const sandbox = await engine.startSandbox(parseInt(opts.port, 10));
    console.log(pc.bold(pc.green(`\n🛡️ VeloProve Ephemeral Mock Sandbox started at ${sandbox.baseURL}`)));
    console.log('Available mock collections: /api/users, /api/orders, /api/products');
    console.log('Press Ctrl+C to terminate sandbox.');
  });

// 9.9 watch
program
  .command('watch')
  .description('Watch files and re-run impacted tests (optional scheduled verify)')
  .option('--verify', 'Run change-aware verify on each change instead of impacted tests only', false)
  .option('-i, --interval <sec>', 'Also run verify on an interval (seconds, min 30)', (v) => parseInt(v, 10))
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const intervalMs = opts.interval != null ? Math.max(30, opts.interval) * 1000 : undefined;
    console.log(pc.bold(pc.cyan('\n👀 VeloProve Watch Mode active. Listening for file changes...')));
    if (opts.verify) console.log(pc.dim('  mode: verify on change'));
    if (intervalMs) console.log(pc.dim(`  interval verify: every ${intervalMs / 1000}s`));
    engine.watch((info) => {
      const statusColor = info.status === 'passed' ? pc.green : pc.red;
      console.log(`\n[${new Date().toLocaleTimeString()}] [${info.mode || 'watch'}] ${info.changedFile}`);
      console.log(`Impacted: ${info.impactedTests.join(', ') || 'n/a'} -> ${statusColor(info.status.toUpperCase())}`);
    }, { verify: opts.verify === true, intervalMs });
  });

// 9.10 lint
program
  .command('lint')
  .description('Run ESLint and static code quality checks')
  .option('-s, --scope <scope>', 'Scope (all, changed, paths)', 'all')
  .option('--fix', 'Automatically fix lint errors where possible')
  .option('-p, --paths <paths...>', 'Specific paths to lint')
  .option('-y, --yes', 'Skip confirmation when applying --fix', false)
  .option('--allow-no-ai', 'Run without a linked AI agent', false)
  .action(async (opts) => {
    if (opts.fix) {
      const ok = await msg.confirmSensitive({
        projectRoot: process.cwd(),
        allowNoAi: Boolean(opts.allowNoAi),
        title: 'Lint --fix will modify source files',
        lines: [
          'Auto-fixable lint issues will be written back to disk.',
          'Scope: ' + (opts.scope || 'all')
        ],
        yes: Boolean(opts.yes)
      });
      if (!ok) return;
    }
    const engine = new VeloProveEngine(process.cwd());
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
  .description('Scan dependencies for CVEs and hardcoded secrets (not live security — use security / owasp-scan)')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
    const report = engine.auditSecurity();
    const scoreColor = report.score > 80 ? pc.green : report.score > 50 ? pc.yellow : pc.red;

    console.log(pc.bold(scoreColor(`\n🛡️ VeloProve Security Audit Score: ${report.score}/100`)));
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
    const engine = new VeloProveEngine(process.cwd());
    const report = await engine.profilePerf();
    const rColor = report.rating === 'EXCELLENT' ? pc.green : report.rating === 'GOOD' ? pc.cyan : pc.yellow;

    console.log(pc.bold(rColor(`\n⚡ VeloProve Performance Score: ${report.overallScore}/100 (${report.rating})`)));
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
    const engine = new VeloProveEngine(process.cwd());
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
  .description('Isolate and quarantine flaky tests from breaking CI pipelines')
  .option('-t, --threshold <threshold>', 'Flakiness rate threshold', parseFloat, 0.25)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const result = engine.quarantineFlaky(opts.threshold);
    console.log(pc.bold(pc.cyan(`\n🚷 VeloProve Flaky Test Quarantine:`)));
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
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
    await engine.renderTui();
  });

// 9.17 run-collection
program
  .command('run-collection <collectionFile>')
  .alias('collection')
  .description('Run Postman Collection v2.1/v2.0 test suite locally')
  .option('-e, --env <envFile>', 'Postman environment JSON file')
  .option('-u, --url <url>', 'Base URL for requests')
  .option('--base-url <url>', 'Alias for --url')
  .action(async (collectionFile, opts) => {
    const engine = new VeloProveEngine(process.cwd());
    console.log(pc.cyan(`\n🚀 Executing Postman Collection: ${collectionFile}`));
    const result = await engine.runPostmanCollection(collectionFile, opts.env, opts.url || opts.baseUrl);

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
  .alias('postman')
  .description('Export discovered routes and APIs to Postman Collection v2.1 JSON')
  .option('-o, --out <outputFile>', 'Output file path', 'veloprove_postman_collection.json')
  .option('--output <outputFile>', 'Deprecated alias for --out')
  .option('-n, --name <name>', 'Collection name')
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const res = await engine.exportPostmanCollection(opts.out || opts.output, opts.name);
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
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('load')
  .description('Run local load & stress testing on HTTP/API endpoint')
  .option('-m, --method <method>', 'HTTP method (GET, POST, etc.)', 'GET')
  .option('-c, --vus <vus>', 'Number of concurrent Virtual Users', parseInt, 10)
  .option('-d, --duration <sec>', 'Duration in seconds', parseInt, 5)
  .action(async (url, opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('owasp')
  .description('OWASP headers/CSP/CORS probe against a live URL (not full security suite)')
  .action(async (url) => {
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('probe')
  .description('Generate drop-in companion probe file to connect a live website to local VeloProve')
  .option('-t, --type <type>', 'Probe type: standalone_js, nextjs_route, express_middleware, html_snippet', 'standalone_js')
  .option('-n, --name <name>', 'Remote site display name', 'LiveApp')
  .option('-o, --out <path>', 'Save probe to local file directly')
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const snippet = engine.generateRemoteProbe(opts.type as any, { siteName: opts.name });

    console.log(pc.bold(pc.cyan(`\n⚡ VeloProve Live Remote Companion Probe Generated:`)));
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
  .alias('connect')
  .description('Establish and test authenticated link with live remote website')
  .option('-s, --secret <token>', 'Secret authentication token')
  .action(async (url, opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
      console.log(pc.dim(`Tip: Run "npx veloprove remote-init" to generate the companion probe for your live site.`));
    }
  });

// 9.27 remote-audit
program
  .command('remote-audit <url>')
  .alias('raudit')
  .description('Execute full live remote QA, OWASP security, and health audit on live URL')
  .option('--load', 'Include live load and stress testing benchmark')
  .option('-c, --vus <vus>', 'Virtual users for load test', parseInt, 8)
  .option('-s, --secret <token>', 'Optional bridge secret token')
  .action(async (url, opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('record')
  .description('Synthesize resilient Playwright E2E scenario from start URL')
  .option('-u, --url <url>', 'Starting page URL', 'http://localhost:3000')
  .option('-o, --out <path>', 'Destination test file path')
  .action(async (title, opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
  .option('-y, --yes', 'Skip confirmation when applying --fix', false)
  .option('--allow-no-ai', 'Run without a linked AI agent', false)
  .action(async (file, opts) => {
    if (opts.fix) {
      const ok = await msg.confirmSensitive({
        projectRoot: process.cwd(),
        allowNoAi: Boolean(opts.allowNoAi),
        title: 'Stabilize --fix will rewrite the test file',
        lines: [
          'Target: ' + file,
          'Flaky patterns will be refactored to web-first assertions on disk.'
        ],
        yes: Boolean(opts.yes)
      });
      if (!ok) return;
    }
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
    const targetFiles = files && files.length > 0 ? files : ['package.json'];
    console.log(pc.cyan(`\nCreating snapshot "${name}" for files: ${targetFiles.join(', ')}...`));
    const meta = engine.createDbSnapshot(name, targetFiles);
    console.log(pc.bold(pc.green(`✔ Snapshot created: ${meta.id} (${meta.totalBytes} bytes, ${meta.targetFiles.length} files)`)));
  });

// 9.31 db-restore
program
  .command('db-restore <snapshotId>')
  .description('Restore database / fixture files from snapshot ID')
  .option('-y, --yes', 'Skip confirmation before overwriting files', false)
  .option('--allow-no-ai', 'Restore without a linked AI agent', false)
  .action(async (snapshotId, opts) => {
    const ok = await msg.confirmSensitive({
      projectRoot: process.cwd(),
      allowNoAi: Boolean(opts.allowNoAi),
      title: 'Restore database / fixture snapshot',
      lines: [
        'Snapshot: ' + snapshotId,
        'Target files in the snapshot will be overwritten on disk.'
      ],
      yes: Boolean(opts.yes)
    });
    if (!ok) return;

    const engine = new VeloProveEngine(process.cwd());
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
  .description('Propose reviewable app-bug patches from diagnostics (REVIEW_REQUIRED — not guaranteed fixes)')
  .option('--apply', 'Apply patch repairs directly to source code', false)
  .option('-y, --yes', 'Skip confirmation when applying --apply', false)
  .option('--allow-no-ai', 'Apply patches without a linked AI agent', false)
  .action(async (opts) => {
    if (opts.apply) {
      const ok = await msg.confirmSensitive({
        projectRoot: process.cwd(),
        allowNoAi: Boolean(opts.allowNoAi),
        title: 'Auto-fix --apply will modify application source',
        lines: [
          'Synthesized patches from diagnostics will be written to source files.',
          'Prefer dry-run (without --apply) first, then review diffs.'
        ],
        yes: Boolean(opts.yes)
      });
      if (!ok) return;
    }
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('report')
  .description('Export executive QA report (html|json|markdown|junit|pdf|allure)')
  .option('-f, --format <format>', 'Output format: html, json, markdown, junit, pdf, allure', 'html')
  .option('-o, --out <path>', 'Destination output file path')
  .option('--preview', 'Show report preview and save path without writing files')
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const res = engine.exportReport({
      format: opts.format,
      outputPath: opts.out,
      preview: Boolean(opts.preview)
    });
    if (res.saved) {
      console.log(pc.bold(pc.green(`✔ Executive audit report saved (${res.sizeBytes} bytes)`)));
      console.log(`Save path: ${pc.bold(res.filePath)}`);
    } else {
      console.log(pc.bold(pc.cyan(`\nPreview · ${res.format} (not saved yet)`)));
      console.log(`Save path: ${pc.bold(res.filePath)}`);
      if (res.previewText) {
        console.log(pc.dim('\n--- preview ---'));
        console.log(res.previewText.length > 4000 ? res.previewText.slice(0, 4000) + '\n…' : res.previewText);
        console.log(pc.dim('--- end preview ---'));
      }
      console.log(pc.dim('\nRe-run without --preview to write the file.'));
    }
  });

// 9.34 chaos
program
  .command('chaos <url>')
  .description('Run autonomous chaos & edge-case monkey test against HTTP/API endpoint')
  .option('-m, --method <method>', 'HTTP method', 'POST')
  .option('-i, --iterations <count>', 'Number of iterations per chaos strategy', parseInt, 3)
  .action(async (url, opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('docker')
  .description('Generate isolated containerized test dependencies (PostgreSQL, Redis, MongoDB, MySQL)')
  .option('-s, --services <services...>', 'Services list (postgres, redis, mongodb, mysql)', ['postgres', 'redis'])
  .option('-o, --out <path>', 'Output docker-compose file path', 'docker-compose.test.yml')
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('browsers')
  .description('Generate multi-browser & mobile viewport Playwright matrix snippet')
  .action(async () => {
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
        // branch / MTTR / regressionAlert auto-enriched from run history
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
  .alias('parity')
  .description('Audit UI-to-Backend parity and detect ghost/unimplemented UI features (Tauri, React, Vue, Express, Python)')
  .option('-e, --e2e', 'Generate Playwright E2E parity test suite', true)
  .action((opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('malware')
  .description('Deep scan for malicious code, backdoors, obfuscated payloads, and lifecycle script attacks')
  .option('--fix', 'Automatically remediate and neutralize all detected threats', false)
  .option('-y, --yes', 'Skip confirmation when applying --fix', false)
  .option('--allow-no-ai', 'Run without a linked AI agent', false)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
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
        const ok = await msg.confirmSensitive({
          projectRoot: process.cwd(),
          allowNoAi: Boolean(opts.allowNoAi),
          title: 'Malware --fix will rewrite threat files',
          lines: [
            `${report.threatCount} threat(s) will be neutralized in place.`,
            'This modifies source files. Prefer review + backup first.'
          ],
          yes: Boolean(opts.yes)
        });
        if (!ok) return;
        console.log(pc.bold(pc.cyan(`\nApplying automated remediations...`)));
        const res = engine.remediateMalware();
        if (res.success) {
          console.log(pc.bold(pc.green(`✔ ${res.message}`)));
        } else {
          console.log(pc.yellow(`⚠ ${res.message}`));
        }
      } else {
        console.log(pc.dim(`\nTip: Run "npx veloprove scan-malware --fix -y" to automatically neutralize and clean all threats.`));
      }
    }
  });

// 9.41 ai-eval
program
  .command('ai-eval <url>')
  .description('Evaluate AI / LLM outputs for hallucinations, keyword grounding, and JSON schema compliance')
  .action(async (url) => {
    const engine = new VeloProveEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🧠 Evaluating AI model accuracy & hallucinations on: ${url}`)));

    const report = await engine.evaluateAiOutputs({
      endpointUrl: url,
      testCases: [
        {
          id: 'TEST-1',
          prompt: 'What is VeloProve?',
          expectedKeywords: ['local-first', 'QA', 'autonomous'],
          groundTruthContext: 'VeloProve is a 100% local-first autonomous QA testing engine.'
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
  .option('-y, --yes', 'Skip confirmation before checking out commits', false)
  .option('--allow-no-ai', 'Bisect without a linked AI agent', false)
  .action(async (opts) => {
    const ok = await msg.confirmSensitive({
      projectRoot: process.cwd(),
      allowNoAi: Boolean(opts.allowNoAi),
      title: 'Git bisect will temporarily check out commits',
      lines: [
        'Worktree HEAD may move while hunting the regression.',
        'Commit or stash critical local changes first.',
        'Command: ' + (opts.cmd || 'npm test')
      ],
      yes: Boolean(opts.yes)
    });
    if (!ok) return;

    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('contracts')
  .description('Audit Solidity & Web3 smart contracts for reentrancy, selfdestruct, and vulnerabilities')
  .action(() => {
    const engine = new VeloProveEngine(process.cwd());
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
  .alias('dead')
  .description('Scan and purge unused image assets, fonts, and dead code')
  .option('--purge', 'Purge and delete unreferenced dead assets', false)
  .option('-y, --yes', 'Skip confirmation when applying --purge', false)
  .option('--allow-no-ai', 'Purge without a linked AI agent', false)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🧹 Scanning for unreferenced images, fonts, and dead assets...`)));
    if (opts.purge) {
      const ok = await msg.confirmSensitive({
        projectRoot: process.cwd(),
        allowNoAi: Boolean(opts.allowNoAi),
        title: 'Dead-assets --purge deletes files permanently',
        lines: [
          'Unreferenced images/fonts/assets will be removed from disk.',
          'This cannot be undone without VCS restore.'
        ],
        yes: Boolean(opts.yes)
      });
      if (!ok) return;
      const del = engine.purgeDeadAssets();
      console.log(pc.bold(pc.green(`✔ Purged ${del.deletedFiles.length} dead asset(s) (~${Math.round(del.bytesFreed / 1024)} KB freed).`)));
    } else {
      const rep = engine.scanDeadAssets();
      console.log(pc.bold(pc.green(`\n✔ ${rep.summary}`)));
      for (const it of rep.unusedItems) {
        console.log(`  - [${it.type}] ${pc.bold(it.identifier)} in ${it.file} (${Math.round((it.sizeBytes || 0) / 1024)} KB)`);
      }
      console.log(pc.dim(`Tip: Run "npx veloprove dead-assets --purge -y" to delete these files.`));
    }
  });

// 9.46 screen-reader
program
  .command('screen-reader')
  .alias('sr')
  .description('Simulate screen reader auditory speech flow, verify heading hierarchy and accessibility tags')
  .action(() => {
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
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
    const engine = new VeloProveEngine(process.cwd());
    const port = parseInt(opts.port, 10);
    console.log(pc.bold(pc.cyan(`\n🔄 Starting VeloProve Stateful Dynamic Mock Server on port ${port}...`)));
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
    const engine = new VeloProveEngine(process.cwd());
    console.log(pc.bold(pc.cyan(`\n🗺️ Generating microservices & architecture dependency graph...`)));
    const rep = engine.generateArchitectureGraph();
    console.log(pc.bold(pc.green(`\n=== Architecture Topology: ${rep.nodesCount} Nodes | ${rep.edgesCount} Connections ===`)));
    console.log(`Databases: ${rep.summary.databases.join(', ') || 'Local Store'}`);
    console.log(`External Integrations: ${rep.summary.externalIntegrations.join(', ') || 'None'}`);
    console.log(`\n${pc.cyan(rep.mermaidDiagram)}`);
  });

// 9.53 security
program
  .command('security')
  .description('Live non-destructive security suite (Auth, AuthZ, injections, sessions). Differs from audit / owasp-scan / web-sec')
  .argument('[url]', 'Target live application URL (same as -u/--url)')
  .option('--auth', 'Run authentication tests (login, password reset, rate-limiting)', false)
  .option('--authorization', 'Run authorization tests (IDOR, role escalation, protected routes)', false)
  .option('--forms', 'Run forms and input security tests', false)
  .option('--injection', 'Run injection tests (SQLi, NoSQLi, XSS, Command, Path Traversal)', false)
  .option('--api', 'Run API security & error leakage tests', false)
  .option('--uploads', 'Run file upload security tests', false)
  .option('--sessions', 'Run session theft/hijacking & JWT security tests (cookie flags, fixation, URL leaks, logout invalidation)', false)
  .option('--safe', 'Enforce safe mode non-destructive constraints (default: true)', true)
  .option('--deep', 'Run deep security verification', false)
  .option('-u, --url <url>', 'Target live application URL')
  .option('--ensure-dev', 'Auto-start local app via Smart DevServer when target is offline', false)
  .option('--init-policy', 'Generate a starter security policy file (baseline|owasp-asvs|soc2|hipaa)', false)
  .option('--policy <framework>', 'Policy framework for --init-policy', 'baseline')
  .option('-f, --format <format>', 'Output format (console, json, markdown)', 'console')
  .option('--sarif <path>', 'Export findings in standard SARIF v2.1.0 format for GitHub Security tab')
  .option('--ci', 'Exit with non-zero code if critical/high vulnerabilities exist', false)
  .action(async (urlArg, opts) => {
    const engine = new VeloProveEngine(process.cwd());
    renderCommandHeader('security', 'Autonomous Security & Vulnerability Auditor');
    const targetUrl = resolveTargetUrl(urlArg, opts.url);

    if (opts.initPolicy) {
      const policy = engine.initSecurityPolicy({
        framework: opts.policy,
        mergeIntoConfig: true
      });
      console.log(pc.bold(pc.green(`\n✔ ${policy.summary}`)));
      console.log(`Policy: ${pc.cyan(policy.policyPath)}`);
      if (policy.configUpdated) console.log(`Config updated: ${pc.cyan(policy.configPath)}`);
      return;
    }

    const categories: any[] = [];
    if (opts.auth) categories.push('authentication');
    if (opts.authorization) categories.push('authorization');
    if (opts.forms) categories.push('forms_inputs');
    if (opts.injection) categories.push('injection');
    if (opts.api) categories.push('api_security');
    if (opts.uploads) categories.push('file_uploads');
    if (opts.sessions) categories.push('sessions_tokens');

    const spinner = createSpinner('Scanning attack surface and executing security test suite...').start();
    const report = await engine.runSecurityTests({
      baseURL: targetUrl,
      categories: categories.length > 0 ? categories : undefined,
      safeMode: opts.safe !== false,
      deepMode: opts.deep === true,
      ensureDev: opts.ensureDev === true,
      environment: targetUrl?.includes('prod') ? 'production' : 'test'
    });

    if (opts.sarif) {
      const audit = engine.auditSecurity();
      const sarifRes = engine.exportSarif(report, audit, opts.sarif);
      console.log(pc.green(`✔ Exported SARIF v2.1.0 report: ${pc.bold(sarifRes.sarifPath)}`));
    }

    if (report.verdict === 'SECURE') {
      spinner.succeed(`Security audit passed. Score: ${pc.bold(pc.green(`${report.securityScore}/100`))}`);
    } else if (report.verdict === 'NEEDS_ATTENTION') {
      spinner.warn(`Security audit finished with warnings. Score: ${pc.bold(pc.yellow(`${report.securityScore}/100`))}`);
    } else {
      spinner.fail(`Critical security vulnerabilities detected! Score: ${pc.bold(pc.red(`${report.securityScore}/100`))}`);
    }

    if (opts.format === 'json') {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const summaryLines = [
      `Security Score:  ${pc.bold(report.securityScore >= 80 ? pc.green(`${report.securityScore}/100`) : report.securityScore >= 50 ? pc.yellow(`${report.securityScore}/100`) : pc.red(`${report.securityScore}/100`))}`,
      `Verdict:         ${pc.bold(report.verdict)}`,
      `Tests Run:       ${report.summary.totalTests} (Passed: ${pc.green(report.summary.passed)}, Failed: ${report.summary.failed > 0 ? pc.red(report.summary.failed) : pc.green(0)}, Warnings: ${pc.yellow(report.summary.warnings)})`,
      `Severity Counts: Critical: ${report.summary.severityCounts.critical > 0 ? pc.red(report.summary.severityCounts.critical) : pc.dim(0)} | High: ${report.summary.severityCounts.high > 0 ? pc.yellow(report.summary.severityCounts.high) : pc.dim(0)} | Medium: ${pc.dim(report.summary.severityCounts.medium)} | Low: ${pc.dim(report.summary.severityCounts.low)}`,
      `Safe Mode:       ${report.safeMode ? pc.green('ENABLED (Non-destructive)') : pc.yellow('DISABLED')}`
    ];

    console.log(renderBox('VeloProve Security Audit Summary', summaryLines, report.verdict === 'SECURE' ? pc.green : pc.red));

    if (report.findings.length > 0) {
      console.log(pc.bold('\n🔍 Findings & Vulnerabilities:'));
      for (const f of report.findings) {
        const sevColor = f.severity === 'CRITICAL' ? pc.bgRed(pc.white(` ${f.severity} `)) : f.severity === 'HIGH' ? pc.bgYellow(pc.black(` ${f.severity} `)) : pc.cyan(`[${f.severity}]`);
        console.log(`\n  ${sevColor} ${pc.bold(f.title)} (${pc.dim(f.confidence)} confidence)`);
        console.log(`    ${pc.dim('• Evidence:')} ${f.evidence}`);
        console.log(`    ${pc.dim('• Impact:')} ${f.impact}`);
        console.log(`    ${pc.dim('• Remediation:')} ${pc.green(f.remediation)}`);
      }
    } else {
      console.log(pc.green('\n✔ No vulnerabilities or high-risk findings detected in inspected attack surfaces.'));
    }

    // Save report summary
    ReportSummaryService.writeSummary({
      projectRoot: process.cwd(),
      commandName: 'security',
      title: 'VeloProve Security Test Summary',
      verdict: report.verdict,
      metrics: {
        'Security Score': `${report.securityScore}/100`,
        'Total Tests': report.summary.totalTests,
        'Passed': report.summary.passed,
        'Failed': report.summary.failed,
        'Critical Findings': report.summary.severityCounts.critical,
        'High Findings': report.summary.severityCounts.high
      },
      recommendations: report.remediationRoadmap.map(r => r.action)
    });

    if (opts.ci && (report.summary.severityCounts.critical > 0 || report.summary.severityCounts.high > 0)) {
      process.exit(1);
    }
  });

// 9.54 hook
program
  .command('hook [action]')
  .description('Install or uninstall VeloProve Git pre-commit hooks for automated change-impact testing')
  .option('-c, --cmd <command>', 'Command to execute on pre-commit', 'npx veloprove changed')
  .option('--verify', 'Preset: run `npx veloprove verify --ci` on pre-commit', false)
  .action((action, opts) => {
    const engine = new VeloProveEngine(process.cwd());
    if (action === 'uninstall') {
      const res = engine.uninstallGitHook();
      console.log(pc.bold(res.uninstalled ? pc.green(`✔ ${res.message}`) : pc.yellow(`ℹ ${res.message}`)));
    } else {
      const cmd = opts.verify ? 'npx veloprove verify --ci' : opts.cmd;
      const res = engine.installGitHook(cmd);
      if (res.installed) {
        console.log(pc.bold(pc.green(`✔ ${res.message}`)));
        console.log(`Hook path: ${pc.cyan(res.hookPath)} (${res.hookType})`);
        console.log(pc.dim(`Command: ${cmd}`));
      } else {
        console.log(pc.bold(pc.yellow(`⚠ ${res.message}`)));
      }
    }
  });

// 9.55 web-sec
program
  .command('web-sec')
  .description('Static SRI / CSRF / CORS policy audit on web assets (not live attack suite)')
  .action(() => {
    const engine = new VeloProveEngine(process.cwd());
    renderCommandHeader('web-sec', 'Web Security, SRI, CSRF & CORS Auditor');
    const rep = engine.auditSriAndCsrf();

    const vColor = rep.verdict === 'SECURE' ? pc.green : rep.verdict === 'NEEDS_ATTENTION' ? pc.yellow : pc.red;
    console.log(pc.bold(vColor(`\n=== Web Security Audit: ${rep.verdict} (${rep.score}/100) ===`)));
    console.log(`External Assets: ${rep.summary.totalExternalAssets} (Missing SRI: ${rep.summary.missingSriCount}) | Forms: ${rep.summary.totalFormsAudited} (Missing CSRF: ${rep.summary.missingCsrfCount}) | CORS Issues: ${rep.summary.corsIssuesCount}`);

    if (rep.sriFindings.length > 0) {
      console.log(pc.bold('\n🔍 Subresource Integrity (SRI) Findings:'));
      for (const sri of rep.sriFindings) {
        console.log(`  ${pc.yellow(`[${sri.risk}]`)} ${sri.file}:${sri.line} — ${pc.cyan(sri.sourceUrl)}`);
        console.log(`    ${pc.dim('• Recommendation:')} ${sri.recommendation}`);
      }
    }

    if (rep.csrfFindings.length > 0) {
      console.log(pc.bold('\n🔍 CSRF Protection Findings:'));
      for (const csrf of rep.csrfFindings) {
        console.log(`  ${pc.yellow(`[${csrf.risk}]`)} ${csrf.file}:${csrf.line} — ${csrf.method} form`);
        console.log(`    ${pc.dim('• Recommendation:')} ${csrf.recommendation}`);
      }
    }

    if (rep.corsFindings.length > 0) {
      console.log(pc.bold('\n🔍 CORS Policy Vulnerabilities:'));
      for (const cors of rep.corsFindings) {
        console.log(`  ${pc.red(`[${cors.risk}]`)} ${cors.file}:${cors.line} — Origin: ${cors.originPattern}`);
        console.log(`    ${pc.dim('• Recommendation:')} ${cors.recommendation}`);
      }
    }
  });

// 9.56 dedup
program
  .command('dedup')
  .description('Analyze test suites to identify duplicate and redundant test cases')
  .action(() => {
    const engine = new VeloProveEngine(process.cwd());
    renderCommandHeader('dedup', 'Test Suite Redundancy & Deduplication Engine');
    const rep = engine.deduplicateTests();

    console.log(pc.bold(pc.cyan(`\n=== Test Suite Deduplication Analysis ===`)));
    console.log(`Total Tests Scanned: ${rep.totalTestsScanned} | Unique Titles: ${rep.uniqueTestTitles} | Redundant Duplicates: ${rep.redundantCount > 0 ? pc.yellow(rep.redundantCount) : pc.green(0)} (${rep.redundancyPercentage}%)`);

    if (rep.duplicates.length > 0) {
      console.log(pc.bold('\n🔍 Identified Duplicate Tests:'));
      for (const dup of rep.duplicates) {
        console.log(`  • "${pc.bold(dup.testTitle)}"`);
        console.log(`    First: ${pc.dim(`${dup.firstOccurrence.file}:${dup.firstOccurrence.line}`)}`);
        for (const o of dup.duplicates) {
          console.log(`    Duplicate: ${pc.yellow(`${o.file}:${o.line}`)}`);
        }
      }
    }

    console.log('\n💡 Recommendations:');
    for (const rec of rep.recommendations) {
      console.log(`  • ${rec}`);
    }
  });

// 9.57 ensure-dev
program
  .command('ensure-dev')
  .alias('dev')
  .description('Smart DevServer auto-launcher: probe URL and start local npm/pnpm/yarn/bun dev when offline')
  .argument('[url]', 'Target base URL (same as -u/--url)')
  .option('-u, --url <url>', 'Target base URL')
  .option('-c, --command <command>', 'Override start command (e.g. "npm run dev")')
  .option('-p, --port <port>', 'Port override', (v) => parseInt(v, 10))
  .option('-t, --timeout <ms>', 'Health timeout ms', (v) => parseInt(v, 10), 30000)
  .option('--force', 'Force restart even if already healthy', false)
  .action(async (urlArg, opts) => {
    const engine = new VeloProveEngine(process.cwd());
    renderCommandHeader('ensure-dev', 'Smart DevServer Auto-Launcher');
    const res = await engine.ensureDevServer({
      baseURL: resolveTargetUrl(urlArg, opts.url),
      command: opts.command,
      port: opts.port,
      timeoutMs: opts.timeout,
      forceRestart: opts.force === true
    });
    const color = res.started || res.alreadyRunning ? pc.green : pc.yellow;
    console.log(color(`\n✔ ${res.message}`));
    console.log(`URL: ${pc.bold(res.baseURL)} | Port: ${res.port} | Command: ${res.command || 'n/a'} | ${res.durationMs}ms`);
  });

// 9.58 verify — autonomous QA orchestrator
program
  .command('verify')
  .description('Autonomous change-aware QA: inspect → impact → test → diagnose → heal → release')
  .option('--full', 'Run full test suite instead of impacted tests only', false)
  .option('--security', 'Include non-destructive security suite', false)
  .option('--a11y', 'Include accessibility audit', false)
  .option('--no-heal', 'Skip automatic TEST_BUG healing', false)
  .option('--intent <text>', 'Natural-language QA goal (deterministic planner; no LLM)')
  .option('--json', 'Emit machine-readable OperationResult JSON on stdout', false)
  .option('--ci', 'Exit with documented codes (0/1/2/3)', false)
  .option('--sandbox', 'Start local mock sandbox and set API_BASE_URL for this run', false)
  .option('--docker-env', 'Generate local docker-compose test env files before verify', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    const engine = new VeloProveEngine(cwd);
    const jsonMode = opts.json === true;

    if (!jsonMode) {
      renderCommandHeader('verify', 'Autonomous Change-Aware Verification');
    }

    const spinner = jsonMode
      ? null
      : createSpinner('Running verify pipeline (inspect → impact → test → diagnose → release)...').start();

    const result = await engine.verify({
      fullSuite: opts.full === true,
      includeSecurity: opts.security === true,
      includeA11y: opts.a11y === true,
      noHeal: opts.noHeal === true,
      intent: opts.intent,
      sandbox: opts.sandbox === true,
      dockerEnv: opts.dockerEnv === true
    });

    if (jsonMode) {
      // Pure JSON on stdout for agents/CI
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      const report = result.data;
      if (result.success) {
        spinner?.succeed(`Verify ${report?.verdict || result.status} in ${result.durationMs}ms`);
      } else {
        spinner?.fail(`Verify ${result.status}: ${result.errors[0]?.message || 'failed'}`);
      }

      if (report) {
        console.log(pc.bold('\nProject'));
        console.log(`  Frameworks: ${report.project.frameworks.join(', ') || 'n/a'}`);
        console.log(`  Test runners: ${report.project.testFrameworks.join(', ') || 'n/a'}`);

        console.log(pc.bold('\nChanges'));
        if (report.changes) {
          console.log(`  ${report.changes.changedFiles.length} files | ${report.changes.impactedTestFiles.length} impacted tests | risk ${report.changes.riskScore}`);
        } else {
          console.log('  (no impact data)');
        }

        console.log(pc.bold('\nQA Plan'));
        for (const phase of report.phases) {
          const mark = phase.status === 'ran' ? pc.green('✓') : phase.status === 'skipped' ? pc.dim('○') : pc.red('✗');
          console.log(`  ${mark} ${phase.capability} — ${phase.reason}${phase.summary ? pc.dim(` (${phase.summary})`) : ''}`);
        }

        console.log(pc.bold('\nSelection'));
        console.log(`  Mode: ${report.selection.mode}`);
        console.log(`  ${report.selection.reason}`);

        const run = report.retestRun || report.testRun;
        if (run) {
          console.log(pc.bold('\nResults'));
          console.log(`  ${run.summary.passed} passed / ${run.summary.failed} failed / ${run.summary.total} total`);
        }

        if (report.diagnoses.length) {
          console.log(pc.bold('\nDiagnosis'));
          for (const d of report.diagnoses) {
            console.log(`  • ${d.classification} (${Math.round(d.confidence * 100)}%): ${d.rootCause}`);
          }
        }

        if (report.evidencePack) {
          console.log(pc.bold('\nEvidence pack'));
          console.log(`  ${report.evidencePack.failureCount} failure(s) → ${report.evidencePack.indexPath}`);
          if (report.evidencePack.zipPath) {
            console.log(pc.dim(`  zip: ${report.evidencePack.zipPath}`));
          }
        }

        const vColor =
          report.verdict === 'PASS' ? pc.green : report.verdict === 'PASS_WITH_WARNINGS' ? pc.yellow : pc.red;
        console.log(pc.bold(vColor(`\nRelease: ${report.verdict}`)));
        for (const r of report.reasons.slice(0, 8)) {
          console.log(`  • ${r}`);
        }
      }

      for (const w of result.warnings) {
        console.log(pc.yellow(`⚠ ${w.message}`));
      }
    }

    if (opts.ci || jsonMode) {
      process.exitCode = result.data?.exitCode ?? (result.success ? 0 : 3);
    }
  });

// 9.59 history — local run history trends
program
  .command('history')
  .description('Show local test-run history trends (pass rate, duration, flaky count)')
  .option('-n, --limit <n>', 'Max history points to print', (v) => parseInt(v, 10), 20)
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    const engine = new VeloProveEngine(cwd);
    const snapshot = engine.getRunHistory();
    const limit = Math.max(1, Math.min(opts.limit || 20, 50));
    const points = snapshot.points.slice(-limit);

    if (opts.json) {
      console.log(JSON.stringify({ ...snapshot, points }, null, 2));
      return;
    }

    renderCommandHeader('history', 'Local Run History');
    console.log(pc.bold('\nAggregates'));
    console.log(`  Runs: ${snapshot.aggregates.runCount}`);
    console.log(`  Avg pass rate: ${snapshot.aggregates.avgPassRate}%`);
    console.log(`  Avg duration: ${snapshot.aggregates.avgDurationMs}ms`);
    console.log(`  Flaky: ${snapshot.aggregates.flakyCount}`);
    if (snapshot.aggregates.lastSecurityScore != null) {
      console.log(`  Last security score: ${snapshot.aggregates.lastSecurityScore}/100`);
    }

    console.log(pc.bold('\nRecent runs'));
    if (!points.length) {
      console.log(pc.dim('  (no runs recorded yet — run tests or verify first)'));
      return;
    }
    for (const p of points) {
      const rateColor = p.passRate >= 90 ? pc.green : p.passRate >= 70 ? pc.yellow : pc.red;
      console.log(
        `  ${pc.dim(p.timestamp)}  ${rateColor(`${p.passRate}%`)}  ${p.passed}/${p.total}  ${p.durationMs}ms  ${p.status}  ${pc.dim(p.runId)}`
      );
    }
  });

// 10. mcp
program
  .command('mcp')
  .description('Start VeloProve MCP Server over stdio')
  .action(async () => {
    await runMcpServer(process.cwd());
  });

// Project Twin (MVP) — composition over inspect SSOT
program
  .command('twin')
  .description(
    'Build or inspect Project Twin (local JSON model from inspect evidence; PARTIAL MVP — not AI assumptions)'
  )
  .argument('[action]', 'build | status | inspect', 'status')
  .argument('[featureId]', 'Feature id or title substring for inspect')
  .option('--with-impact', 'Attach change-impact facet (wraps `changed`)', false)
  .option('--with-drift', 'Attach aggregated drift facet (contract+parity+env+docs)', false)
  .option('--incremental', 'Reuse graph when fingerprint unchanged (default on)', true)
  .option('--force', 'Force full Twin rebuild', false)
  .option('--bypass-cache', 'Bypass inspect cache', false)
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (action: string, featureId: string | undefined, opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const act = (action || 'status').toLowerCase();

    if (act === 'build' || act === 'update') {
      const result =
        act === 'update'
          ? await engine.twinUpdate({
              withImpact: !!opts.withImpact,
              withDrift: !!opts.withDrift,
              force: !!opts.force,
              bypassCache: !!opts.bypassCache
            })
          : await engine.twinBuild({
              withImpact: !!opts.withImpact,
              withDrift: !!opts.withDrift,
              incremental: opts.incremental !== false,
              force: !!opts.force,
              bypassCache: !!opts.bypassCache
            });
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      const twin = result.data!;
      console.log(pc.bold(pc.cyan('\n=== VeloProve Project Twin ===')));
      console.log(`Status: ${result.status} · verificationStatus=PARTIAL (MVP)`);
      console.log(`Fingerprint: ${twin.fingerprint}`);
      if (result.metadata?.incremental) {
        console.log(pc.dim(`Incremental: ${result.metadata.skippedRebuild ? 'skipped rebuild' : 'reused graph'}`));
      }
      console.log(
        `Summary: ${twin.summary.features} features · ${twin.summary.sourceFiles} sources · ${twin.summary.testFiles} tests · ${twin.summary.routes} routes · ${twin.summary.apiEndpoints} APIs`
      );
      console.log(`Nodes: ${twin.nodes.length} · Edges: ${twin.edges.length}`);
      const classes = result.metadata?.evidenceClasses as Record<string, number> | undefined;
      if (classes) {
        console.log(
          `Evidence: VERIFIED=${classes.VERIFIED || 0} OBSERVED=${classes.OBSERVED || 0} INFERRED=${classes.INFERRED || 0} STALE=${classes.STALE || 0} UNKNOWN=${classes.UNKNOWN || 0}`
        );
      }
      if (twin.facets.impact?.included) {
        console.log(
          `Impact facet: ${twin.facets.impact.changedFiles.length} changed · ${twin.facets.impact.items.length} items (source=${twin.facets.impact.source})`
        );
      }
      if (twin.facets.drift?.included) {
        console.log(
          `Drift facet: ${twin.facets.drift.items.length} items · score=${twin.facets.drift.compatibilityScore ?? 'n/a'} (source=${twin.facets.drift.source})`
        );
      }
      console.log(pc.dim(`Wrote .veloprove/twin/latest.json`));
      for (const w of result.warnings.slice(0, 5)) {
        console.log(pc.yellow(`⚠ ${w.message}`));
      }
      return;
    }

    if (act === 'inspect') {
      const q = featureId || '';
      if (!q) {
        console.error(pc.red('Usage: veloprove twin inspect <featureId|title>'));
        process.exitCode = 1;
        return;
      }
      let twin = engine.twinStatus();
      if (!twin) {
        await engine.twinBuild({});
        twin = engine.twinStatus();
      }
      const found = engine.twinInspect(q);
      if (opts.json) {
        console.log(JSON.stringify(found, null, 2));
        return;
      }
      if (!found.found || !found.node) {
        console.log(pc.yellow(`No Twin feature node matching "${q}". Run: veloprove twin build`));
        return;
      }
      console.log(pc.bold(pc.cyan(`\n=== Twin inspect: ${found.node.title} ===`)));
      console.log(`Id: ${found.node.id} · kind=${found.node.kind}`);
      console.log(
        `Evidence: ${found.node.evidence.map((e) => `${e.class}:${e.summary}`).join(' | ')}`
      );
      console.log(`Edges (${found.edges.length}):`);
      for (const e of found.edges.slice(0, 40)) {
        console.log(`  ${e.from} —${e.kind}/${e.evidenceClass}→ ${e.to}`);
      }
      return;
    }

    // status (default)
    const twin = engine.twinStatus();
    if (opts.json) {
      console.log(JSON.stringify(twin, null, 2));
      return;
    }
    if (!twin) {
      console.log(pc.yellow('No Twin snapshot yet. Run: veloprove twin build'));
      return;
    }
    console.log(pc.bold(pc.cyan('\n=== Project Twin status ===')));
    console.log(`Generated: ${twin.generatedAt}`);
    console.log(`Fingerprint: ${twin.fingerprint}`);
    console.log(
      `Features ${twin.summary.features} · sources ${twin.summary.sourceFiles} · tests ${twin.summary.testFiles}`
    );
    console.log(`Nodes ${twin.nodes.length} · Edges ${twin.edges.length}`);
    console.log(pc.dim('PARTIAL MVP — see docs/guides/trust.md honesty; Twin is planned composition layer.'));
  });

program
  .command('impact')
  .description(
    'Change impact analysis (wraps `changed`; attaches Twin feature hits when snapshot exists)'
  )
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const { impact, twinAttached, relatedFeatures } = await engine.impactAnalysis();
    if (opts.json) {
      console.log(JSON.stringify({ impact, twinAttached, relatedFeatures }, null, 2));
      return;
    }
    console.log(pc.bold(pc.cyan('\n=== Impact (wraps changed) ===')));
    console.log(`Changed files: ${impact.changedFiles.length}`);
    for (const cf of impact.changedFiles.slice(0, 30)) console.log(`  • ${cf}`);
    console.log(`Impacted tests: ${impact.impactedTestFiles.length}`);
    for (const t of impact.impactedTestFiles.slice(0, 30)) console.log(`  🎯 ${t}`);
    if (twinAttached) {
      console.log(`Twin-related features: ${relatedFeatures.length}`);
      for (const f of relatedFeatures.slice(0, 20)) console.log(`  ◆ ${f.title} (${f.id})`);
    } else {
      console.log(pc.dim('Tip: run `veloprove twin build` to attach Twin feature context.'));
    }
  });

program
  .command('drift')
  .description(
    'Aggregated drift (wraps contract-drift + feature-parity + env-drift + docs hints; Twin STALE when fingerprint disagrees)'
  )
  .argument('[feature]', 'Optional feature/path filter')
  .option('--changed', 'Limit items to paths overlapping git changes', false)
  .option('--json', 'Emit machine-readable JSON', false)
  .action(async (feature: string | undefined, opts) => {
    const engine = new VeloProveEngine(process.cwd());
    const report = await engine.drift({
      feature: feature || undefined,
      changed: !!opts.changed
    });
    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    console.log(pc.bold(pc.cyan('\n=== VeloProve Drift (aggregator) ===')));
    console.log(`Sources: ${report.sources.join(', ') || '(none)'}`);
    console.log(`Items: ${report.items.length} · docs stale hints: ${report.docsStaleHints}`);
    if (report.contract) {
      console.log(`Contract compatibility: ${report.contract.compatibilityScore}`);
    }
    if (report.parity) {
      console.log(`Feature parity: ${report.parity.parityScore}% (${report.parity.overallStatus})`);
    }
    if (report.env) {
      console.log(`Env health: ${report.env.healthScore} (${report.env.verdict})`);
    }
    for (const item of report.items.slice(0, 40)) {
      const sev =
        item.severity === 'high' ? pc.red : item.severity === 'medium' ? pc.yellow : pc.dim;
      console.log(
        `  ${sev(`[${item.severity}/${item.evidenceClass}]`)} ${item.category}: ${item.summary}`
      );
    }
    if (report.items.length > 40) {
      console.log(pc.dim(`  … and ${report.items.length - 40} more`));
    }
    for (const w of report.warnings.slice(0, 5)) {
      console.log(pc.yellow(`⚠ ${w}`));
    }
    console.log(pc.dim('Related engines: contract-drift · feature-parity · env-drift (not aliases)'));
  });

export { program };

const isDirectRun = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return /cli[\\/]index\.(ts|js)$/.test(entry);
  }
})();

if (isDirectRun) {
  program.parse(process.argv);
}
