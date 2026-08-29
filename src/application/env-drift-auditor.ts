import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface EnvFileSummary {
  fileName: string;
  keysCount: number;
  keys: string[];
}

export interface EnvDriftIssue {
  type: 'MISSING_IN_ACTIVE_ENV' | 'MISSING_IN_EXAMPLE' | 'LEAKED_SECRET_IN_EXAMPLE' | 'UNDECLARED_CODE_REFERENCE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  variableName: string;
  sourceFile?: string;
  message: string;
}

export interface EnvDriftReport {
  timestamp: string;
  scannedEnvFiles: EnvFileSummary[];
  codeReferencedKeys: string[];
  missingInActive: string[];
  missingInExample: string[];
  undeclaredInEnv: string[];
  leakedSecrets: string[];
  healthScore: number; // 0 - 100
  issues: EnvDriftIssue[];
  suggestedExampleContent?: string;
  verdict: 'SYNCHRONIZED' | 'MINOR_DRIFT' | 'MAJOR_DRIFT' | 'CRITICAL_LEAK';
}

export class EnvDriftAuditorService {
  public static audit(
    guard: WorkspaceGuard,
    options: { generateExample?: boolean } = {}
  ): EnvDriftReport {
    const root = guard.getRoot();
    const envFiles: EnvFileSummary[] = [];
    const issues: EnvDriftIssue[] = [];
    const codeReferencedKeys = new Set<string>();

    // 1. Locate all .env files in root and immediate subdirs
    const allFiles = fs.readdirSync(root);
    const envFileNames = allFiles.filter(f => f.startsWith('.env') || f.endsWith('.env') || f === 'env.json');

    const envMap: Record<string, Record<string, string>> = {};

    for (const f of envFileNames) {
      try {
        const filePath = path.join(root, f);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = this.parseEnvContent(content);
          const keys = Object.keys(parsed);
          envFiles.push({ fileName: f, keysCount: keys.length, keys });
          envMap[f] = parsed;
        }
      } catch {
        // ignore
      }
    }

