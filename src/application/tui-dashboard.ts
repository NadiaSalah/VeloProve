import pc from 'picocolors';
import type { QAForgeEngine } from './engine.js';

export class TuiDashboardService {
  public static async renderTui(engine: QAForgeEngine): Promise<void> {
    const { profile, requirements } = await engine.inspect();
    const latestRun = engine.storage.getLatestTestRun();
    const secAudit = engine.auditSecurity();
    const perfAudit = await engine.profilePerf();
    const heatmap = await engine.getCoverageHeatmap();

    console.clear();
    console.log(pc.bold(pc.cyan('╔════════════════════════════════════════════════════════════════════╗')));
    console.log(pc.bold(pc.cyan('║               ⚡ QAForge Autonomous Terminal Command Center         ║')));
    console.log(pc.bold(pc.cyan('╚════════════════════════════════════════════════════════════════════╝')));

    console.log(pc.dim(` Project: ${pc.bold(profile.projectName)} | Stack: ${profile.frameworks.join(', ') || 'Node.js'} | Runners: ${profile.testFrameworks.join(', ') || 'Vitest'}`));
    console.log('───────────────────────────────────────────────────────────────────────');

    // Matrix overview
    console.log(pc.bold('\n📊 System Quality & Readiness Matrix:'));
    console.log(`  • Requirements: ${pc.bold(requirements.length)} total | Coverage: ${pc.green(`${heatmap.overallCoverageScore}%`)} (Full: ${heatmap.fullCount}, Partial: ${heatmap.partialCount}, Gaps: ${heatmap.uncoveredCount})`);
    
    const runStatus = latestRun?.status === 'passed' ? pc.green('PASSED') : latestRun?.status ? pc.red('FAILED') : pc.yellow('NO RUN');
    console.log(`  • Latest Test Run: ${runStatus} | ${latestRun ? `${latestRun.summary.passed}/${latestRun.summary.total} Passed (${latestRun.durationMs}ms)` : 'Run tests to populate'}`);

    const secColor = secAudit.score > 80 ? pc.green : pc.yellow;
    console.log(`  • Security & Secrets: ${secColor(`${secAudit.score}/100`)} (${secAudit.totalVulnerabilities} issues flagged)`);

    const perfColor = perfAudit.overallScore > 80 ? pc.green : pc.yellow;
    console.log(`  • Core Web Vitals / Perf: ${perfColor(`${perfAudit.overallScore}/100`)} (${perfAudit.rating})`);

    // Traceability sample
    console.log(pc.bold('\n📋 Requirement Coverage Heatmap (Sample):'));
    for (const item of heatmap.items.slice(0, 6)) {
      const badge = item.coverageLevel === 'FULL' ? pc.green('[FULL]') : item.coverageLevel === 'PARTIAL' ? pc.yellow('[PART]') : pc.red('[NONE]');
      console.log(`  ${badge} ${pc.bold(item.id)}: ${item.title.slice(0, 45)}... (Pass Rate: ${item.passRate}%)`);
    }

    console.log('\n───────────────────────────────────────────────────────────────────────');
    console.log(pc.bold(pc.green('🚀 Quick Actions:')));
    console.log(`  ${pc.cyan('qaforge test')}         Run full test suites`);
    console.log(`  ${pc.cyan('qaforge changed')}      Run only impacted tests`);
    console.log(`  ${pc.cyan('qaforge lint --fix')}   Auto-fix ESLint code issues`);
    console.log(`  ${pc.cyan('qaforge audit')}        Run security vulnerability & secret scan`);
    console.log(`  ${pc.cyan('qaforge perf')}         Audit Core Web Vitals`);
    console.log(`  ${pc.cyan('qaforge mock-gen')}     Generate MSW network mocks`);
    console.log(`  ${pc.cyan('qaforge ui')}           Open browser interactive dashboard`);
    console.log('───────────────────────────────────────────────────────────────────────\n');
  }
}
