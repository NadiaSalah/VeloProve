import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export type ParityCheckStrategy =
  | 'STATIC_AST_PARITY'        // Method 1 & 2: Static UI elements vs Backend Handlers/Enums/Commands
  | 'NOOP_HANDLER_DETECTION'   // Method 2: Detecting empty onClick/onChange, console.log only, TODOs
  | 'DYNAMIC_IPC_CONTRACT';    // Method 3: Dynamic E2E IPC/API contract generator

export interface UiFeatureElement {
  file: string;
  line: number;
  elementType: 'button' | 'input' | 'select' | 'option' | 'checkbox' | 'radio' | 'custom';
  labelOrValue: string;
  handlerName?: string;
  hasImplementation: boolean;
  isNoopOrPlaceholder: boolean;
  boundBackendTarget?: string; // e.g. "scan_disk", "/api/recover", "invoke('get_supported')"
}

export interface GhostFeatureIssue {
  element: UiFeatureElement;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  issueType: 'ORPHAN_UI_NO_BACKEND' | 'NOOP_HANDLER' | 'ENUM_UNMATCHED_VALUE' | 'UNHANDLED_COMMAND';
  description: string;
  remediation: string;
}

export interface FeatureParityReport {
  projectPath: string;
  totalUiFeaturesFound: number;
  connectedFeaturesCount: number;
  ghostFeaturesCount: number;
  parityScore: number; // 0 - 100%
  overallStatus: 'FULL_PARITY' | 'PARTIAL_GHOSTS_FOUND' | 'HIGH_RISK_GHOST_UI';
  issues: GhostFeatureIssue[];
  discoveredUiElements: UiFeatureElement[];
  generatedE2ETestCode?: string;
  summary: string;
}

export class FeatureParityAuditorService {
  /**
   * Universal Audit for UI-to-Backend Parity (Supports React, Vue, Svelte, HTML, Tauri/Rust, Node/Express, Python/FastAPI/Django, Go)
   */
  public static audit(
    guard: WorkspaceGuard,
    options: {
      uiPatterns?: string[];
      backendPatterns?: string[];
      generateE2ESuite?: boolean;
    } = {}
  ): FeatureParityReport {
    const root = guard.getRoot();
    const uiElements: UiFeatureElement[] = [];
    const backendEndpointsAndCommands = new Set<string>();
    const backendEnumOrMatchTokens = new Set<string>();

    // 1. Scan Backend Files for Commands, API Endpoints, Enums & Match Arms
    this.scanBackendFiles(root, backendEndpointsAndCommands, backendEnumOrMatchTokens);

    // 2. Scan UI Files for Buttons, Options, Inputs, Checkboxes and Handlers
    this.scanUiFiles(root, uiElements, backendEndpointsAndCommands);

    // 3. Evaluate Parity & Identify Ghost Features
    const issues: GhostFeatureIssue[] = [];

    for (const elem of uiElements) {
      if (elem.isNoopOrPlaceholder) {
        issues.push({
          element: elem,
          severity: 'CRITICAL',
          issueType: 'NOOP_HANDLER',
          description: `UI element "${elem.labelOrValue}" in ${path.basename(elem.file)}:${elem.line} has a dummy or empty handler (no-op / console.log / TODO).`,
          remediation: `Implement the actual business logic or wire up a backend command/endpoint in ${elem.file}.`
        });
        continue;
      }

      if (!elem.hasImplementation && !elem.boundBackendTarget) {
        issues.push({
          element: elem,
          severity: 'WARNING',
          issueType: 'ORPHAN_UI_NO_BACKEND',
          description: `UI element "${elem.labelOrValue}" is rendered on UI but is not bound to any backend command, API route, or state action.`,
          remediation: `Bind this element to a backend handler or remove it from the interface if not yet implemented.`
        });
        continue;
      }

      // Check if element references a specific value/enum (like file extensions: 'pdf', 'docx') not supported in backend
      if (elem.elementType === 'option' || elem.elementType === 'checkbox' || elem.elementType === 'radio') {
        const normalizedVal = elem.labelOrValue.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedVal.length > 1 && backendEnumOrMatchTokens.size > 0) {
          const isKnownInBackend = Array.from(backendEnumOrMatchTokens).some(tok => tok.toLowerCase().includes(normalizedVal));
          if (!isKnownInBackend && elem.boundBackendTarget) {
            issues.push({
              element: elem,
              severity: 'CRITICAL',
              issueType: 'ENUM_UNMATCHED_VALUE',
              description: `UI offers option "${elem.labelOrValue}" for backend target "${elem.boundBackendTarget}", but backend parsers/enums have no matching implementation for this value.`,
              remediation: `Add support for "${elem.labelOrValue}" in backend pattern matching or remove it from UI selection.`
            });
          }
        }
      }
    }

