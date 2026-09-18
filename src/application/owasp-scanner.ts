export interface OwaspProbeResult {
  ruleId: string;
  category: 'A01:Broken Access Control' | 'A02:Cryptographic Failures' | 'A05:Security Misconfiguration' | 'A07:Identification and Authentication Failures';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  passed: boolean;
  evidence?: string;
  remediation: string;
}

export interface OwaspScanReport {
  targetUrl: string;
  scannedAt: string;
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  probes: OwaspProbeResult[];
}

export class OwaspScannerService {
  public static async scanEndpoint(targetUrl: string): Promise<OwaspScanReport> {
    const probes: OwaspProbeResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    let resHeaders: Record<string, string> = {};
    let status = 0;
    let responseText = '';

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'VeloProve-OWASP-Audit/1.0',
          'Origin': 'https://evil-attacker.example.com'
        }
      });
      status = res.status;
      res.headers.forEach((v, k) => {
        resHeaders[k.toLowerCase()] = v;
      });
      responseText = await res.text();
    } catch (err: any) {
      probes.push({
        ruleId: 'SEC-CONN-01',
        category: 'A05:Security Misconfiguration',
        severity: 'HIGH',
        title: 'Target Endpoint Unreachable',
        description: `Failed to connect to ${targetUrl}: ${err.message}`,
        passed: false,
        evidence: err.message,
        remediation: 'Ensure the local server or target application is active and running.'
      });
    }

    // Check 1: Content-Security-Policy (CSP)
    const hasCsp = Boolean(resHeaders['content-security-policy']);
    probes.push({
      ruleId: 'SEC-HEADER-CSP',
      category: 'A05:Security Misconfiguration',
      severity: 'MEDIUM',
      title: 'Content-Security-Policy Header',
      description: 'CSP mitigates XSS and data injection attacks by restricting resources that can be loaded.',
      passed: hasCsp,
      evidence: hasCsp ? resHeaders['content-security-policy'] : 'Header missing',
      remediation: "Add 'Content-Security-Policy: default-src \\'self\\'' header in HTTP responses."
    });

    // Check 2: X-Frame-Options (Clickjacking)
    const hasFrameOptions = Boolean(resHeaders['x-frame-options']);
    probes.push({
      ruleId: 'SEC-HEADER-CLICKJACK',
      category: 'A05:Security Misconfiguration',
      severity: 'MEDIUM',
      title: 'Clickjacking Protection (X-Frame-Options)',
      description: 'Prevents the application from being embedded in an iframe on malicious sites.',
      passed: hasFrameOptions,
      evidence: hasFrameOptions ? resHeaders['x-frame-options'] : 'Header missing',
      remediation: "Add 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN'."
    });

    // Check 3: X-Content-Type-Options (MIME Sniffing)
    const hasContentTypeOptions = resHeaders['x-content-type-options'] === 'nosniff';
    probes.push({
      ruleId: 'SEC-HEADER-NOSNIFF',
      category: 'A05:Security Misconfiguration',
      severity: 'LOW',
      title: 'MIME Sniffing Protection (X-Content-Type-Options)',
      description: 'Instructs the browser to follow MIME types indicated in Content-Type header.',
      passed: hasContentTypeOptions,
      evidence: resHeaders['x-content-type-options'] || 'Header missing',
      remediation: "Add 'X-Content-Type-Options: nosniff'."
    });

    // Check 4: Strict-Transport-Security (HSTS)
    const isHttps = targetUrl.startsWith('https');
    const hasHsts = Boolean(resHeaders['strict-transport-security']);
    probes.push({
      ruleId: 'SEC-HEADER-HSTS',
      category: 'A02:Cryptographic Failures',
      severity: isHttps ? 'HIGH' : 'LOW',
      title: 'HTTP Strict Transport Security (HSTS)',
      description: 'Enforces encrypted HTTPS connections and prevents SSL stripping.',
      passed: isHttps ? hasHsts : true, // Pass on localhost HTTP
      evidence: hasHsts ? resHeaders['strict-transport-security'] : (isHttps ? 'Missing on HTTPS' : 'Skipped for local HTTP'),
      remediation: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains'."
    });

    // Check 5: Information Disclosure / Server Leaks
    const serverHeader = resHeaders['server'] || resHeaders['x-powered-by'];
    const hasServerLeak = Boolean(serverHeader);
    probes.push({
      ruleId: 'SEC-INFO-LEAK',
      category: 'A05:Security Misconfiguration',
      severity: 'LOW',
      title: 'Technology & Server Fingerprint Disclosure',
      description: 'Disclosing exact server versions (e.g. Express, Apache, nginx) aids targeted exploits.',
      passed: !hasServerLeak,
      evidence: serverHeader ? `Disclosed: ${serverHeader}` : 'No server or x-powered-by header leaked',
      remediation: "Disable 'X-Powered-By' and strip version numbers from the 'Server' header."
    });

    // Check 6: CORS Wildcard with Attacker Origin
    const corsOrigin = resHeaders['access-control-allow-origin'];
    const hasInsecureCors = corsOrigin === '*' && resHeaders['access-control-allow-credentials'] === 'true';
    const hasReflectedCors = corsOrigin === 'https://evil-attacker.example.com';
    const isCorsPassed = !hasInsecureCors && !hasReflectedCors;
    probes.push({
      ruleId: 'SEC-CORS-CONFIG',
      category: 'A01:Broken Access Control',
      severity: 'HIGH',
      title: 'CORS Origin Policy Validation',
      description: 'Improper CORS configurations allow arbitrary third-party domains to steal user data.',
      passed: isCorsPassed,
      evidence: corsOrigin ? `Access-Control-Allow-Origin: ${corsOrigin}` : 'No permissive CORS header found',
      remediation: 'Restrict Access-Control-Allow-Origin to trusted explicit whitelist domains.'
    });

    // Check 7: Sensitive Stack Trace in Error Responses (if status >= 400)
    const hasStackTrace = responseText.includes('at ') && (responseText.includes('.js:') || responseText.includes('.ts:'));
    probes.push({
      ruleId: 'SEC-ERR-STACK',
      category: 'A05:Security Misconfiguration',
      severity: 'HIGH',
      title: 'Stack Trace & Internal Path Exposure',
      description: 'Error responses must not leak internal filesystem paths or raw stack traces in production.',
      passed: !hasStackTrace,
      evidence: hasStackTrace ? 'Found stack trace patterns in response' : 'No internal code stack traces detected',
      remediation: 'Use a global error handler that returns sanitized error messages.'
    });

    // Count passed / failed
    for (const p of probes) {
      if (p.passed) passedCount++;
      else failedCount++;
    }

    const total = probes.length;
    const score = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    let grade: OwaspScanReport['grade'] = 'A+';
    if (score < 50) grade = 'F';
    else if (score < 65) grade = 'D';
    else if (score < 80) grade = 'C';
    else if (score < 90) grade = 'B';
    else if (score < 100) grade = 'A';

    return {
      targetUrl,
      scannedAt: new Date().toISOString(),
      overallScore: score,
      grade,
      totalChecks: total,
      passedChecks: passedCount,
      failedChecks: failedCount,
      probes
    };
  }
}