    // 2. Scan source code for environment variable usages (process.env.FOO, import.meta.env.FOO, etc.)
    const sourceExts = ['.ts', '.js', '.jsx', '.tsx', '.py', '.rs', '.go', '.php'];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (sourceExts.some(ext => entry.name.endsWith(ext))) {
          try {
            const code = fs.readFileSync(fullPath, 'utf8');
            this.extractEnvUsagesFromCode(code, codeReferencedKeys);
          } catch {
            // ignore
          }
        }
      }
    };
    walk(root);

    // 3. Compare Example vs Active .env
    const exampleFile = envFiles.find(f => f.fileName.includes('example') || f.fileName.includes('sample') || f.fileName.includes('template'));
    const activeFile = envFiles.find(f => f.fileName === '.env' || f.fileName === '.env.local');

    const exampleKeys = exampleFile ? new Set(exampleFile.keys) : new Set<string>();
    const activeKeys = activeFile ? new Set(activeFile.keys) : new Set<string>();

    const missingInActive: string[] = [];
    const missingInExample: string[] = [];
    const undeclaredInEnv: string[] = [];
    const leakedSecrets: string[] = [];

    // Check secrets in example
    if (exampleFile && envMap[exampleFile.fileName]) {
      const exObj = envMap[exampleFile.fileName];
      for (const [key, val] of Object.entries(exObj)) {
        if (this.isSuspiciousSecretValue(key, val)) {
          leakedSecrets.push(key);
          issues.push({
            type: 'LEAKED_SECRET_IN_EXAMPLE',
            severity: 'CRITICAL',
            variableName: key,
            sourceFile: exampleFile.fileName,
            message: `Sensitive real key or secret pattern detected in ${exampleFile.fileName}: "${key}". Replace with placeholder value.`
          });
        }
      }
    }

    // Keys in example but missing in active .env
    for (const key of exampleKeys) {
      if (activeFile && !activeKeys.has(key)) {
        missingInActive.push(key);
        issues.push({
          type: 'MISSING_IN_ACTIVE_ENV',
          severity: 'HIGH',
          variableName: key,
          sourceFile: activeFile.fileName,
          message: `Variable '${key}' defined in ${exampleFile?.fileName} is missing in active ${activeFile.fileName}`
        });
      }
    }

    // Keys in active but missing in example .env
    for (const key of activeKeys) {
      if (exampleFile && !exampleKeys.has(key)) {
        missingInExample.push(key);
        issues.push({
          type: 'MISSING_IN_EXAMPLE',
          severity: 'MEDIUM',
          variableName: key,
          sourceFile: exampleFile.fileName,
          message: `Variable '${key}' exists in ${activeFile?.fileName} but is missing in documentation template ${exampleFile.fileName}`
        });
      }
    }

    // Keys referenced in code but nowhere in .env
    const allKnownEnvKeys = new Set([...exampleKeys, ...activeKeys]);
    for (const codeKey of codeReferencedKeys) {
      if (['NODE_ENV', 'PORT', 'HOST', 'CI', 'DEBUG', 'TZ'].includes(codeKey)) continue;
      if (allKnownEnvKeys.size > 0 && !allKnownEnvKeys.has(codeKey)) {
        undeclaredInEnv.push(codeKey);
        issues.push({
          type: 'UNDECLARED_CODE_REFERENCE',
          severity: 'HIGH',
          variableName: codeKey,
          message: `Code references env var '${codeKey}', but it is not declared in any .env or .env.example file.`
        });
      }
    }

    // Compute Health Score
    const critCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = issues.filter(i => i.severity === 'HIGH').length;
    const medCount = issues.filter(i => i.severity === 'MEDIUM').length;

    let healthScore = 100 - (critCount * 30) - (highCount * 15) - (medCount * 5);
    if (healthScore < 0) healthScore = 0;

    let verdict: EnvDriftReport['verdict'] = 'SYNCHRONIZED';
    if (critCount > 0) verdict = 'CRITICAL_LEAK';
    else if (healthScore < 60) verdict = 'MAJOR_DRIFT';
    else if (healthScore < 90) verdict = 'MINOR_DRIFT';

    let suggestedExampleContent: string | undefined;
    if (options.generateExample || !exampleFile) {
      const allUnique = Array.from(new Set([...Array.from(activeKeys), ...Array.from(codeReferencedKeys)]));
      suggestedExampleContent = allUnique.map(k => `${k}=your_${k.toLowerCase()}_here`).join('\n') + '\n';
    }

    return {
      timestamp: new Date().toISOString(),
      scannedEnvFiles: envFiles,
      codeReferencedKeys: Array.from(codeReferencedKeys),
      missingInActive,
      missingInExample,
      undeclaredInEnv,
      leakedSecrets,
      healthScore,
      issues,
      suggestedExampleContent,
      verdict
    };
  }

  private static parseEnvContent(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.substring(0, eqIdx).trim();
        const val = line.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key) result[key] = val;
      }
    }
    return result;
  }

  private static extractEnvUsagesFromCode(code: string, keys: Set<string>): void {
    // 1. process.env.KEY
    const procRegex = /process\.env\.([a-zA-Z0-9_]+)/g;
    let m: RegExpExecArray | null;
    while ((m = procRegex.exec(code)) !== null) {
      keys.add(m[1]);
    }

    // 2. import.meta.env.KEY
    const metaRegex = /import\.meta\.env\.([a-zA-Z0-9_]+)/g;
    while ((m = metaRegex.exec(code)) !== null) {
      keys.add(m[1]);
    }

    // 3. Python os.environ.get("KEY") / os.getenv("KEY")
    const pyRegex = /(?:os\.environ\.get|os\.getenv)\(\s*["']([a-zA-Z0-9_]+)["']/g;
    while ((m = pyRegex.exec(code)) !== null) {
      keys.add(m[1]);
    }

    // 4. Rust env::var("KEY") / std::env::var("KEY")
    const rsRegex = /(?:std::env::var|env::var)\(\s*["']([a-zA-Z0-9_]+)["']/g;
    while ((m = rsRegex.exec(code)) !== null) {
      keys.add(m[1]);
    }
  }

  private static isSuspiciousSecretValue(key: string, val: string): boolean {
    if (!val || val.startsWith('your_') || val.startsWith('change_') || val.startsWith('dummy_') || val === 'xxx' || val === '123456') {
      return false;
    }
    // High entropy keys or real token prefixes
    if (/^(AKIA|ASIA)[0-9A-Z]{16}/.test(val)) return true; // AWS Access Key
    if (/^ghp_[a-zA-Z0-9]{36}/.test(val)) return true; // GitHub Token
    if (/^sk_live_[a-zA-Z0-9]{24}/.test(val)) return true; // Stripe Live Key
    if (/^ey[a-zA-Z0-9_\-=]+\.ey[a-zA-Z0-9_\-=]+/.test(val)) return true; // JWT
    if (val.length > 32 && /[a-f0-9]{32,}/i.test(val)) return true; // 32-char hex secret

    return false;
  }
}