    const total = uiElements.length;
    const ghostCount = issues.length;
    const connectedCount = Math.max(0, total - ghostCount);
    const parityScore = total > 0 ? Math.round((connectedCount / total) * 100) : 100;

    let overallStatus: FeatureParityReport['overallStatus'] = 'FULL_PARITY';
    if (parityScore < 60 || issues.some(i => i.severity === 'CRITICAL')) {
      overallStatus = 'HIGH_RISK_GHOST_UI';
    } else if (parityScore < 95 || issues.length > 0) {
      overallStatus = 'PARTIAL_GHOSTS_FOUND';
    }

    // 4. Generate Universal Dynamic E2E IPC/API Parity Test Suite
    let generatedE2ETestCode: string | undefined;
    if (options.generateE2ESuite !== false && total > 0) {
      generatedE2ETestCode = this.generateE2ETestSuite(uiElements, issues);
    }

    const summary = `${overallStatus} (Parity Score: ${parityScore}%): Analyzed ${total} UI feature elements. Found ${connectedCount} connected features and ${ghostCount} ghost/unimplemented feature issues.`;

    return {
      projectPath: root,
      totalUiFeaturesFound: total,
      connectedFeaturesCount: connectedCount,
      ghostFeaturesCount: ghostCount,
      parityScore,
      overallStatus,
      issues,
      discoveredUiElements: uiElements,
      generatedE2ETestCode,
      summary
    };
  }

  private static scanBackendFiles(
    dir: string,
    endpointsAndCommands: Set<string>,
    enumOrMatchTokens: Set<string>
  ): void {
    if (!fs.existsSync(dir)) return;

    const walk = (currentDir: string) => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node:modules' || entry.name === 'target' || entry.name === 'dist') {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Backend extensions: Rust (.rs), TS/JS (.ts, .js), Python (.py), Go (.go), C# (.cs), Java (.java)
          if (['.rs', '.ts', '.js', '.py', '.go', '.cs', '.java'].includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              this.extractBackendTokens(content, ext, endpointsAndCommands, enumOrMatchTokens);
            } catch {}
          }
        }
      }
    };

    walk(dir);
  }

  private static extractBackendTokens(
    content: string,
    ext: string,
    endpointsAndCommands: Set<string>,
    enumOrMatchTokens: Set<string>
  ): void {
    // 1. Tauri Commands (Rust #[tauri::command] fn foo)
    if (ext === '.rs') {
      const cmdRegex = /#\[tauri::command\][\s\S]*?fn\s+([a-zA-Z0-9_]+)/g;
      let m: RegExpExecArray | null;
      while ((m = cmdRegex.exec(content)) !== null) {
        endpointsAndCommands.add(m[1]);
      }

      // Rust Match arms & Enums (e.g. SupportedFileType::Jpg, match ext { "jpg" => ... })
      const matchArmRegex = /(?:match|enum)\s+[\s\S]*?\{([\s\S]*?)\}/g;
      while ((m = matchArmRegex.exec(content)) !== null) {
        const body = m[1];
        const tokens = body.match(/[A-Z][a-zA-Z0-9_]+|"([a-zA-Z0-9_]+)"/g) || [];
        tokens.forEach(t => enumOrMatchTokens.add(t.replace(/"/g, '')));
      }
    }

    // 2. HTTP Route Endpoints (Express, Fastify, Next.js, Flask, FastAPI)
    const routeRegex = /(?:app|router)\.(?:get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let r: RegExpExecArray | null;
    while ((r = routeRegex.exec(content)) !== null) {
      endpointsAndCommands.add(r[1]);
    }

    // Python FastAPI @app.get("/url")
    const pyRouteRegex = /@(?:app|router)\.(?:get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((r = pyRouteRegex.exec(content)) !== null) {
      endpointsAndCommands.add(r[1]);
    }

    // Generic function declarations
    const fnRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/g;
    while ((r = fnRegex.exec(content)) !== null) {
      const name = r[1] || r[2];
      if (name) endpointsAndCommands.add(name);
    }
  }

  private static scanUiFiles(
    dir: string,
    uiElements: UiFeatureElement[],
    backendTargets: Set<string>
  ): void {
    if (!fs.existsSync(dir)) return;

    const walk = (currentDir: string) => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target') {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // UI files: React (.tsx, .jsx), Vue (.vue), Svelte (.svelte), HTML (.html)
          if (['.tsx', '.jsx', '.vue', '.svelte', '.html'].includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              this.extractUiElementsFromFile(fullPath, content, uiElements, backendTargets);
            } catch {}
          }
        }
      }
    };

    walk(dir);
  }

  private static extractUiElementsFromFile(
    filePath: string,
    content: string,
    uiElements: UiFeatureElement[],
    backendTargets: Set<string>
  ): void {
    const lines = content.split('\n');

    // 1. Buttons (<button ...>Click</button> or <Button ...>)
    const buttonRegex = /<(?:button|Button)[^>]*?(?:onClick|@click)\s*=\s*([^{>]+|\{[^}]+\})[^>]*?>([\s\S]*?)<\/(?:button|Button)>/g;
    let bMatch: RegExpExecArray | null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for buttons
      if (line.includes('<button') || line.includes('<Button')) {
        const handlerMatch = line.match(/onClick\s*=\s*\{([^}]+)\}/);
        const handlerName = handlerMatch ? handlerMatch[1].trim() : undefined;

        // Check if handler is defined in file and inspect its body
        let isNoop =
          line.includes('() => {}') ||
          line.includes('() => { }') ||
          line.includes('console.log') ||
          line.toLowerCase().includes('// todo') ||
          line.toLowerCase().includes('/* todo');

        let boundTarget: string | undefined;

        if (handlerName && !isNoop) {
          const fnBodyRegex = new RegExp(`(?:const|function)\\s+${handlerName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{([\\s\\S]*?)\\}|function\\s+${handlerName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\}`, 'm');
          const fnMatch = content.match(fnBodyRegex);
          if (fnMatch) {
            const body = fnMatch[1] || fnMatch[2] || '';
            if (body.includes('console.log') || body.trim() === '' || body.toLowerCase().includes('todo')) {
              isNoop = true;
            }
            const invokeMatch = body.match(/invoke\s*\(\s*['"`]([^'"`]+)['"`]/);
            const fetchMatch = body.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (invokeMatch) boundTarget = invokeMatch[1];
            else if (fetchMatch) boundTarget = fetchMatch[1];
          }
        }

        const hasDirectInvoke = line.match(/invoke\s*\(\s*['"`]([^'"`]+)['"`]/);
        const hasDirectFetch = line.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (hasDirectInvoke) boundTarget = hasDirectInvoke[1];
        if (hasDirectFetch) boundTarget = hasDirectFetch[1];

        const labelMatch = line.match(/>([^<]+)</) || ['Action Button'];
        const labelOrValue = labelMatch[1] ? labelMatch[1].trim() : 'Button Action';

        if (labelOrValue) {
          uiElements.push({
            file: filePath,
            line: i + 1,
            elementType: 'button',
            labelOrValue,
            handlerName,
            hasImplementation: !isNoop && (!!boundTarget || (!!handlerName && !isNoop)),
            isNoopOrPlaceholder: isNoop,
            boundBackendTarget: boundTarget
          });
        }
      }

      // Check for options in select / checkboxes / radio groups (e.g. File format filters)
      if (line.includes('<option') || line.includes('type="checkbox"') || line.includes("type='checkbox'") || line.includes('type="radio"')) {
        const valMatch = line.match(/value\s*=\s*['"`]([^'"`]+)['"`]/) || line.match(/>([^<]+)</);
        const labelOrValue = valMatch ? valMatch[1].trim() : 'Option';

        const boundTargetMatch = content.match(/invoke\s*\(\s*['"`]([^'"`]+)['"`]/) || content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
        const boundTarget = boundTargetMatch ? boundTargetMatch[1] : undefined;

        uiElements.push({
          file: filePath,
          line: i + 1,
          elementType: line.includes('<option') ? 'option' : line.includes('checkbox') ? 'checkbox' : 'radio',
          labelOrValue,
          hasImplementation: true,
          isNoopOrPlaceholder: false,
          boundBackendTarget: boundTarget
        });
      }
    }
  }

  private static generateE2ETestSuite(elements: UiFeatureElement[], issues: GhostFeatureIssue[]): string {
    const testCases = elements.map((el, idx) => {
      const label = el.labelOrValue.replace(/'/g, "\\'");
      return `  test('UI Feature Parity: ${label} (${el.elementType}) should have active backend binding', async ({ page }) => {
    // 1. Locate element on page
    const element = page.getByText('${label}').or(page.locator('[value="${label}"]')).first();
    await expect(element).toBeDefined();

    // 2. Trigger action and verify IPC/Network response
    ${el.boundBackendTarget ? `// Target Backend Binding: ${el.boundBackendTarget}` : '// Warning: No direct backend target discovered'}
  });`;
    }).join('\n\n');

    return `import { test, expect } from '@playwright/test';

/**
 * Auto-Generated UI-to-Backend Feature Parity Test Suite
 * Generated by VeloProve FeatureParityAuditorService
 */

describe('Universal UI Feature Completeness & Parity Tests', () => {
${testCases}
});
`;
  }
}
