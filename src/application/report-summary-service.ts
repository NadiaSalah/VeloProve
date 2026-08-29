import fs from 'node:fs';
import path from 'node:path';

export interface SummaryReportOptions {
  projectRoot: string;
  commandName: string;
  title: string;
  verdict?: 'PASSED' | 'FAILED' | 'WARNINGS' | 'HEALTHY' | 'CRITICAL_ISSUES' | 'READY' | 'READY_WITH_WARNINGS' | 'NOT_READY' | 'INFO' | string;
  metrics?: Record<string, string | number>;
  details?: string[];
  recommendations?: string[];
}

export class ReportSummaryService {
  /**
   * Generates and writes `.qaforge/reports/latest-summary.md` and preserves structured execution log
   */
  public static writeSummary(options: SummaryReportOptions): string {
    const { projectRoot, commandName, title, verdict, metrics, details, recommendations } = options;
    const reportsDir = path.join(projectRoot, '.qaforge', 'reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString();

    let md = `# ⚡ QAForge Execution Summary\n\n`;
    md += `> **Command:** \`qaforge ${commandName}\`  \n`;
    md += `> **Timestamp:** \`${formattedDate}\` (\`${timestamp}\`)  \n`;
    if (verdict) {
      const badgeColor = verdict === 'PASSED' || verdict === 'HEALTHY' ? 'brightgreen' : verdict === 'WARNINGS' ? 'yellow' : 'red';
      md += `> **Status:** ![Status](https://img.shields.io/badge/Status-${verdict}-${badgeColor}?style=flat-square)\n\n`;
    }

    md += `## 📋 ${title}\n\n`;

    if (metrics && Object.keys(metrics).length > 0) {
      md += `### 📊 Key Metrics\n\n`;
      md += `| Metric | Value |\n| :--- | :--- |\n`;
      for (const [k, v] of Object.entries(metrics)) {
        md += `| **${k}** | \`${v}\` |\n`;
      }
      md += `\n`;
    }

    if (details && details.length > 0) {
      md += `### 🔍 Inspection & Execution Details\n\n`;
      for (const d of details) {
        md += `- ${d}\n`;
      }
      md += `\n`;
    }

    if (recommendations && recommendations.length > 0) {
      md += `### 💡 Recommended Next Steps\n\n`;
      for (const r of recommendations) {
        md += `1. ${r}\n`;
      }
      md += `\n`;
    }

    md += `---\n*Generated automatically by [QAForge](https://github.com/NadiaSalah/QAForge) — Local-First Agentic QA Engine.*\n`;

    const summaryPath = path.join(reportsDir, 'latest-summary.md');
    try {
      fs.writeFileSync(summaryPath, md, 'utf8');
    } catch {
      // ignore write errors if restricted
    }

    return summaryPath;
  }
}
