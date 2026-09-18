import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { LocalStorage } from '../storage/local-store.js';
import { SecurityAuditService } from './security-audit.js';
import { PerformanceProfilerService } from './perf-profiler.js';
import { CoverageHeatmapService } from './coverage-heatmap.js';
import { ReleaseCheckService } from './release-check.js';
import { QuarantineService } from './quarantine-service.js';
import { JUnitExporter } from './junit-exporter.js';
import { AllureExporter } from './allure-exporter.js';
import { buildSimplePdf, writeSimplePdf } from './simple-pdf.js';

export interface StandaloneReportOptions {
  outputPath?: string;
  format?: 'html' | 'json' | 'markdown' | 'junit' | 'pdf' | 'allure';
  title?: string;
  /** When true, build content and return suggested path without writing to disk. */
  preview?: boolean;
  /** When true, return full file content for client-side Save As (no write). */
  download?: boolean;
}

export interface StandaloneReportFilePart {
  name: string;
  content: string;
}

export interface StandaloneReportResult {
  filePath: string;
  format: string;
  sizeBytes: number;
  /** False when `preview` / `download` was requested (nothing written yet). */
  saved: boolean;
  /** Human-readable or source preview for dashboard / CLI dry-run. */
  previewText?: string;
  /** Suggested filename for Save As dialogs. */
  suggestedName?: string;
  mimeType?: string;
  /** Full UTF-8 content for single-file downloads. */
  content?: string;
  /** Base64 payload for binary-ish formats (PDF). */
  contentBase64?: string;
  /** Multi-file bundle (Allure). */
  files?: StandaloneReportFilePart[];
  /** True when the export is a directory of files. */
  isDirectory?: boolean;
}

function suggestedNameFor(format: string, outputPath?: string): string {
  if (outputPath) return path.basename(outputPath);
  switch (format) {
    case 'junit':
      return 'veloprove-junit.xml';
    case 'allure':
      return 'allure-results';
    case 'json':
      return 'veloprove-report.json';
    case 'pdf':
      return 'veloprove-executive-report.pdf';
    case 'markdown':
      return 'veloprove-report.md';
    default:
      return 'veloprove-executive-report.html';
  }
}

function mimeFor(format: string): string {
  switch (format) {
    case 'junit':
      return 'application/xml';
    case 'json':
      return 'application/json';
    case 'pdf':
      return 'application/pdf';
    case 'markdown':
      return 'text/markdown';
    case 'allure':
      return 'application/json';
    default:
      return 'text/html';
  }
}

