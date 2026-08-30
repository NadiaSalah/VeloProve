import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { SecurityReport, SecurityFinding } from '../shared/types/security.js';
import type { SecurityAuditReport } from './security-audit.js';

export interface SarifLog {
  $schema: string;
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          fullDescription: { text: string };
          defaultConfiguration: {
            level: 'error' | 'warning' | 'note' | 'none';
          };
          help: { text: string };
          properties?: Record<string, any>;
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: 'error' | 'warning' | 'note' | 'none';
      message: { text: string };
      locations?: Array<{
        physicalLocation: {
          artifactLocation: {
            uri: string;
            uriBaseId?: string;
          };
          region?: {
            startLine: number;
            startColumn?: number;
          };
        };
      }>;
      properties?: Record<string, any>;
    }>;
  }>;
}

export class SarifExporterService {
  public static exportSecurityReport(
    guard: WorkspaceGuard,
    report: SecurityReport,
    auditReport?: SecurityAuditReport,
    outputPath?: string
  ): { sarifPath: string; log: SarifLog } {
    const root = guard.getRoot();
    const rulesMap = new Map<string, any>();
    const results: any[] = [];

    // Map security report findings
    for (const finding of report.findings) {
      const level = this.mapSeverityToSarifLevel(finding.severity);
      const ruleId = finding.category ? `QAFORGE-SEC-${finding.category.toUpperCase()}` : 'QAFORGE-SEC-GENERAL';

      if (!rulesMap.has(ruleId)) {
        rulesMap.set(ruleId, {
          id: ruleId,
          name: finding.title || ruleId,
          shortDescription: { text: finding.title || ruleId },
          fullDescription: { text: finding.impact || finding.title },
          defaultConfiguration: { level },
          help: { text: finding.remediation || 'Inspect finding details in QAForge report.' },
          properties: {
            category: finding.category,
            confidence: finding.confidence
          }
        });
      }

      const locationUri = finding.sourceLocation?.file || finding.endpoint || 'workspace';
      const startLine = finding.sourceLocation?.line || 1;

      results.push({
        ruleId,
        level,
        message: {
          text: `[${finding.severity}] ${finding.title}: ${finding.evidence}`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: locationUri.replace(/\\/g, '/')
              },
              region: {
                startLine
              }
            }
          }
        ],
        properties: {
          id: finding.id,
          confidence: finding.confidence,
          remediation: finding.remediation
        }
      });
    }

    // Map dependency audit vulnerabilities if provided
    if (auditReport && auditReport.vulnerabilities) {
      for (const vuln of auditReport.vulnerabilities) {
        const level = this.mapSeverityToSarifLevel(vuln.severity.toUpperCase() as any);
        const ruleId = vuln.cveId || `QAFORGE-CVE-${vuln.packageName.toUpperCase()}`;

        if (!rulesMap.has(ruleId)) {
          rulesMap.set(ruleId, {
            id: ruleId,
            name: vuln.title,
            shortDescription: { text: `${vuln.packageName} vulnerability` },
            fullDescription: { text: vuln.title },
            defaultConfiguration: { level },
            help: { text: vuln.recommendation }
          });
        }

        results.push({
          ruleId,
          level,
          message: {
            text: `Vulnerable dependency "${vuln.packageName}" (${vuln.installedVersion}): ${vuln.title}. ${vuln.recommendation}`
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: 'package.json'
                },
                region: {
                  startLine: 1
                }
              }
            }
          ]
        });
      }
    }

    const log: SarifLog = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'QAForge Security Engine',
              version: '1.0.0',
              informationUri: 'https://github.com/NadiaSalah/QAForge',
              rules: Array.from(rulesMap.values())
            }
          },
          results
        }
      ]
    };

    const defaultPath = path.join(root, '.qaforge', 'reports', 'security.sarif');
    const targetPath = outputPath ? (path.isAbsolute(outputPath) ? outputPath : path.join(root, outputPath)) : defaultPath;

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, JSON.stringify(log, null, 2), 'utf8');
    return { sarifPath: targetPath, log };
  }

  private static mapSeverityToSarifLevel(severity: string): 'error' | 'warning' | 'note' | 'none' {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
      case 'MODERATE':
        return 'warning';
      case 'LOW':
      case 'INFO':
        return 'note';
      default:
        return 'note';
    }
  }
}
