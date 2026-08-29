import fs from 'node:fs';
import path from 'node:path';
import type { RouteDefinition, ApiEndpoint } from '../../shared/types/project.js';

export class RouteScanner {
  public static scan(projectRoot: string): { routes: RouteDefinition[]; apiEndpoints: ApiEndpoint[] } {
    const routes: RouteDefinition[] = [];
    const apiEndpoints: ApiEndpoint[] = [];

    // 1. Next.js App Router (app/**/page.tsx or app/**/route.ts)
    const appDir = path.join(projectRoot, 'app');
    const srcAppDir = path.join(projectRoot, 'src', 'app');
    const effectiveAppDir = fs.existsSync(srcAppDir) ? srcAppDir : fs.existsSync(appDir) ? appDir : null;

    if (effectiveAppDir) {
      this.scanAppRouter(effectiveAppDir, projectRoot, routes, apiEndpoints);
    }

    // 2. Next.js / Nuxt Pages Router (pages/**/*.tsx or pages/api/**/*.ts)
    const pagesDir = path.join(projectRoot, 'pages');
    const srcPagesDir = path.join(projectRoot, 'src', 'pages');
    const effectivePagesDir = fs.existsSync(srcPagesDir) ? srcPagesDir : fs.existsSync(pagesDir) ? pagesDir : null;

    if (effectivePagesDir) {
      this.scanPagesRouter(effectivePagesDir, projectRoot, routes, apiEndpoints);
    }

    // 3. Scan Express / Fastify / REST endpoints in src/
    this.scanExpressEndpoints(projectRoot, apiEndpoints);

    // 4. Scan Custom Framework if configured in qaforge.framework.json
    const customConfig = path.join(projectRoot, 'qaforge.framework.json');
    if (fs.existsSync(customConfig)) {
      try {
        const def = JSON.parse(fs.readFileSync(customConfig, 'utf8'));
        const dirToScan = def.routeConvention?.directory ? path.join(projectRoot, def.routeConvention.directory) : null;
        if (dirToScan && fs.existsSync(dirToScan)) {
          const entries = fs.readdirSync(dirToScan, { recursive: true });
          for (const entry of entries) {
            const relStr = String(entry).replace(/\\/g, '/');
            if (/\.(ts|tsx|js|jsx|vue|svelte|html|php|py)$/.test(relStr) && !relStr.includes('.test.')) {
              const cleanPath = '/' + relStr.replace(/\.[^/.]+$/, '').replace(/\/index$/, '');
              const norm = cleanPath === '/index' || cleanPath === '' ? '/' : cleanPath;
              if (!routes.some(r => r.path === norm)) {
                routes.push({
                  path: norm,
                  sourceFile: path.join(def.routeConvention.directory, relStr).replace(/\\/g, '/'),
                  type: 'page',
                  isDynamic: norm.includes(':') || norm.includes('[') || norm.includes('{')
                });
              }
            }
          }
        }
      } catch {}
    }

    return { routes, apiEndpoints };
  }

  private static scanAppRouter(
    dir: string,
    root: string,
    routes: RouteDefinition[],
    apiEndpoints: ApiEndpoint[],
    currentRoute = ''
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const seg = entry.name.startsWith('(') && entry.name.endsWith(')') ? '' : `/${entry.name}`;
        this.scanAppRouter(fullPath, root, routes, apiEndpoints, `${currentRoute}${seg}`);
      } else if (entry.isFile()) {
        const relPath = path.relative(root, fullPath);
        if (entry.name.startsWith('page.')) {
          routes.push({
            path: currentRoute || '/',
            sourceFile: relPath,
            type: 'page',
            isDynamic: currentRoute.includes('[')
          });
        } else if (entry.name.startsWith('route.')) {
          // Detect exported HTTP methods
          const content = fs.readFileSync(fullPath, 'utf8');
          const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
          for (const method of methods) {
            if (new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(content)) {
              apiEndpoints.push({
                method: method as any,
                path: currentRoute || '/',
                sourceFile: relPath,
                authRequired: content.includes('auth') || content.includes('session')
              });
            }
          }
        }
      }
    }
  }

  private static scanPagesRouter(
    dir: string,
    root: string,
    routes: RouteDefinition[],
    apiEndpoints: ApiEndpoint[],
    currentRoute = ''
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.scanPagesRouter(fullPath, root, routes, apiEndpoints, `${currentRoute}/${entry.name}`);
      } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
        const relPath = path.relative(root, fullPath);
        const baseName = entry.name.replace(/\.(tsx|jsx|ts|js)$/, '');
        const routePath = baseName === 'index' ? currentRoute || '/' : `${currentRoute}/${baseName}`;

        if (routePath.startsWith('/api')) {
          apiEndpoints.push({
            method: 'GET',
            path: routePath,
            sourceFile: relPath
          });
        } else {
          routes.push({
            path: routePath,
            sourceFile: relPath,
            type: 'page',
            isDynamic: routePath.includes('[')
          });
        }
      }
    }
  }

  private static scanExpressEndpoints(projectRoot: string, apiEndpoints: ApiEndpoint[]): void {
    const searchDirs = ['src', 'routes', 'controllers', 'server', 'api'];
    for (const dirName of searchDirs) {
      const fullDir = path.join(projectRoot, dirName);
      if (fs.existsSync(fullDir)) {
        this.scanDirForExpress(fullDir, projectRoot, apiEndpoints);
      }
    }
  }

  private static scanDirForExpress(dir: string, root: string, apiEndpoints: ApiEndpoint[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !['node_modules', 'dist', '.git', '.qaforge'].includes(entry.name)) {
        this.scanDirForExpress(fullPath, root, apiEndpoints);
      } else if (entry.isFile() && /\.(ts|js|mjs)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relPath = path.relative(root, fullPath);
          
          // Regex to match app.get('/path', ...), router.post("/path", ...)
          const routePattern = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
          let match: RegExpExecArray | null;
          while ((match = routePattern.exec(content)) !== null) {
            const method = match[1].toUpperCase() as any;
            const routePath = match[2];
            // Avoid duplicate additions
            if (!apiEndpoints.some(e => e.method === method && e.path === routePath && e.sourceFile === relPath)) {
              apiEndpoints.push({
                method,
                path: routePath,
                sourceFile: relPath,
                authRequired: /auth|protect|jwt|verifyToken|authenticate/i.test(content)
              });
            }
          }
        } catch {
          // ignore read errors
        }
      }
    }
  }
}
