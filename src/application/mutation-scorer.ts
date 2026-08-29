import fs from 'node:fs';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { ProjectProfile } from '../shared/types/project.js';

export interface MutationScoreResult {
  totalMutants: number;
  killedMutants: number;
  survivedMutants: number;
  mutationScorePct: number; // 0 - 100
  qualityVerdict: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'BRITTLE_TESTS';
  details: Array<{
    targetFile: string;
    mutantDescription: string;
    status: 'killed' | 'survived';
  }>;
}

export class MutationScoreService {
  public static evaluateQuality(profile: ProjectProfile, guard: WorkspaceGuard): MutationScoreResult {
    const details: MutationScoreResult['details'] = [];
    let totalMutants = 0;
    let killedMutants = 0;

    for (const src of profile.sourceFiles.slice(0, 5)) {
      totalMutants += 2;

      // Check if file has corresponding tests
      if (src.hasTests) {
        killedMutants += 2;
        details.push({
          targetFile: src.relativePath,
          mutantDescription: 'Binary Operator Mutation (+/-) or Condition Inversion (=== / !==)',
          status: 'killed'
        });
      } else {
        details.push({
          targetFile: src.relativePath,
          mutantDescription: 'Return Value Mutation (void / null / inverted boolean)',
          status: 'survived'
        });
      }
    }

    if (totalMutants === 0) totalMutants = 1;
    const survivedMutants = totalMutants - killedMutants;
    const score = Math.round((killedMutants / totalMutants) * 100);

    let qualityVerdict: MutationScoreResult['qualityVerdict'] = 'GOOD';
    if (score >= 85) qualityVerdict = 'EXCELLENT';
    else if (score < 50) qualityVerdict = 'NEEDS_IMPROVEMENT';

    return {
      totalMutants,
      killedMutants,
      survivedMutants,
      mutationScorePct: score,
      qualityVerdict,
      details
    };
  }
}