export class StandaloneReportExporter {
  public static export(
    guard: WorkspaceGuard,
    storage: LocalStorage,
    options: StandaloneReportOptions = {}
  ): StandaloneReportResult {
    const format = options.format || 'html';
    const preview = Boolean(options.preview);
    const download = Boolean(options.download);
    const latestRun = storage.getLatestTestRun();
    const suggestedName = suggestedNameFor(format, options.outputPath);
    const mimeType = mimeFor(format);

    if (format === 'junit') {
      if (!latestRun) {
        throw new Error('No test run available to export as JUnit XML. Run `veloprove test` first.');
      }
      const suggested = guard.resolveSafePath(options.outputPath || suggestedName);
      const built = JUnitExporter.buildXml(latestRun);
      if (preview || download) {
        const previewText = preview
          ? `JUnit XML export preview\n` +
            `Suggested name: ${suggestedName}\n` +
            `Run status: ${latestRun.status} · ${latestRun.summary.passed}/${latestRun.summary.total} passed\n\n` +
            (built.xml.length > 8000 ? built.xml.slice(0, 8000) + '\n\n… [preview truncated]' : built.xml)
          : undefined;
        return {
          filePath: suggested,
          format: 'junit',
          sizeBytes: Buffer.byteLength(built.xml, 'utf8'),
          saved: false,
          previewText,
          suggestedName,
          mimeType,
          content: download ? built.xml : undefined
        };
      }
      const out = JUnitExporter.fromTestRun(
        guard,
        latestRun,
        options.outputPath || suggestedName
      );
      return {
        filePath: out.filePath,
        format: 'junit',
        sizeBytes: out.sizeBytes,
        saved: true,
        suggestedName,
        mimeType
      };
    }

    if (format === 'allure') {
      if (!latestRun) {
        throw new Error('No test run available to export as Allure results. Run `veloprove test` first.');
      }
      const suggested = guard.resolveSafePath(options.outputPath || suggestedName);
      const built = AllureExporter.buildFiles(latestRun);
      if (preview || download) {
        const previewText =
          `Allure results directory preview\n` +
          `Suggested folder: ${suggestedName}\n` +
          `Files: ${built.files.length} · Run: ${latestRun.status} · ${latestRun.summary.total} tests\n` +
          built.files.map((f) => `• ${f.name}`).join('\n');
        return {
          filePath: suggested,
          format: 'allure',
          sizeBytes: built.files.reduce((n, f) => n + Buffer.byteLength(f.content, 'utf8'), 0),
          saved: false,
          previewText,
          suggestedName,
          mimeType,
          isDirectory: true,
          files: download ? built.files : undefined
        };
      }
      const out = AllureExporter.fromTestRun(
        guard,
        latestRun,
        options.outputPath || suggestedName
      );
      return {
        filePath: out.dirPath,
        format: 'allure',
        sizeBytes: out.resultFiles,
        saved: true,
        suggestedName,
        mimeType,
        isDirectory: true
      };
    }

    const filename =
      options.outputPath ||
      (format === 'html'
        ? 'veloprove-executive-report.html'
        : format === 'json'
          ? 'veloprove-report.json'
          : format === 'pdf'
            ? 'veloprove-executive-report.pdf'
            : 'veloprove-report.md');
    const resolvedPath = guard.resolveSafePath(filename);

    const profile = storage.getProjectProfile() || {
      projectName: 'ActiveProject',
      frameworks: ['nodejs'],
      testFrameworks: [],
      routes: [],
      apiEndpoints: []
    } as any;
    const reqs = storage.getRequirements() || [];
    const flakyHistory = storage.getFlakyHistory() || [];
    const secAudit = SecurityAuditService.audit(guard);
    const perfAudit = PerformanceProfilerService.profile(profile, guard);
    const heatmap = CoverageHeatmapService.generateHeatmap(reqs, profile, latestRun);
    const release = ReleaseCheckService.evaluate({
      requirements: reqs,
      latestRun: latestRun || null,
      diagnoses: [],
      flakyTests: flakyHistory
    });
    const quarantined = QuarantineService.getQuarantined(guard);

    if (format === 'pdf') {
      const lines = [
        `Generated: ${new Date().toUTCString()}`,
        `Project: ${profile.projectName}`,
        `Verdict: ${release.verdict} (${release.confidenceScore}/100)`,
        '',
        `Requirements coverage: ${heatmap.overallCoverageScore}%`,
        `Latest tests: ${latestRun?.summary.passed || 0}/${latestRun?.summary.total || 0} passed`,
        `Security health: ${secAudit.score}/100 (${secAudit.totalVulnerabilities} issues)`,
        `Performance: ${perfAudit.overallScore}/100 (${perfAudit.rating})`,
        `Quarantined: ${quarantined.length}`,
        '',
        ...release.blockers.map((b: string) => `Blocker: ${b}`),
        ...release.recommendations.slice(0, 8).map((r: string) => `Rec: ${r}`)
      ];
      const previewText = lines.join('\n');
      const pdfBody = buildSimplePdf(options.title || 'VeloProve Executive Report', lines);
      if (preview || download) {
        return {
          filePath: resolvedPath,
          format: 'pdf',
          sizeBytes: Buffer.byteLength(pdfBody, 'utf8'),
          saved: false,
          previewText,
          suggestedName,
          mimeType,
          contentBase64: download ? Buffer.from(pdfBody, 'utf8').toString('base64') : undefined
        };
      }
      const sizeBytes = writeSimplePdf(
        resolvedPath,
        options.title || 'VeloProve Executive Report',
        lines
      );
      return {
        filePath: resolvedPath,
        format: 'pdf',
        sizeBytes,
        saved: true,
        previewText,
        suggestedName,
        mimeType
      };
    }

    let outputContent = '';

    if (format === 'json') {
      outputContent = JSON.stringify({
        generatedAt: new Date().toISOString(),
        profile,
        release,
        heatmap,
        security: secAudit,
        performance: perfAudit,
        quarantined,
        latestRun
      }, null, 2);
    } else if (format === 'markdown') {
      outputContent = `# VeloProve Executive QA & Security Audit Report
**Generated:** ${new Date().toUTCString()}  
**Project:** ${profile.projectName}  
**Verdict:** **${release.verdict}** (Score: ${release.confidenceScore}/100)

## Executive Summary
- **Requirements Coverage:** ${heatmap.overallCoverageScore}% (${heatmap.fullCount} Full, ${heatmap.partialCount} Partial, ${heatmap.uncoveredCount} Gaps)
- **Latest Test Suite:** ${latestRun?.status ? latestRun.status.toUpperCase() : 'NO RUNS'} (${latestRun?.summary.passed || 0}/${latestRun?.summary.total || 0} passed)
- **Security Health:** ${secAudit.score}/100 (${secAudit.totalVulnerabilities} issues)
- **Performance Rating:** ${perfAudit.overallScore}/100 (${perfAudit.rating})

## Discovered Routes & APIs (${(profile.routes || []).length + (profile.apiEndpoints || []).length} Total)
${(profile.apiEndpoints || []).map((ep: any) => `- **${ep.method}** \`${ep.path}\` (${ep.authRequired ? 'Protected' : 'Public'})`).join('\n')}
`;
    } else {
      // Standalone single-page responsive HTML
      outputContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title || 'VeloProve Executive QA Audit Report'}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --border: #1f2937;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --primary: #38bdf8;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; max-width: 1200px; margin: 0 auto; line-height: 1.6; }
    header { border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; }
    .metric { font-size: 2rem; font-weight: 800; font-family: monospace; margin-top: 0.25rem; }
    .metric-success { color: var(--success); }
    .metric-danger { color: var(--danger); }
    .metric-primary { color: var(--primary); }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    th { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; }
    .tag { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .tag-pass { background: rgba(52, 211, 153, 0.2); color: var(--success); }
    .tag-fail { background: rgba(248, 113, 113, 0.2); color: var(--danger); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1 style="margin: 0; font-size: 1.8rem; color: #fff;">⚡ VeloProve Executive Quality & Security Audit</h1>
      <p style="color: var(--text-muted); margin-top: 0.25rem;">Project: <strong>${profile.projectName}</strong> | Generated: ${new Date().toUTCString()}</p>
    </div>
    <div style="text-align: right;">
      <span class="tag ${release.verdict === 'READY' ? 'tag-pass' : 'tag-fail'}" style="font-size: 1rem; padding: 0.5rem 1rem;">
        ${release.verdict} (${release.confidenceScore}/100)
      </span>
    </div>
  </header>

  <div class="grid">
    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.8rem;">Requirements Coverage</div>
      <div class="metric metric-primary">${heatmap.overallCoverageScore}%</div>
      <small style="color: var(--text-muted);">${heatmap.fullCount} Full / ${heatmap.uncoveredCount} Gaps</small>
    </div>
    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.8rem;">Latest Test Run</div>
      <div class="metric ${latestRun?.status === 'passed' ? 'metric-success' : 'metric-danger'}">
        ${latestRun?.status ? latestRun.status.toUpperCase() : 'NO RUNS'}
      </div>
      <small style="color: var(--text-muted);">${latestRun?.summary.passed || 0}/${latestRun?.summary.total || 0} Passed</small>
    </div>
    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.8rem;">Security Health</div>
      <div class="metric ${secAudit.score >= 80 ? 'metric-success' : 'metric-danger'}">${secAudit.score}/100</div>
      <small style="color: var(--text-muted);">${secAudit.totalVulnerabilities} Issue(s) flagged</small>
    </div>
    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.8rem;">Performance Rating</div>
      <div class="metric metric-primary">${perfAudit.overallScore}/100</div>
      <small style="color: var(--text-muted);">${perfAudit.rating}</small>
    </div>
  </div>

  <div class="card" style="margin-bottom: 2rem;">
    <h3 style="margin: 0;">Requirements & Test Coverage Matrix</h3>
    <table>
      <thead>
        <tr><th>Req ID</th><th>Title</th><th>Priority</th><th>Coverage</th><th>Pass Rate</th></tr>
      </thead>
      <tbody>
        ${heatmap.items.map(i => `
          <tr>
            <td><code>${i.id}</code></td>
            <td><strong>${i.title}</strong></td>
            <td>${i.priority.toUpperCase()}</td>
            <td><span class="tag ${i.coverageLevel === 'FULL' ? 'tag-pass' : 'tag-fail'}">${i.coverageLevel}</span></td>
            <td>${i.passRate}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
    }

    const sizeBytes = Buffer.byteLength(outputContent, 'utf8');
    const previewText =
      outputContent.length > 14000
        ? outputContent.slice(0, 14000) + '\n\n… [preview truncated]'
        : outputContent;

    if (preview || download) {
      return {
        filePath: resolvedPath,
        format,
        sizeBytes,
        saved: false,
        previewText,
        suggestedName,
        mimeType,
        content: download ? outputContent : undefined
      };
    }

    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, outputContent, 'utf8');

    return {
      filePath: resolvedPath,
      format,
      sizeBytes,
      saved: true,
      previewText,
      suggestedName,
      mimeType
    };
  }
}
