import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { ProjectProfile } from '../shared/types/project.js';
import { GitDiffAnalyzer } from '../intelligence/change-impact/git-diff-analyzer.js';
import { DependencyGraph, type ImpactAnalysisResult } from '../intelligence/change-impact/dependency-graph.js';

export class AnalyzeChangesService {
  public static async analyze(
    profile: ProjectProfile,
    guard: WorkspaceGuard
  ): Promise<ImpactAnalysisResult> {
    const changedFiles = await GitDiffAnalyzer.getChangedFiles(guard);
    const changedRelPaths = changedFiles.map(f => f.relativePath);

    return DependencyGraph.findImpactedTests(changedRelPaths, profile);
  }
}
