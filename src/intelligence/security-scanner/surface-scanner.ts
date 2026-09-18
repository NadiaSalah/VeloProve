import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../../execution/workspace-guard.js';
import type { ProjectProfile } from '../../shared/types/project.js';
import type { SecurityAttackSurface } from '../../shared/types/security.js';

export class SecuritySurfaceScanner {
  public static scan(guard: WorkspaceGuard, profile?: ProjectProfile): SecurityAttackSurface {
    const root = guard.getRoot();
    const rawSourceFiles = profile?.sourceFiles && profile.sourceFiles.length > 0 ? profile.sourceFiles : this.gatherSourceFiles(root);
    const sourceFiles: string[] = rawSourceFiles.map(s => typeof s === 'string' ? s : s.relativePath || s.path);

    const authEndpoints: SecurityAttackSurface['authEndpoints'] = [];
    const protectedRoutes: SecurityAttackSurface['protectedRoutes'] = [];
    const formsAndInputs: SecurityAttackSurface['formsAndInputs'] = [];
    const fileUploadEndpoints: SecurityAttackSurface['fileUploadEndpoints'] = [];

    // Analyze dependencies from package.json
    const packageJsonPath = path.join(root, 'package.json');
    let allDeps: Record<string, string> = {};
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      } catch {}
    }

    // Detected libraries
    const detectedLibraries: string[] = [];
    const jwtDetected = Boolean(
      allDeps['jsonwebtoken'] ||
      allDeps['jose'] ||
      allDeps['jwt-simple'] ||
      allDeps['express-jwt'] ||
      allDeps['@nestjs/jwt'] ||
      allDeps['passport-jwt'] ||
      allDeps['next-auth']
    );
    if (jwtDetected) detectedLibraries.push('JWT');

    const cookiesDetected = Boolean(
      allDeps['cookie-parser'] ||
      allDeps['express-session'] ||
      allDeps['cookie-session'] ||
      allDeps['cookies'] ||
      allDeps['cookie']
    );
    if (cookiesDetected) detectedLibraries.push('Session/Cookies');

    const sqlLibs = ['pg', 'mysql', 'mysql2', 'sqlite', 'sqlite3', 'better-sqlite3', 'sequelize', 'typeorm', 'knex', 'prisma', '@prisma/client', 'drizzle-orm'];
    const noSqlLibs = ['mongodb', 'mongoose', 'couchdb', 'ioredis', 'redis'];

    const ormOrLibraries: string[] = [];
    let sqlDetected = false;
    let noSqlDetected = false;

    for (const lib of sqlLibs) {
      if (allDeps[lib]) {
        sqlDetected = true;
        ormOrLibraries.push(lib);
      }
    }
    for (const lib of noSqlLibs) {
      if (allDeps[lib]) {
        noSqlDetected = true;
        ormOrLibraries.push(lib);
      }
    }

    // Framework detection
    const detectedFramework = profile?.frameworks?.[0] ||
      (allDeps['next'] ? 'Next.js' : allDeps['express'] ? 'Express' : allDeps['@nestjs/core'] ? 'NestJS' : allDeps['fastify'] ? 'Fastify' : allDeps['react'] ? 'React' : 'Node.js');

    // 1. Process profile API endpoints and routes if available
    if (profile) {
      for (const ep of profile.apiEndpoints) {
        const lowerPath = ep.path.toLowerCase();
        if (lowerPath.includes('login') || lowerPath.includes('signin')) {
          authEndpoints.push({ path: ep.path, method: ep.method, type: 'login', sourceFile: ep.sourceFile });
        } else if (lowerPath.includes('register') || lowerPath.includes('signup')) {
          authEndpoints.push({ path: ep.path, method: ep.method, type: 'register', sourceFile: ep.sourceFile });
        } else if (lowerPath.includes('logout') || lowerPath.includes('signout')) {
          authEndpoints.push({ path: ep.path, method: ep.method, type: 'logout', sourceFile: ep.sourceFile });
        } else if (lowerPath.includes('password') || lowerPath.includes('reset') || lowerPath.includes('forgot')) {
          authEndpoints.push({ path: ep.path, method: ep.method, type: 'password_reset', sourceFile: ep.sourceFile });
        } else if (lowerPath.includes('oauth') || lowerPath.includes('callback')) {
          authEndpoints.push({ path: ep.path, method: ep.method, type: 'oauth', sourceFile: ep.sourceFile });
        } else if (lowerPath.includes('refresh')) {
          authEndpoints.push({ path: ep.path, method: ep.method, type: 'token_refresh', sourceFile: ep.sourceFile });
        } else if (lowerPath.includes('profile') || lowerPath.includes('account') || lowerPath.includes('me')) {
          authEndpoints.push({ path: ep.path, method: ep.method, type: 'user_profile', sourceFile: ep.sourceFile });
        }

        if (lowerPath.includes('/admin') || lowerPath.includes('/dashboard') || lowerPath.includes('/protected') || lowerPath.includes('/private') || lowerPath.includes('/manage')) {
          protectedRoutes.push({ path: ep.path, method: ep.method, requiredRole: lowerPath.includes('/admin') ? 'admin' : 'authenticated', sourceFile: ep.sourceFile });
        }

        if (lowerPath.includes('upload') || lowerPath.includes('file') || lowerPath.includes('media') || lowerPath.includes('attachment')) {
          fileUploadEndpoints.push({
            path: ep.path,
            method: ep.method,
            fieldName: 'file',
            maxSizeMb: 5,
            allowedMimes: ['image/png', 'image/jpeg', 'application/pdf'],
            sourceFile: ep.sourceFile
          });
        }
      }

      for (const r of profile.routes) {
        const lowerPath = r.path.toLowerCase();
        if (lowerPath.includes('login') || lowerPath.includes('signin')) {
          authEndpoints.push({ path: r.path, method: 'GET', type: 'login', sourceFile: r.sourceFile });
        } else if (lowerPath.includes('register') || lowerPath.includes('signup')) {
          authEndpoints.push({ path: r.path, method: 'GET', type: 'register', sourceFile: r.sourceFile });
        } else if (lowerPath.includes('forgot') || lowerPath.includes('reset-password')) {
          authEndpoints.push({ path: r.path, method: 'GET', type: 'password_reset', sourceFile: r.sourceFile });
        } else if (lowerPath.includes('/admin') || lowerPath.includes('/account') || lowerPath.includes('/settings')) {
          protectedRoutes.push({ path: r.path, method: 'GET', requiredRole: lowerPath.includes('/admin') ? 'admin' : 'user', sourceFile: r.sourceFile });
        }
      }
    }

    // 2. Scan source files for forms, inputs, uploads, guards, cookies, and routes
    for (const relFile of sourceFiles) {
      const fullPath = path.isAbsolute(relFile) ? relFile : path.join(root, relFile);
      if (!fs.existsSync(fullPath)) continue;

      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      // Check cookie flags in code
      let cookieFlags: SecurityAttackSurface['sessionAndTokenMechanisms']['cookieFlags'];
      if (content.includes('httpOnly:') || content.includes('secure:') || content.includes('sameSite:')) {
        cookieFlags = {
          httpOnly: content.includes('httpOnly: true'),
          secure: content.includes('secure: true'),
          sameSite: content.includes('sameSite: \'strict\'') || content.includes('sameSite: "strict"') ? 'strict' :
                    content.includes('sameSite: \'lax\'') || content.includes('sameSite: "lax"') ? 'lax' : 'none'
        };
      }

      // Scan for Multer / file upload middleware
      if (content.includes('multer(') || content.includes('formidable') || content.includes('busboy') || content.includes('upload.single') || content.includes('upload.array')) {
        const uploadMatch = content.match(/(?:router|app)\.(?:post|put)\(\s*['"]([^'"]+)['"]/i);
        if (uploadMatch) {
          const uploadPath = uploadMatch[1];
          if (!fileUploadEndpoints.some(e => e.path === uploadPath)) {
            fileUploadEndpoints.push({
              path: uploadPath,
              method: 'POST',
              fieldName: 'file',
              maxSizeMb: 5,
              allowedMimes: ['image/png', 'image/jpeg', 'application/pdf'],
              sourceFile: relFile
            });
          }
        }
      }

      // Scan for Guards / Middleware role checks
      const guardMatches = content.match(/(?:@UseGuards|authMiddleware|requireAuth|isAdmin|passport\.authenticate|authorize|verifyToken|role\s*===?\s*['"](\w+)['"])/g);
      if (guardMatches) {
        const routeMatch = content.match(/(?:@(?:Get|Post|Put|Delete)|app\.(?:get|post|put|delete)|router\.(?:get|post|put|delete))\(\s*['"]([^'"]+)['"]/i);
        if (routeMatch) {
          const routePath = routeMatch[1];
          if (!protectedRoutes.some(p => p.path === routePath)) {
            protectedRoutes.push({
              path: routePath,
              method: 'GET',
              middlewareOrGuard: guardMatches[0],
              requiredRole: content.includes('admin') ? 'admin' : 'authenticated',
              sourceFile: relFile
            });
          }
        }
      }

      // Scan for HTML / JSX Forms and Inputs
      if (content.includes('<form') || content.includes('<input') || content.includes('<textarea') || content.includes('<select')) {
        const inputs: Array<{ name: string; type: string; required?: boolean; isHidden?: boolean; isDisabled?: boolean }> = [];

        // Match inputs: <input name="xyz" type="password" ... />
        const inputRegex = /<input[^>]*>/gi;
        let match: RegExpExecArray | null;
        while ((match = inputRegex.exec(content)) !== null) {
          const tag = match[0];
          const nameMatch = tag.match(/name=['"]([^'"]+)['"]/i);
          const typeMatch = tag.match(/type=['"]([^'"]+)['"]/i);
          const isRequired = /required/i.test(tag);
          const isHidden = /type=['"]hidden['"]/i.test(tag);
          const isDisabled = /disabled/i.test(tag);

          const inputName = nameMatch ? nameMatch[1] : `input_${inputs.length + 1}`;
          const inputType = typeMatch ? typeMatch[1].toLowerCase() : 'text';

          if (!inputs.some(i => i.name === inputName)) {
            inputs.push({
              name: inputName,
              type: inputType,
              required: isRequired,
              isHidden,
              isDisabled
            });
          }
        }

        // Match textareas
        const textareaRegex = /<textarea[^>]*name=['"]([^'"]+)['"][^>]*>/gi;
        while ((match = textareaRegex.exec(content)) !== null) {
          const name = match[1];
          if (!inputs.some(i => i.name === name)) {
            inputs.push({ name, type: 'textarea', isHidden: false, isDisabled: false });
          }
        }

        // Match selects
        const selectRegex = /<select[^>]*name=['"]([^'"]+)['"][^>]*>/gi;
        while ((match = selectRegex.exec(content)) !== null) {
          const name = match[1];
          if (!inputs.some(i => i.name === name)) {
            inputs.push({ name, type: 'select', isHidden: false, isDisabled: false });
          }
        }

        if (inputs.length > 0) {
          const actionMatch = content.match(/<form[^>]*action=['"]([^'"]+)['"]/i);
          const methodMatch = content.match(/<form[^>]*method=['"]([^'"]+)['"]/i);
          formsAndInputs.push({
            formId: `form_${path.basename(relFile, path.extname(relFile))}`,
            action: actionMatch ? actionMatch[1] : undefined,
            method: methodMatch ? methodMatch[1].toUpperCase() : 'POST',
            inputs,
            sourceFile: relFile
          });
        }
      }
    }

    // Default fallback endpoints if project has standard login/admin/profile routes
    if (authEndpoints.length === 0) {
      authEndpoints.push({ path: '/api/auth/login', method: 'POST', type: 'login' });
      authEndpoints.push({ path: '/api/auth/register', method: 'POST', type: 'register' });
      authEndpoints.push({ path: '/api/auth/logout', method: 'POST', type: 'logout' });
    }

    // Deduplicate
    const uniqueAuth = Array.from(new Map(authEndpoints.map(a => [`${a.method}:${a.path}`, a])).values());
    const uniqueProtected = Array.from(new Map(protectedRoutes.map(p => [`${p.method}:${p.path}`, p])).values());
    const uniqueUploads = Array.from(new Map(fileUploadEndpoints.map(u => [`${u.method}:${u.path}`, u])).values());

    const totalFormInputs = formsAndInputs.reduce((sum, f) => sum + f.inputs.length, 0);

    return {
      authEndpoints: uniqueAuth,
      protectedRoutes: uniqueProtected,
      formsAndInputs,
      fileUploadEndpoints: uniqueUploads,
      sessionAndTokenMechanisms: {
        jwtDetected,
        cookiesDetected,
        detectedLibraries
      },
      databaseTechnologies: {
        sqlDetected,
        noSqlDetected,
        ormOrLibraries
      },
      detectedFramework,
      summary: {
        totalAuthEndpoints: uniqueAuth.length,
        totalProtectedRoutes: uniqueProtected.length,
        totalFormInputs,
        totalUploadEndpoints: uniqueUploads.length
      }
    };
  }

  public static gatherSourceFiles(dir: string, baseDir = dir): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.veloprove', '.cursor', '.agents']);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignoreDirs.has(entry.name)) {
            results.push(...this.gatherSourceFiles(path.join(dir, entry.name), baseDir));
          }
        } else if (/\.(ts|tsx|js|jsx|vue|svelte|html|py|php|go|rb|java)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          results.push(path.relative(baseDir, path.join(dir, entry.name)).replace(/\\/g, '/'));
        }
      }
    } catch {}

    return results;
  }
}
