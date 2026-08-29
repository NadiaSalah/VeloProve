import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export type ContractVulnerability =
  | 'REENTRANCY_RISK'
  | 'UNPROTECTED_SELFDESTRUCT'
  | 'TX_ORIGIN_AUTHENTICATION'
  | 'INTEGER_OVERFLOW_UNCHECKED'
  | 'BLOCK_TIMESTAMP_DEPENDENCY'
  | 'UNCHECKED_CALL_RETURN_VALUE';

export interface SmartContractIssue {
  file: string;
  line: number;
  contractName: string;
  vulnerability: ContractVulnerability;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  codeSnippet: string;
  description: string;
  remediation: string;
}

export interface SmartContractAuditReport {
  scannedFilesCount: number;
  contractsFound: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  securityScore: number; // 0 - 100
  overallVerdict: 'SECURE' | 'AUDIT_WARNINGS' | 'VULNERABLE';
  issues: SmartContractIssue[];
  summary: string;
}

export class SmartContractAuditorService {
  /**
   * Audits Solidity (.sol) smart contracts and Web3 files for common DeFi/EVM vulnerabilities
   */
  public static auditContracts(guard: WorkspaceGuard): SmartContractAuditReport {
    const root = guard.getRoot();
    const issues: SmartContractIssue[] = [];
    let scannedFilesCount = 0;
    let contractsFound = 0;

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
          if (ext === '.sol' || ext === '.vy') {
            scannedFilesCount++;
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
              this.analyzeContract(relativePath, content, issues, () => contractsFound++);
            } catch {}
          }
        }
      }
    };

    walk(root);

    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;

    for (const iss of issues) {
      if (iss.severity === 'CRITICAL') criticalIssues++;
      else if (iss.severity === 'HIGH') highIssues++;
      else if (iss.severity === 'MEDIUM') mediumIssues++;
    }

    const totalIssues = issues.length;
    let securityScore = 100 - (criticalIssues * 35 + highIssues * 20 + mediumIssues * 10);
    if (securityScore < 0) securityScore = 0;

    let overallVerdict: SmartContractAuditReport['overallVerdict'] = 'SECURE';
    if (criticalIssues > 0 || securityScore < 60) {
      overallVerdict = 'VULNERABLE';
    } else if (totalIssues > 0) {
      overallVerdict = 'AUDIT_WARNINGS';
    }

    const summary = `${overallVerdict} (Security Score: ${securityScore}/100): Scanned ${scannedFilesCount} contract file(s). Found ${totalIssues} vulnerability issue(s) (${criticalIssues} Critical, ${highIssues} High).`;

    return {
      scannedFilesCount,
      contractsFound,
      criticalIssues,
      highIssues,
      mediumIssues,
      securityScore,
      overallVerdict,
      issues,
      summary
    };
  }

  private static analyzeContract(
    file: string,
    content: string,
    issues: SmartContractIssue[],
    onContractFound: () => void
  ): void {
    const lines = content.split('\n');
    let currentContract = 'Contract';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

      const cMatch = line.match(/(?:contract|interface|library)\s+([a-zA-Z0-9_]+)/);
      if (cMatch) {
        currentContract = cMatch[1];
        onContractFound();
      }

      // 1. Reentrancy Vulnerability (state change after external call)
      if (line.includes('.call{value:') || line.includes('.send(') || line.includes('.transfer(')) {
        // Check if subsequent lines modify balances or state
        const nextLines = lines.slice(i + 1, i + 6).join('\n');
        if (nextLines.includes('=') && !content.includes('nonReentrant') && !content.includes('ReentrancyGuard')) {
          issues.push({
            file,
            line: lineNum,
            contractName: currentContract,
            vulnerability: 'REENTRANCY_RISK',
            severity: 'CRITICAL',
            codeSnippet: trimmed,
            description: `External Ether transfer before state update without ReentrancyGuard. Susceptible to reentrancy drain attack.`,
            remediation: `Adopt Checks-Effects-Interactions pattern and add OpenZeppelin's ReentrancyGuard modifier.`
          });
        }
      }

      // 2. Unprotected Selfdestruct / Suicide
      if (line.includes('selfdestruct(') || line.includes('suicide(')) {
        if (!line.includes('onlyOwner') && !content.includes('Ownable')) {
          issues.push({
            file,
            line: lineNum,
            contractName: currentContract,
            vulnerability: 'UNPROTECTED_SELFDESTRUCT',
            severity: 'CRITICAL',
            codeSnippet: trimmed,
            description: `Unprotected selfdestruct operation found. Anyone can destroy contract and lock funds.`,
            remediation: `Protect selfdestruct with strict onlyOwner or multi-sig access control.`
          });
        }
      }

      // 3. tx.origin Authentication
      if (line.includes('tx.origin') && (line.includes('==') || line.includes('require('))) {
        issues.push({
          file,
          line: lineNum,
          contractName: currentContract,
          vulnerability: 'TX_ORIGIN_AUTHENTICATION',
          severity: 'HIGH',
          codeSnippet: trimmed,
          description: `Use of tx.origin for authorization enables phishing / proxy contract exploits.`,
          remediation: `Use msg.sender instead of tx.origin for authentication checks.`
        });
      }

      // 4. Block Timestamp Manipulation
      if ((line.includes('block.timestamp') || line.includes('now')) && (line.includes('%') || line.includes('random') || line.includes('winner'))) {
        issues.push({
          file,
          line: lineNum,
          contractName: currentContract,
          vulnerability: 'BLOCK_TIMESTAMP_DEPENDENCY',
          severity: 'MEDIUM',
          codeSnippet: trimmed,
          description: `Block timestamp used as source of randomness. Miners can manipulate timestamp values.`,
          remediation: `Use Chainlink VRF (Verifiable Random Function) for secure randomness.`
        });
      }
    }
  }
}
