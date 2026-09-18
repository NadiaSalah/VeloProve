import readline from 'node:readline';
import pc from 'picocolors';
import type { AiEditorTarget } from '../application/ai-link.js';
import { detectAiEditors, editorsWithHints } from '../application/ai-link.js';

export interface InitPromptAnswers {
  testFramework: 'vitest' | 'playwright' | 'jest' | 'node:test' | 'auto';
  configureMcp: boolean;
  mcpTargets: AiEditorTarget[];
  teachAi: boolean;
  installDependencies: boolean;
}

/**
 * Asks interactive setup questions during `veloprove init`
 */
export async function promptInitQuestions(
  detectedStack: {
    projectName: string;
    frameworks: string[];
    testFrameworks: string[];
  },
  projectRoot = process.cwd()
): Promise<InitPromptAnswers> {
  const detected = detectAiEditors(projectRoot);
  const hinted = editorsWithHints(detected);
  const hintLabel =
    hinted.length > 0 ? hinted.map((h) => h.label).join(', ') : 'none detected';

  // If not running in an interactive terminal or CI environment, return defaults
  if (!process.stdin.isTTY || process.env.CI) {
    return {
      testFramework: 'auto',
      configureMcp: hinted.length > 0,
      mcpTargets: hinted.length > 0 ? hinted.map((h) => h.id) : ['cursor'],
      teachAi: hinted.length > 0,
      installDependencies: false
    };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, (ans) => resolve(ans.trim())));
  };

  try {
    console.log(pc.bold(pc.white('\nInteractive Project Setup:')));

    console.log(`\n1. Select primary test runner:`);
    console.log(`   ${pc.cyan('1)')} Vitest ${pc.dim('(Recommended)')}`);
    console.log(`   ${pc.cyan('2)')} Playwright`);
    console.log(`   ${pc.cyan('3)')} Jest`);
    console.log(`   ${pc.cyan('4)')} node:test ${pc.dim('(Node built-in)')}`);
    console.log(
      `   ${pc.cyan('5)')} Auto-detect ${pc.dim(`(Currently: ${detectedStack.testFrameworks.join(', ') || 'None'})`)}`
    );

    const runnerChoice = await ask(`   ${pc.bold('Choice [1-5] (default: 1):')} `);
    let testFramework: InitPromptAnswers['testFramework'] = 'vitest';
    if (runnerChoice === '2') testFramework = 'playwright';
    else if (runnerChoice === '3') testFramework = 'jest';
    else if (runnerChoice === '4') testFramework = 'node:test';
    else if (runnerChoice === '5') testFramework = 'auto';

    console.log(`\n2. Link AI coding agents to VeloProve? ${pc.dim(`(hints: ${hintLabel})`)}`);
    console.log(`   ${pc.cyan('1)')} Auto — use detected editors + teach AI (Recommended)`);
    console.log(`   ${pc.cyan('2)')} Cursor only (.cursor/mcp.json) + teach AI`);
    console.log(`   ${pc.cyan('3)')} Cursor + Claude + Windsurf + teach AI`);
    console.log(`   ${pc.cyan('4)')} Skip AI link for now`);

    const aiChoice = await ask(`   ${pc.bold('Choice [1-4] (default: 1):')} `);
    let configureMcp = true;
    let teachAi = true;
    let mcpTargets: AiEditorTarget[] = hinted.length > 0 ? hinted.map((h) => h.id) : ['cursor'];

    if (aiChoice === '2') {
      mcpTargets = ['cursor'];
    } else if (aiChoice === '3') {
      mcpTargets = ['cursor', 'claude', 'windsurf'];
    } else if (aiChoice === '4') {
      configureMcp = false;
      teachAi = false;
      mcpTargets = [];
    } else {
      // default / 1 = auto
      mcpTargets = hinted.length > 0 ? hinted.map((h) => h.id) : ['cursor'];
    }

    rl.close();
    return {
      testFramework,
      configureMcp,
      mcpTargets,
      teachAi,
      installDependencies: false
    };
  } catch {
    rl.close();
    return {
      testFramework: 'auto',
      configureMcp: true,
      mcpTargets: ['cursor'],
      teachAi: true,
      installDependencies: false
    };
  }
}
