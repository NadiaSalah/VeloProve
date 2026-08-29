import readline from 'node:readline';
import pc from 'picocolors';

export interface InitPromptAnswers {
  testFramework: 'vitest' | 'playwright' | 'jest' | 'auto';
  configureMcp: boolean;
  mcpTargets: Array<'cursor' | 'claude' | 'windsurf'>;
  installDependencies: boolean;
}

/**
 * Asks interactive setup questions during `qaforge init`
 */
export async function promptInitQuestions(detectedStack: {
  projectName: string;
  frameworks: string[];
  testFrameworks: string[];
}): Promise<InitPromptAnswers> {
  // If not running in an interactive terminal or CI environment, return defaults
  if (!process.stdin.isTTY || process.env.CI) {
    return {
      testFramework: 'auto',
      configureMcp: true,
      mcpTargets: ['cursor'],
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
    console.log(pc.bold(pc.white('\n🔧 Interactive Project Setup:')));
    
    // 1. Test runner preference
    console.log(`\n1. Select primary test runner:`);
    console.log(`   ${pc.cyan('1)')} Vitest ${pc.dim('(Fast, modern unit/integration testing - Recommended)')}`);
    console.log(`   ${pc.cyan('2)')} Playwright ${pc.dim('(End-to-End browser & visual regression testing)')}`);
    console.log(`   ${pc.cyan('3)')} Jest ${pc.dim('(Standard enterprise testing framework)')}`);
    console.log(`   ${pc.cyan('4)')} Auto-detect from codebase ${pc.dim(`(Currently: ${detectedStack.testFrameworks.join(', ') || 'None'})`)}`);
    
    const runnerChoice = await ask(`   ${pc.bold('Choice [1-4] (default: 1):')} `);
    let testFramework: InitPromptAnswers['testFramework'] = 'vitest';
    if (runnerChoice === '2') testFramework = 'playwright';
    else if (runnerChoice === '3') testFramework = 'jest';
    else if (runnerChoice === '4') testFramework = 'auto';

    // 2. AI Agent MCP Integration
    console.log(`\n2. Configure AI Agent MCP integration (Local-first Model Context Protocol)?`);
    console.log(`   ${pc.cyan('Y)')} Yes, generate .cursor/mcp.json and agent instructions (Recommended)`);
    console.log(`   ${pc.cyan('N)')} No, skip MCP configuration`);
    
    const mcpChoice = await ask(`   ${pc.bold('Enable MCP [Y/n] (default: Y):')} `);
    const configureMcp = !mcpChoice.toLowerCase().startsWith('n');

    let mcpTargets: InitPromptAnswers['mcpTargets'] = ['cursor'];
    if (configureMcp) {
      console.log(`\n3. Select target AI coding assistants:`);
      console.log(`   ${pc.cyan('1)')} Cursor Desktop / IDE (.cursor/mcp.json)`);
      console.log(`   ${pc.cyan('2)')} Cursor + Claude Code + Windsurf`);
      console.log(`   ${pc.cyan('3)')} All Supported Agents`);
      
      const agentChoice = await ask(`   ${pc.bold('Target [1-3] (default: 1):')} `);
      if (agentChoice === '2' || agentChoice === '3') {
        mcpTargets = ['cursor', 'claude', 'windsurf'];
      }
    }

    rl.close();
    return {
      testFramework,
      configureMcp,
      mcpTargets,
      installDependencies: false
    };
  } catch {
    rl.close();
    return {
      testFramework: 'auto',
      configureMcp: true,
      mcpTargets: ['cursor'],
      installDependencies: false
    };
  }
}
