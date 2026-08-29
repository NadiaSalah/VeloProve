import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface DbQueryIssue {
  id: string;
  category: 'N_PLUS_ONE_IN_LOOP' | 'UNINDEXED_OR_MISSING_LIMIT' | 'RAW_SQL_STRING_CONCAT' | 'UNBOUNDED_COLLECTION_FETCH';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  file: string;
  line: number;
  snippet: string;
  description: string;
  remediationAdvice: string;
}

export interface DbQueryAuditReport {
  timestamp: string;
  filesAnalyzed: number;
  totalDbInvocations: number;
  efficiencyScore: number; // 0 - 100
  totalIssues: number;
  issues: DbQueryIssue[];
  verdict: 'OPTIMIZED' | 'ACCEPTABLE' | 'NEEDS_OPTIMIZATION' | 'CRITICAL_RISK';
}

export class DatabaseQueryAuditorService {
  public static audit(
    guard: WorkspaceGuard,
    options: { targetDir?: string; scanAllExtensions?: boolean } = {}
  ): DbQueryAuditReport {
    const root = guard.getRoot();
    const searchDir = options.targetDir ? guard.resolveSafePath(options.targetDir) : root;
    const issues: DbQueryIssue[] = [];
    let filesAnalyzed = 0;
    let totalDbInvocations = 0;

    const sourceExts = ['.ts', '.js', '.jsx', '.tsx', '.py', '.rs', '.go', '.php', '.java'];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(root, fullPath);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (sourceExts.some(ext => entry.name.endsWith(ext))) {
          filesAnalyzed++;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            this.analyzeFile(relPath, content, issues, () => ++totalDbInvocations);
          } catch {
            // ignore
          }
        }
      }
    };

    walk(searchDir);

    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = issues.filter(i => i.severity === 'HIGH').length;
    const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;

    let efficiencyScore = 100 - (criticalCount * 25) - (highCount * 12) - (mediumCount * 5);
    if (efficiencyScore < 0) efficiencyScore = 0;

    let verdict: DbQueryAuditReport['verdict'] = 'OPTIMIZED';
    if (efficiencyScore < 50) verdict = 'CRITICAL_RISK';
    else if (efficiencyScore < 75) verdict = 'NEEDS_OPTIMIZATION';
    else if (efficiencyScore < 90) verdict = 'ACCEPTABLE';

    return {
      timestamp: new Date().toISOString(),
      filesAnalyzed,
      totalDbInvocations,
      efficiencyScore,
      totalIssues: issues.length,
      issues,
      verdict
    };
  }

  private static analyzeFile(
    file: string,
    content: string,
    issues: DbQueryIssue[],
    onInvocation: () => number
  ): void {
    const lines = content.split('\n');

    // 1. Check for N+1 Query patterns inside loops:
    // Pattern: for (...) { await db.find / await prisma. / await Model.findOne ... }
    const loopWithDbRegex = /(?:for\s*\([^)]+\)|for\s+await\s*\([^)]+\)|\.forEach\s*\(|\.map\s*\(\s*async|while\s*\([^)]+\))[\s\S]*?(?:await\s+(?:prisma|db|models?|repository|client|conn|connection)\.([a-zA-Z0-9_]+)\b|\.find(?:One|ById|Many|Unique)?\s*\(|\.query\s*\(|SELECT\s+[\s\S]*?FROM)/gi;

    let loopMatch: RegExpExecArray | null;
    while ((loopMatch = loopWithDbRegex.exec(content)) !== null) {
      onInvocation();
      const matchIndex = loopMatch.index;
      const lineNum = content.substring(0, matchIndex).split('\n').length;
      const snippet = loopMatch[0].substring(0, 150).trim();

      issues.push({
        id: `N1-${file.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
        category: 'N_PLUS_ONE_IN_LOOP',
        severity: 'CRITICAL',
        file,
        line: lineNum,
        snippet,
        description: `Potential SQL N+1 Query in loop: asynchronous database call triggered per iteration.`,
        remediationAdvice: `Batch query IDs with 'IN (...)' / 'where: { id: { in: ids } }' or use JOIN / include eagerly outside the loop.`
      });
    }

    // 2. Check for Raw SQL string concatenation (SQL Injection risk & query planner de-optimization)
    const sqlConcatRegex = /(?:query|execute|rawQuery)\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|"[^"]*"\s*\+\s*[a-zA-Z0-9_]+|'[^']*'\s*\+\s*[a-zA-Z0-9_]+)/gi;
    let concatMatch: RegExpExecArray | null;
    while ((concatMatch = sqlConcatRegex.exec(content)) !== null) {
      onInvocation();
      const lineNum = content.substring(0, concatMatch.index).split('\n').length;
      const snippet = concatMatch[0].substring(0, 120).trim();

      issues.push({
        id: `SQLI-${file.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
        category: 'RAW_SQL_STRING_CONCAT',
        severity: 'CRITICAL',
        file,
        line: lineNum,
        snippet,
        description: `Raw SQL string concatenation or unescaped template literal inside query execution.`,
        remediationAdvice: `Use parameterized prepared statements (e.g. $1, ?, or tagged template literals Sql\`...\`).`
      });
    }

    // 3. Check for unbounded collection fetches without limit:
    // e.g. .findMany({ where: ... }) with NO take/limit, or "SELECT * FROM ... " with no LIMIT clause
    const unboundedSelectRegex = /(?:SELECT\s+\*\s+FROM\s+[a-zA-Z0-9_]+(?!\s+WHERE|\s+LIMIT|\s+ORDER))/gi;
    let unbMatch: RegExpExecArray | null;
    while ((unbMatch = unboundedSelectRegex.exec(content)) !== null) {
      onInvocation();
      const lineNum = content.substring(0, unbMatch.index).split('\n').length;
      const snippet = unbMatch[0].substring(0, 100).trim();

      issues.push({
        id: `UNBOUND-${file.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
        category: 'UNBOUNDED_COLLECTION_FETCH',
        severity: 'HIGH',
        file,
        line: lineNum,
        snippet,
        description: `Unbounded 'SELECT * FROM table' fetch detected without WHERE or LIMIT clause.`,
        remediationAdvice: `Add pagination (LIMIT/OFFSET) and select only the required columns instead of '*'.`
      });
    }

    // Single line database calls counter
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:prisma|db|repository|Model)\.(?:find|create|update|delete|query|save)\(/i.test(line)) {
        onInvocation();
      }
    }
  }
}
