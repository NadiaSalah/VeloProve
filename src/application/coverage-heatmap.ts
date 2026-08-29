import type { DiscoveredRequirement } from '../shared/types/requirements.js';
import type { TestRunResult, TestCaseResult } from '../shared/types/tests.js';
import type { ProjectProfile } from '../shared/types/project.js';

export interface RequirementHeatmapItem {
  id: string;
  title: string;
  priority: string;
  category: string;
  coverageLevel: 'FULL' | 'PARTIAL' | 'UNCOVERED';
  coverageScore: number; // 0 - 100
  colorHex: string;
  associatedTestsCount: number;
  passRate: number; // 0 - 100
}

export interface HeatmapReport {
  overallCoverageScore: number; // 0 - 100
  fullCount: number;
  partialCount: number;
  uncoveredCount: number;
  items: RequirementHeatmapItem[];
  timestamp: string;
}

export class CoverageHeatmapService {
  public static generateHeatmap(
    requirements: DiscoveredRequirement[],
    profile: ProjectProfile,
    latestRun?: TestRunResult | null
  ): HeatmapReport {
    const items: RequirementHeatmapItem[] = [];

    let totalScore = 0;
    let full = 0;
    let partial = 0;
    let uncovered = 0;

    const allTestResults: TestCaseResult[] = latestRun?.testResults || [];

    for (const req of requirements) {
      // Find tests matching requirement ID or title
      const matched = allTestResults.filter(
        (t: TestCaseResult) => t.id.includes(req.id) || t.title.toLowerCase().includes(req.title.toLowerCase())
      );

      let score = 0;
      let level: RequirementHeatmapItem['coverageLevel'] = 'UNCOVERED';
      let color = '#ef4444'; // red

      if (matched.length > 0) {
        const passedCount = matched.filter((t: TestCaseResult) => t.status === 'passed').length;
        const passRate = Math.round((passedCount / matched.length) * 100);

        if (matched.length >= 2 && passRate === 100) {
          level = 'FULL';
          score = 100;
          color = '#10b981'; // green
          full++;
        } else {
          level = 'PARTIAL';
          score = Math.max(40, Math.min(80, passRate));
          color = '#f59e0b'; // amber/yellow
          partial++;
        }

        totalScore += score;
        items.push({
          id: req.id,
          title: req.title,
          priority: req.priority || 'medium',
          category: req.category || 'functional',
          coverageLevel: level,
          coverageScore: score,
          colorHex: color,
          associatedTestsCount: matched.length,
          passRate
        });
      } else {
        uncovered++;
        items.push({
          id: req.id,
          title: req.title,
          priority: req.priority || 'medium',
          category: req.category || 'functional',
          coverageLevel: 'UNCOVERED',
          coverageScore: 0,
          colorHex: '#ef4444',
          associatedTestsCount: 0,
          passRate: 0
        });
      }
    }

    const count = Math.max(1, requirements.length);
    const overallCoverageScore = Math.round(totalScore / count);

    return {
      overallCoverageScore,
      fullCount: full,
      partialCount: partial,
      uncoveredCount: uncovered,
      items,
      timestamp: new Date().toISOString()
    };
  }
}
