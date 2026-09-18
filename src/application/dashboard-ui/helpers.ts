export interface DashboardUiData {
  profile: {
    projectName?: string;
    packageManager?: string;
    frameworks?: string[];
    testFrameworks?: string[];
    routes?: unknown[];
    apiEndpoints?: Array<{ method: string; path: string; filePath?: string }>;
  };
  heatmap: {
    items: Array<{
      id: string;
      title: string;
      coverageLevel: string;
      associatedTestsCount?: number;
      passRate?: number;
    }>;
    overallCoverageScore: number;
    fullCount: number;
    partialCount: number;
    uncoveredCount: number;
  };
  runs: Array<{
    runId: string;
    status: string;
    summary?: { total: number; passed: number; failed: number; durationMs?: number };
    startedAt?: string;
  }>;
  secAudit: {
    score: number;
    totalVulnerabilities: number;
    findings?: Array<{ severity: string; title: string; packageName?: string }>;
  };
  perfAudit: {
    overallScore: number;
    rating: string;
    totalRoutesProfiled: number;
    routes?: Array<{ path: string; lcp?: number; cls?: number; rating?: string }>;
  };
  quarantined: Array<{
    testTitle: string;
    testFile?: string;
    reason?: string;
    flakinessRate?: number;
  }>;
  history?: {
    aggregates: {
      runCount: number;
      avgPassRate: number;
      avgDurationMs: number;
      flakyCount: number;
      lastSecurityScore?: number;
      currentBranch?: string;
      currentMttrHours?: number | null;
      regressionAlert?: boolean;
    };
    charts: {
      passRate: number[];
      durationMs: number[];
    };
  };
}

export function sparkline(values: number[], color: string): string {
  if (!values.length) {
    return '<svg width="220" height="48" aria-hidden="true"><text x="8" y="28" fill="#888" font-size="11">No data</text></svg>';
  }
  const w = 220;
  const h = 48;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const pts = values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 8) + 4;
      const y = h - 6 - ((v - min) / span) * (h - 12);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`;
}

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escAttr(value: unknown): string {
  return esc(value).replace(/'/g, '&#39;');
}

export function coverageClass(level: string): string {
  const l = (level || '').toLowerCase();
  if (l.includes('full')) return 'ok';
  if (l.includes('partial')) return 'warn';
  return 'bad';
}

export function sevClass(sev: string): string {
  const s = (sev || '').toLowerCase();
  if (s.includes('high') || s.includes('critical')) return 'bad';
  if (s.includes('med') || s.includes('warn')) return 'warn';
  return 'ok';
}
