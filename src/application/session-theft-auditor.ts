import fs from 'node:fs';
import path from 'node:path';

export interface CookieFlagAnalysis {
  raw: string;
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
  issues: string[];
}

export interface SessionTheftStaticFinding {
  kind:
    | 'HTTPONLY_DISABLED'
    | 'SECURE_MISSING'
    | 'SAMESITE_MISSING'
    | 'SESSION_ID_IN_URL'
    | 'SESSION_FIXATION'
    | 'CLIENT_SIDE_SESSION_STORE'
    | 'LOGOUT_NO_INVALIDATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;
  expected: string;
  actual: string;
  impact: string;
  remediation: string;
  sourceFile?: string;
}

/**
 * Session theft / hijacking auditors used by the Security Engine.
 * Covers cookie flags, session fixation, URL session IDs, client-side token storage,
 * and logout invalidation gaps — all non-destructive.
 */
export class SessionTheftAuditor {
  public static parseSetCookieHeader(header: string): CookieFlagAnalysis {
    const parts = header.split(';').map((p) => p.trim());
    const [nameValue] = parts;
    const name = (nameValue.split('=')[0] || 'cookie').trim();
    const lowerParts = parts.map((p) => p.toLowerCase());
    const httpOnly = lowerParts.some((p) => p === 'httponly');
    const secure = lowerParts.some((p) => p === 'secure');
    const sameSitePart = lowerParts.find((p) => p.startsWith('samesite='));
    const sameSite = sameSitePart?.split('=')[1];

    const issues: string[] = [];
    const looksAuth = /sid|session|auth|token|jwt|connect\.sid|jsessionid|csrf/i.test(name);

    if (looksAuth) {
      if (!httpOnly) issues.push('Missing HttpOnly (XSS can steal cookie)');
      if (!secure) issues.push('Missing Secure (cookie may travel over HTTP)');
      if (!sameSite) issues.push('Missing SameSite (CSRF / cross-site cookie send)');
      else if (sameSite === 'none' && !secure) issues.push('SameSite=None without Secure');
    }

    return { raw: header, name, httpOnly, secure, sameSite, issues };
  }

  public static collectSetCookies(headers: Headers): string[] {
    const anyHeaders = headers as Headers & { getSetCookie?: () => string[] };
    if (typeof anyHeaders.getSetCookie === 'function') {
      return anyHeaders.getSetCookie();
    }
    const single = headers.get('set-cookie');
    return single ? [single] : [];
  }

