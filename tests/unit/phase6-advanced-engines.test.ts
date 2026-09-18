import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { AiHallucinationEvaluatorService } from '../../src/application/ai-hallucination-evaluator.js';
import { GitBisectHunterService } from '../../src/application/git-bisect-hunter.js';
import { NetworkThrottlerService } from '../../src/application/network-throttler.js';
import { SmartContractAuditorService } from '../../src/application/smart-contract-auditor.js';
import { DeadAssetPurgeService } from '../../src/application/dead-asset-purge.js';
import { VeloProveEngine } from '../../src/application/engine.js';

describe('VeloProve Phase 6 Next-Gen Engines Suite', () => {
  const fixtureDir = path.resolve(process.cwd(), 'fixtures/phase6-test-repo');
  let guard: WorkspaceGuard;

  beforeEach(() => {
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }

    // 1. Scaffold Solidity Smart Contract with Reentrancy & tx.origin
    const contractsDir = path.join(fixtureDir, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });
    const solidityCode = `
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    function withdraw() public {
        uint256 bal = balances[msg.sender];
        require(bal > 0);
        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Failed");
        balances[msg.sender] = 0; // State update AFTER external call (Reentrancy)
    }

    function adminWithdraw() public {
        require(tx.origin == 0x1234567890123456789012345678901234567890); // tx.origin vuln
        selfdestruct(payable(msg.sender)); // unprotected selfdestruct
    }
}
`;
    fs.writeFileSync(path.join(contractsDir, 'VulnerableBank.sol'), solidityCode, 'utf8');

    // 2. Scaffold unreferenced dead image assets
    const assetsDir = path.join(fixtureDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'unused-banner.png'), 'fake-image-bytes', 'utf8');
    fs.writeFileSync(path.join(assetsDir, 'unused-font.woff2'), 'fake-font-bytes', 'utf8');

    // Code that uses only logo.png
    const srcDir = path.join(fixtureDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), 'export const Logo = () => <img src="logo.png" />;', 'utf8');
    fs.writeFileSync(path.join(assetsDir, 'logo.png'), 'logo-bytes', 'utf8');

    guard = new WorkspaceGuard(fixtureDir);
  });

  describe('AiHallucinationEvaluatorService', () => {
    it('detects hallucinations and validates ground-truth keywords', async () => {
      const report = await AiHallucinationEvaluatorService.evaluate({
        modelResponses: [
          {
            promptId: 'P1',
            prompt: 'Explain VeloProve',
            response: 'VeloProve is a local-first autonomous QA testing engine with zero cloud dependency.'
          },
          {
            promptId: 'P2',
            prompt: 'Explain FakeFeature',
            response: 'FakeFeature uses proprietary cloud blockchain telemetry to upload your private keys.'
          }
        ],
        testCases: [
          {
            id: 'P1',
            prompt: 'Explain VeloProve',
            expectedKeywords: ['local-first', 'QA'],
            forbiddenKeywords: ['requires cloud registration', 'aws proprietary']
          },
          {
            id: 'P2',
            prompt: 'Explain FakeFeature',
            forbiddenKeywords: ['blockchain telemetry', 'upload your private keys']
          }
        ]
      });

      expect(report.totalEvaluated).toBe(2);
      expect(report.passedCount).toBe(1);
      expect(report.hallucinationCount).toBe(1);
      expect(report.results.find(r => r.promptId === 'P1')?.passed).toBe(true);
      expect(report.results.find(r => r.promptId === 'P2')?.hallucinationDetected).toBe(true);
    });
  });

  describe('SmartContractAuditorService', () => {
    it('identifies reentrancy, unprotected selfdestruct, and tx.origin vulnerabilities in Solidity', () => {
      const report = SmartContractAuditorService.auditContracts(guard);

      expect(report.scannedFilesCount).toBe(1);
      expect(report.criticalIssues).toBeGreaterThanOrEqual(2);
      expect(report.overallVerdict).toBe('VULNERABLE');

      const reentrancy = report.issues.find(i => i.vulnerability === 'REENTRANCY_RISK');
      expect(reentrancy).toBeDefined();

      const selfdestruct = report.issues.find(i => i.vulnerability === 'UNPROTECTED_SELFDESTRUCT');
      expect(selfdestruct).toBeDefined();

      const txOrigin = report.issues.find(i => i.vulnerability === 'TX_ORIGIN_AUTHENTICATION');
      expect(txOrigin).toBeDefined();
    });
  });

  describe('DeadAssetPurgeService', () => {
    it('detects unreferenced image and font assets and purges them on demand', () => {
      const scanReport = DeadAssetPurgeService.scan(guard);

      expect(scanReport.unusedAssetsCount).toBe(2); // unused-banner.png and unused-font.woff2 (logo.png is referenced)
      expect(scanReport.unusedItems.some(i => i.identifier === 'unused-banner.png')).toBe(true);
      expect(scanReport.unusedItems.some(i => i.identifier === 'logo.png')).toBe(false);

      // Purge
      const purgeResult = DeadAssetPurgeService.purge(guard);
      expect(purgeResult.success).toBe(true);
      expect(purgeResult.deletedFiles.length).toBe(2);

      // Rescan after purge
      const postScan = DeadAssetPurgeService.scan(guard);
      expect(postScan.unusedAssetsCount).toBe(0);
    });
  });

  describe('NetworkThrottlerService', () => {
    it('simulates GPRS network latency and OFFLINE drops', async () => {
      const dropRes = await NetworkThrottlerService.runThrottledRequest({
        targetUrl: 'http://localhost:3000/api',
        profile: 'OFFLINE_DROP'
      });

      expect(dropRes.resilienceRating).toBe('FAILED_OFFLINE');
      expect(dropRes.statusCode).toBe(0);
      expect(dropRes.handledGracefully).toBe(true);
    });
  });

  describe('GitBisectHunterService & Engine Integration', () => {
    it('exposes phase 6 methods on VeloProveEngine instance', async () => {
      const engine = new VeloProveEngine(fixtureDir);

      const contractAudit = engine.auditSmartContracts();
      expect(contractAudit.overallVerdict).toBeDefined();

      const assetScan = engine.scanDeadAssets();
      expect(assetScan.scannedFilesCount).toBeGreaterThan(0);

      const bisectRes = await engine.huntRegression();
      expect(bisectRes.totalCommitsExamined).toBeGreaterThan(0);
    });
  });
});
