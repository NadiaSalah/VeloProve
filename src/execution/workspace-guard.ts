import path from 'node:path';
import fs from 'node:fs';

/**
 * WorkspaceGuard — filesystem sandbox for all VeloProve writes/reads.
 * Resolves paths under projectRoot, rejects null bytes / escapes, and is the
 * single gate every adapter and service should use before touching disk.
 */
export class WorkspaceGuard {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  public getRoot(): string {
    return this.projectRoot;
  }

  /**
   * Resolve a path that must stay inside the project root.
   * Rejects null bytes, empty targets, and traversal escapes.
   * When the path exists, resolves symlinks and re-validates containment.
   */
  public resolveSafePath(targetPath: string): string {
    if (typeof targetPath !== 'string' || targetPath.length === 0) {
      throw new Error('Security Violation: Empty path is not allowed');
    }
    if (targetPath.includes('\0')) {
      throw new Error(`Security Violation: Path contains null byte: "${targetPath}"`);
    }

    // Normalize separators without resolving yet
    const normalizedInput = targetPath.replace(/\\/g, '/');
    if (normalizedInput.split('/').includes('..')) {
      // Still allow ".." only if final resolve stays inside root — checked below
    }

    const resolved = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.projectRoot, targetPath);

    this.assertInsideRoot(resolved, targetPath);

    // If path exists, follow symlinks and verify the real path stays inside root
    try {
      if (fs.existsSync(resolved)) {
        const real = fs.realpathSync(resolved);
        this.assertInsideRoot(real, targetPath);
        return real;
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Security Violation')) {
        throw err;
      }
      // Non-existent paths are fine — return resolved logical path
    }

    return resolved;
  }

  private assertInsideRoot(resolved: string, original: string): void {
    const root = this.projectRoot;
    const relative = path.relative(root, resolved);
    // On Windows, different drive letters make relative an absolute path
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(
        `Security Violation: Path "${original}" resolves outside project root "${root}"`
      );
    }
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

  public getVeloProveDirectory(): string {
    return this.ensureDirectory(path.join(this.projectRoot, '.veloprove'));
  }
}