  public static async analyzeLiveCookies(baseURL: string): Promise<{
    cookies: CookieFlagAnalysis[];
    findings: SessionTheftStaticFinding[];
  }> {
    const findings: SessionTheftStaticFinding[] = [];
    const cookies: CookieFlagAnalysis[] = [];

    try {
      const res = await fetch(baseURL, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'VeloProve-SessionTheftAuditor/1.0' }
      });
      for (const header of this.collectSetCookies(res.headers)) {
        const parsed = this.parseSetCookieHeader(header);
        cookies.push(parsed);
        for (const issue of parsed.issues) {
          findings.push({
            kind: issue.includes('HttpOnly')
              ? 'HTTPONLY_DISABLED'
              : issue.includes('Secure') && !issue.includes('SameSite')
                ? 'SECURE_MISSING'
                : 'SAMESITE_MISSING',
            severity: issue.includes('HttpOnly') ? 'HIGH' : 'MEDIUM',
            evidence: `Set-Cookie for "${parsed.name}" from ${baseURL}: ${issue}`,
            expected: 'Auth/session cookies must set HttpOnly; Secure; SameSite=Lax|Strict',
            actual: `httpOnly=${parsed.httpOnly}, secure=${parsed.secure}, sameSite=${parsed.sameSite || 'unset'}`,
            impact: 'Stolen or cross-site replayed session cookies enable account takeover.',
            remediation: 'Set res.cookie(..., { httpOnly: true, secure: true, sameSite: "lax" }) or equivalent.'
          });
        }
      }
    } catch (err: any) {
      // Live target unreachable — caller treats as inconclusive
      findings.push({
        kind: 'SECURE_MISSING',
        severity: 'LOW',
        evidence: `Unable to probe live cookies at ${baseURL}: ${err.message}`,
        expected: 'Reachable target for live Set-Cookie inspection',
        actual: 'Probe failed',
        impact: 'Live session cookie theft checks could not run.',
        remediation: 'Pass a reachable --url / baseURL when testing session theft live.'
      });
    }

    return { cookies, findings };
  }

  public static scanSource(root: string, sourceFiles: string[]): SessionTheftStaticFinding[] {
    const findings: SessionTheftStaticFinding[] = [];
    const urlSessionPatterns = [
      /[?&](sid|sessionid|session_id|jsessionid|phpsessid)=/i,
      /;jsessionid=/i,
      /session\.id\s*=\s*req\.query/i,
      /req\.query\.(sid|session)/i
    ];
    const clientStorePatterns = [
      /localStorage\.setItem\s*\(\s*['"`](token|auth|session|jwt)/i,
      /sessionStorage\.setItem\s*\(\s*['"`](token|auth|session|jwt)/i,
      /document\.cookie\s*=/i
    ];

    let sawSessionLib = false;
    let sawRegenerate = false;
    let sawLogout = false;
    let sawDestroy = false;
    let cookieHttpOnlyFalse = false;
    let cookieMissingSameSiteHint = false;
    let cookieFile: string | undefined;

    for (const relFile of sourceFiles) {
      const fullPath = path.join(root, relFile);
      if (!fs.existsSync(fullPath)) continue;
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      // Strip line comments so documentation mentioning regenerate does not hide real gaps
      const codeOnly = content.replace(/\/\/.*$/gm, '');

      for (const re of urlSessionPatterns) {
        if (re.test(codeOnly)) {
          findings.push({
            kind: 'SESSION_ID_IN_URL',
            severity: 'HIGH',
            evidence: `Session identifier appears in URL/query handling in ${relFile}`,
            expected: 'Session IDs must live only in HttpOnly cookies or Authorization headers — never in URLs.',
            actual: 'Session ID pattern found in query string / URL rewriting.',
            impact: 'Session IDs leak via Referer, browser history, proxies, and server logs — trivial theft.',
            remediation: 'Remove session IDs from URLs; use secure cookies or bearer tokens.',
            sourceFile: relFile
          });
          break;
        }
      }

      for (const re of clientStorePatterns) {
        if (re.test(codeOnly)) {
          findings.push({
            kind: 'CLIENT_SIDE_SESSION_STORE',
            severity: 'HIGH',
            evidence: `Client-accessible session/token storage pattern in ${relFile}`,
            expected: 'Prefer HttpOnly cookies; avoid localStorage/sessionStorage for session secrets.',
            actual: 'Token/session written to document.cookie, localStorage, or sessionStorage.',
            impact: 'Any XSS can steal the session (classic session theft).',
            remediation: 'Move auth to HttpOnly Secure SameSite cookies, or short-lived memory-only tokens with strict CSP.',
            sourceFile: relFile
          });
          break;
        }
      }

      if (/express-session|cookie-session|iron-session|next-auth|passport\.serialize/i.test(codeOnly)) {
        sawSessionLib = true;
      }
      if (/session\.regenerate|req\.session\.regenerate|regenerate\s*\(/i.test(codeOnly)) {
        sawRegenerate = true;
      }
      if (/\/logout|signOut|signout|logOut/i.test(codeOnly)) {
        sawLogout = true;
      }
      if (/session\.destroy|req\.session\.destroy|invalidate|revoke/i.test(codeOnly)) {
        sawDestroy = true;
      }

      if (/res\.cookie\s*\(|cookie\s*\(/.test(codeOnly)) {
        cookieFile = relFile;
        if (/httpOnly\s*:\s*false/i.test(codeOnly)) {
          cookieHttpOnlyFalse = true;
        }
        if (/res\.cookie\s*\(/.test(codeOnly) && !/sameSite/i.test(codeOnly) && !/httpOnly\s*:\s*true/i.test(codeOnly)) {
          cookieMissingSameSiteHint = true;
        }
        if (/httpOnly\s*:\s*false/i.test(codeOnly)) {
          findings.push({
            kind: 'HTTPONLY_DISABLED',
            severity: 'HIGH',
            evidence: `Cookie configured with httpOnly: false in ${relFile}`,
            expected: 'Session cookies should have httpOnly: true to mitigate XSS cookie theft.',
            actual: 'httpOnly flag explicitly disabled.',
            impact: 'Client-side scripts can read and exfiltrate the session cookie.',
            remediation: 'Set httpOnly: true, secure: true, sameSite: "lax" or "strict".',
            sourceFile: relFile
          });
        }
      }
    }

    if (sawSessionLib && !sawRegenerate) {
      findings.push({
        kind: 'SESSION_FIXATION',
        severity: 'HIGH',
        evidence: 'Session library detected without session ID regeneration on login.',
        expected: 'Call session.regenerate() (or framework equivalent) after successful authentication.',
        actual: 'No session.regenerate / equivalent found in scanned sources.',
        impact: 'Attacker can fixate a known session ID and hijack the victim account after login (session fixation → theft).',
        remediation: 'After password/OAuth login succeeds, regenerate the session before binding the user id.',
        sourceFile: cookieFile
      });
    }

    if (sawLogout && !sawDestroy) {
      findings.push({
        kind: 'LOGOUT_NO_INVALIDATION',
        severity: 'HIGH',
        evidence: 'Logout route/handler detected without server-side session destroy/revoke.',
        expected: 'Logout must invalidate server-side session (destroy/revoke) so stolen cookies stop working.',
        actual: 'Logout UI/route present but no destroy/invalidate/revoke call found.',
        impact: 'Stolen session cookies remain valid after logout — prolonged session hijacking window.',
        remediation: 'On logout call req.session.destroy(), revoke refresh tokens, and clear Set-Cookie.',
        sourceFile: cookieFile
      });
    }

    if (cookieMissingSameSiteHint && !cookieHttpOnlyFalse) {
      findings.push({
        kind: 'SAMESITE_MISSING',
        severity: 'MEDIUM',
        evidence: `res.cookie usage without clear SameSite/HttpOnly hardening${cookieFile ? ` in ${cookieFile}` : ''}`,
        expected: 'Explicit sameSite + httpOnly on auth cookies.',
        actual: 'Cookie helper used without obvious SameSite hardening in nearby options.',
        impact: 'Cross-site requests may include cookies, aiding CSRF-assisted session abuse.',
        remediation: 'Set sameSite: "lax" (or "strict") and httpOnly: true on auth cookies.',
        sourceFile: cookieFile
      });
    }

    return findings;
  }
}
