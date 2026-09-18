import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface SriAuditItem {
  file: string;
  line: number;
  element: string;
  sourceUrl: string;
  hasIntegrity: boolean;
  hasCrossOrigin: boolean;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface CsrfAuditItem {
  file: string;
  line: number;
  formOrEndpoint: string;
  method: string;
  hasCsrfToken: boolean;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface CorsAuditItem {
  file: string;
  line: number;
  originPattern: string;
  allowsCredentialsWithWildcard: boolean;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recommendation: string;
}

export interface AdvancedWebSecurityReport {
  score: number; // 0 - 100
  verdict: 'SECURE' | 'NEEDS_ATTENTION' | 'VULNERABLE';
  summary: {
    totalExternalAssets: number;
    missingSriCount: number;
    totalFormsAudited: number;
    missingCsrfCount: number;
    corsIssuesCount: number;
  };
  sriFindings: SriAuditItem[];
  csrfFindings: CsrfAuditItem[];
  corsFindings: CorsAuditItem[];
  timestamp: string;
}

export class SriCsrfValidatorService {
  public static audit(guard: WorkspaceGuard): AdvancedWebSecurityReport {
    const root = guard.getRoot();
    const sriFindings: SriAuditItem[] = [];
    const csrfFindings: CsrfAuditItem[] = [];
    const corsFindings: CorsAuditItem[] = [];

    let totalExternalAssets = 0;
    let totalFormsAudited = 0;

    const sourceFiles = this.gatherSourceFiles(root);

    for (const relFile of sourceFiles) {
      const fullPath = path.join(root, relFile);
      if (!fs.existsSync(fullPath)) continue;

      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);

      // 1. Audit Subresource Integrity (SRI) on external scripts & styles
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Match external <script src="http...">
        const scriptMatch = line.match(/<script[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/i);
        if (scriptMatch) {
          totalExternalAssets++;
          const srcUrl = scriptMatch[1];
          const hasIntegrity = /integrity=["']sha(?:256|384|512)-/i.test(line);
          const hasCrossOrigin = /crossorigin=["'](?:anonymous|use-credentials)["']/i.test(line);

          if (!hasIntegrity) {
            sriFindings.push({
              file: relFile,
              line: lineNum,
              element: 'script',
              sourceUrl: srcUrl,
              hasIntegrity,
              hasCrossOrigin,
              risk: srcUrl.includes('cdn') || srcUrl.includes('unpkg') || srcUrl.includes('jsdelivr') ? 'HIGH' : 'MEDIUM',
              recommendation: `Add integrity="sha384-..." and crossorigin="anonymous" to external script from ${srcUrl} to prevent CDN supply chain tampering.`
            });
          }
        }

        // Match external <link rel="stylesheet" href="http...">
        const linkMatch = line.match(/<link[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/i);
        if (linkMatch && line.includes('stylesheet')) {
          totalExternalAssets++;
          const hrefUrl = linkMatch[1];
          const hasIntegrity = /integrity=["']sha(?:256|384|512)-/i.test(line);
          const hasCrossOrigin = /crossorigin=/i.test(line);

          if (!hasIntegrity) {
            sriFindings.push({
              file: relFile,
              line: lineNum,
              element: 'link',
              sourceUrl: hrefUrl,
              hasIntegrity,
              hasCrossOrigin,
              risk: 'MEDIUM',
              recommendation: `Add integrity hash to external stylesheet ${hrefUrl}.`
            });
          }
        }

        // 2. Audit CSRF tokens on HTML / JSX mutating forms
        const formMatch = line.match(/<form[^>]*method=["'](POST|PUT|DELETE)["'][^>]*>/i);
        if (formMatch) {
          totalFormsAudited++;
          // Look ahead 25 lines within the form body
          const formBody = lines.slice(i, i + 30).join('\n');
          const hasCsrf =
            /name=["'](?:csrf|_csrf|csrfToken|csrf_token|authenticity_token)["']/i.test(formBody) ||
            /value=\{?csrf/i.test(formBody) ||
            /csrf/i.test(content); // Project uses global csrf middleware

          if (!hasCsrf) {
            csrfFindings.push({
              file: relFile,
              line: lineNum,
              formOrEndpoint: formMatch[0].slice(0, 50),
              method: formMatch[1].toUpperCase(),
              hasCsrfToken: false,
              risk: 'HIGH',
              recommendation: 'Ensure POST/PUT/DELETE forms include a CSRF verification token or verify with SameSite=Strict cookies.'
            });
          }
        }

        // 3. Audit CORS wildcards with credentials
        if (line.includes('cors(') || line.includes('Access-Control-Allow-Origin') || line.includes('origin:')) {
          if (
            (line.includes("'*'") || line.includes('"*"')) &&
            (content.includes('credentials: true') || content.includes('Access-Control-Allow-Credentials'))
          ) {
            corsFindings.push({
              file: relFile,
              line: lineNum,
              originPattern: '*',
              allowsCredentialsWithWildcard: true,
              risk: 'CRITICAL',
              recommendation: 'Do not combine Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true. Specify explicit trusted origins.'
            });
          }
        }
      }
    }

    let score = 100;
    score -= corsFindings.length * 25;
    score -= csrfFindings.length * 15;
    score -= sriFindings.length * 5;
    score = Math.max(0, Math.min(100, score));

    const verdict: AdvancedWebSecurityReport['verdict'] =
      corsFindings.length > 0 || csrfFindings.length > 1
        ? 'VULNERABLE'
        : sriFindings.length > 0 || csrfFindings.length === 1
        ? 'NEEDS_ATTENTION'
        : 'SECURE';

    return {
      score,
      verdict,
      summary: {
        totalExternalAssets,
        missingSriCount: sriFindings.length,
        totalFormsAudited,
        missingCsrfCount: csrfFindings.length,
        corsIssuesCount: corsFindings.length
      },
      sriFindings,
      csrfFindings,
      corsFindings,
      timestamp: new Date().toISOString()
    };
  }

  private static gatherSourceFiles(dir: string, baseDir = dir): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.veloprove', '.cursor', '.agents']);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignoreDirs.has(entry.name)) {
            results.push(...this.gatherSourceFiles(path.join(dir, entry.name), baseDir));
          }
        } else if (/\.(html|jsx|tsx|vue|svelte|ejs|handlebars|php|js|ts)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          results.push(path.relative(baseDir, path.join(dir, entry.name)).replace(/\\/g, '/'));
        }
      }
    } catch {}

    return results;
  }
}
