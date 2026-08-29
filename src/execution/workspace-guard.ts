import path from 'node:path';
import fs from 'node:fs';

export class WorkspaceGuard {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  public getRoot(): string {
    return this.projectRoot;
  }

  public resolveSafePath(targetPath: string): string {
    const resolved = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.projectRoot, targetPath);

    // Verify it is inside root
    const relative = path.relative(this.projectRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Security Violation: Path "${targetPath}" resolves outside project root "${this.projectRoot}"`);
    }

    return resolved;
  }

  public isWithinWorkspace(targetPath: string): boolean {
    try {
      this.resolveSafePath(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  public ensureDirectory(targetPath: string): string {
    const safePath = this.resolveSafePath(targetPath);
    if (!fs.existsSync(safePath)) {
      fs.mkdirSync(safePath, { recursive: true });
    }
    return safePath;
  }

  public getQAForgeDirectory(): string {
    return this.ensureDirectory(path.join(this.projectRoot, '.qaforge'));
  }
}
