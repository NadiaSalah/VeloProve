import type { SecurityAttackSurface, SecurityTestCase, SecurityTestPlan, SecurityTestingOptions, SecurityCategory } from '../../shared/types/security.js';

export class SecurityPlanner {
  public static createPlan(surface: SecurityAttackSurface, options: SecurityTestingOptions = {}): SecurityTestPlan {
    const testCases: SecurityTestCase[] = [];
    const enabledCategories = new Set<SecurityCategory>(
      options.categories || [
        'authentication',
        'authorization',
        'forms_inputs',
        'injection',
        'api_security',
        'sessions_tokens',
        'file_uploads'
      ]
    );

    // 1. Authentication Test Cases
    if (enabledCategories.has('authentication')) {
      const loginEndpoint = surface.authEndpoints.find(e => e.type === 'login') || { path: '/api/auth/login', method: 'POST' };

      testCases.push({
        id: 'sec_auth_login_valid',
        title: 'Authentication - Valid Credentials Flow & Token Issuance',
        category: 'authentication',
        subcategory: 'login',
        targetEndpoint: loginEndpoint.path,
        targetMethod: loginEndpoint.method,
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: true,
        destructive: false,
        description: 'Verify login issues expected session/token and handles valid credentials without sensitive error leakage.'
      });

      testCases.push({
        id: 'sec_auth_invalid_credentials',
        title: 'Authentication - Rejection of Invalid Credentials & User Enumeration Protection',
        category: 'authentication',
        subcategory: 'login',
        targetEndpoint: loginEndpoint.path,
        targetMethod: loginEndpoint.method,
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify invalid password or non-existent user returns generic 401/400 without revealing account existence.'
      });

      testCases.push({
        id: 'sec_auth_malformed_payload',
        title: 'Authentication - Empty, Null & Malformed Payload Resilience',
        category: 'authentication',
        subcategory: 'login',
        targetEndpoint: loginEndpoint.path,
        targetMethod: loginEndpoint.method,
        risk: 'MEDIUM',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify login endpoint does not crash or expose stack traces on unexpected data types or empty bodies.'
      });

      testCases.push({
        id: 'sec_auth_rate_limiting',
        title: 'Authentication - Safe Brute Force & Rate Limiting Threshold',
        category: 'authentication',
        subcategory: 'rate_limit',
        targetEndpoint: loginEndpoint.path,
        targetMethod: loginEndpoint.method,
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Perform safe non-abusive sequential failed login requests (max 5) to verify rate-limiting or 429 response.'
      });

      const resetEndpoint = surface.authEndpoints.find(e => e.type === 'password_reset');
      if (resetEndpoint) {
        testCases.push({
          id: 'sec_auth_password_reset_enumeration',
          title: 'Authentication - Password Reset Account Enumeration & Token Reuse',
          category: 'authentication',
          subcategory: 'password_reset',
          targetEndpoint: resetEndpoint.path,
          targetMethod: resetEndpoint.method,
          risk: 'MEDIUM',
          safeModeCompatible: true,
          requiresAuthentication: false,
          requiresBrowser: false,
          requiresApi: true,
          requiresFixtureData: false,
          destructive: false,
          description: 'Verify password reset endpoint responses do not differentiate between registered and unregistered emails.'
        });
      }
    }

    // 2. Authorization Test Cases
    if (enabledCategories.has('authorization')) {
      const targetProtected = surface.protectedRoutes[0] || { path: '/admin/dashboard', method: 'GET', requiredRole: 'admin' };

      testCases.push({
        id: 'sec_authz_unauthenticated_access',
        title: 'Authorization - Protected Route Access Without Authentication',
        category: 'authorization',
        subcategory: 'access_control',
        targetEndpoint: targetProtected.path,
        targetMethod: targetProtected.method,
        risk: 'CRITICAL',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify unauthenticated requests to protected routes receive 401 Unauthorized or 403 Forbidden.'
      });

      testCases.push({
        id: 'sec_authz_privilege_escalation',
        title: 'Authorization - Vertical Privilege Escalation (User vs Admin)',
        category: 'authorization',
        subcategory: 'privilege_escalation',
        targetEndpoint: targetProtected.path,
        targetMethod: targetProtected.method,
        risk: 'CRITICAL',
        safeModeCompatible: true,
        requiresAuthentication: true,
        requiresRole: 'user',
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: true,
        destructive: false,
        description: 'Verify low-privilege user tokens cannot invoke administrator routes or actions.'
      });

      testCases.push({
        id: 'sec_authz_idor_isolation',
        title: 'Authorization - Insecure Direct Object Reference (IDOR) Tenant Isolation',
        category: 'authorization',
        subcategory: 'idor',
        targetEndpoint: '/api/users/99999',
        targetMethod: 'GET',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: true,
        requiresRole: 'user',
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: true,
        destructive: false,
        description: 'Verify authenticated user cannot access or modify resources owned by another user identifier.'
      });
    }

    // 3. Forms & Inputs Test Cases
    if (enabledCategories.has('forms_inputs')) {
      testCases.push({
        id: 'sec_input_parameter_tampering',
        title: 'Forms & Inputs - Hidden & Disabled Field Parameter Tampering',
        category: 'forms_inputs',
        subcategory: 'tampering',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify server does not trust client-side hidden or disabled inputs (roles, prices, account IDs).'
      });

      testCases.push({
        id: 'sec_input_boundary_length',
        title: 'Forms & Inputs - Extreme Boundary Length & Unicode Edge Cases',
        category: 'forms_inputs',
        subcategory: 'boundaries',
        risk: 'MEDIUM',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify inputs handle multi-kilobyte strings and special Unicode glyphs gracefully without server crash.'
      });
    }

    // 4. Injection Test Cases
    if (enabledCategories.has('injection')) {
      if (surface.databaseTechnologies.sqlDetected || surface.databaseTechnologies.ormOrLibraries.length > 0 || true) {
        testCases.push({
          id: 'sec_inj_sql_safe_probe',
          title: 'Injection - Safe SQL Injection & Error Leakage Probing',
          category: 'injection',
          subcategory: 'sqli',
          risk: 'CRITICAL',
          safeModeCompatible: true,
          requiresAuthentication: false,
          requiresBrowser: false,
          requiresApi: true,
          requiresFixtureData: false,
          destructive: false,
          description: 'Send harmless SQL query probes to detect syntax errors, database driver leakage, or unauthorized record alteration.'
        });
      }

      if (surface.databaseTechnologies.noSqlDetected) {
        testCases.push({
          id: 'sec_inj_nosql_operator',
          title: 'Injection - Safe NoSQL Query Operator Injection ($ne, $gt)',
          category: 'injection',
          subcategory: 'nosqli',
          risk: 'HIGH',
          safeModeCompatible: true,
          requiresAuthentication: false,
          requiresBrowser: false,
          requiresApi: true,
          requiresFixtureData: false,
          destructive: false,
          description: 'Probe JSON endpoints with object operators to detect NoSQL query structure manipulation.'
        });
      }

      testCases.push({
        id: 'sec_inj_xss_reflected',
        title: 'Injection - Reflected XSS & Safe HTML Escaping Verification',
        category: 'injection',
        subcategory: 'xss',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: true,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify reflected input is safely escaped (&lt;script&gt;) and cannot execute as active JavaScript.'
      });

      testCases.push({
        id: 'sec_inj_xss_stored',
        title: 'Injection - Stored XSS Rendering Boundary Check',
        category: 'injection',
        subcategory: 'xss',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: true,
        requiresBrowser: true,
        requiresApi: true,
        requiresFixtureData: true,
        destructive: false,
        description: 'Verify saved profile/comment data renders safely on subsequent page views without script execution.'
      });

      testCases.push({
        id: 'sec_inj_command_injection',
        title: 'Injection - OS Command Injection Safe Harmless Proof Signal',
        category: 'injection',
        subcategory: 'command_injection',
        risk: 'CRITICAL',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Test parameters that trigger system utilities for shell interpolation using safe non-destructive echo markers.'
      });

      testCases.push({
        id: 'sec_inj_path_traversal',
        title: 'Injection - Path Traversal & Directory Confinement Verification',
        category: 'injection',
        subcategory: 'path_traversal',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify file download or view endpoints reject dot-dot-slash (../) directory traversal attempts.'
      });

      testCases.push({
        id: 'sec_inj_crlf_header',
        title: 'Injection - CRLF Response Splitting & Header Injection',
        category: 'injection',
        subcategory: 'crlf',
        risk: 'MEDIUM',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify newlines in query parameters cannot inject arbitrary HTTP response headers.'
      });
    }

    // 5. API Security Test Cases
    if (enabledCategories.has('api_security')) {
      testCases.push({
        id: 'sec_api_error_leakage',
        title: 'API Security - Verbose Error & Stack Trace Leakage Check',
        category: 'api_security',
        subcategory: 'error_leakage',
        risk: 'MEDIUM',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Send invalid inputs and verify responses do not expose internal paths, database connection strings, or stack traces.'
      });

      testCases.push({
        id: 'sec_api_content_type_mismatch',
        title: 'API Security - Content-Type Mismatch & Body Parser Hardening',
        category: 'api_security',
        subcategory: 'content_type',
        risk: 'LOW',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify API endpoints handle unexpected media types and malformed JSON payloads gracefully.'
      });
    }

    // 6. Sessions & Tokens Test Cases (includes session theft / hijacking suite)
    if (enabledCategories.has('sessions_tokens')) {
      testCases.push({
        id: 'sec_session_cookie_flags',
        title: 'Session Theft - Cookie Flags (HttpOnly, Secure, SameSite)',
        category: 'sessions_tokens',
        subcategory: 'session_theft_cookie_flags',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: false,
        destructive: false,
        description: 'Detect session cookies missing HttpOnly/Secure/SameSite that enable XSS and cross-site cookie theft.'
      });

      testCases.push({
        id: 'sec_session_id_url_exposure',
        title: 'Session Theft - Session ID Exposure in URLs',
        category: 'sessions_tokens',
        subcategory: 'session_theft_url_leak',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: false,
        requiresFixtureData: false,
        destructive: false,
        description: 'Detect session identifiers placed in query strings or URL rewriting (Referer/history leakage).'
      });

      testCases.push({
        id: 'sec_session_fixation',
        title: 'Session Theft - Session Fixation (ID Regeneration on Login)',
        category: 'sessions_tokens',
        subcategory: 'session_theft_fixation',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: false,
        requiresFixtureData: false,
        destructive: false,
        description: 'Verify session IDs are regenerated after authentication to prevent fixation-based account takeover.'
      });

      testCases.push({
        id: 'sec_session_client_storage_theft',
        title: 'Session Theft - Client-Side Token Storage (XSS Exfiltration)',
        category: 'sessions_tokens',
        subcategory: 'session_theft_client_store',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: false,
        requiresFixtureData: false,
        destructive: false,
        description: 'Detect auth tokens stored in localStorage/sessionStorage/document.cookie where XSS can steal them.'
      });

      testCases.push({
        id: 'sec_session_logout_invalidation',
        title: 'Session Theft - Logout Invalidates Stolen Sessions',
        category: 'sessions_tokens',
        subcategory: 'session_theft_logout',
        targetEndpoint: surface.authEndpoints.find(e => e.type === 'logout')?.path || '/api/auth/logout',
        targetMethod: 'POST',
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: true,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: true,
        destructive: false,
        description: 'Verify logout destroys/revokes server-side sessions so stolen cookies cannot be reused.'
      });

      if (surface.sessionAndTokenMechanisms.jwtDetected || true) {
        testCases.push({
          id: 'sec_jwt_tampering_rejection',
          title: 'Sessions & Tokens - JWT Signature & Modified Payload Rejection',
          category: 'sessions_tokens',
          subcategory: 'jwt_security',
          risk: 'CRITICAL',
          safeModeCompatible: true,
          requiresAuthentication: false,
          requiresBrowser: false,
          requiresApi: true,
          requiresFixtureData: false,
          destructive: false,
          description: 'Verify server rejects tokens with modified payloads, unsigned tokens (alg: "none"), or invalid signatures.'
        });
      }
    }

    // 7. File Uploads Test Cases
    if (enabledCategories.has('file_uploads') && (surface.fileUploadEndpoints.length > 0 || surface.summary.totalUploadEndpoints > 0)) {
      const uploadEp = surface.fileUploadEndpoints[0] || { path: '/api/upload', method: 'POST', fieldName: 'file' };

      testCases.push({
        id: 'sec_upload_extension_validation',
        title: 'File Uploads - Executable Extension & MIME Type Rejection',
        category: 'file_uploads',
        subcategory: 'extension_validation',
        targetEndpoint: uploadEp.path,
        targetMethod: uploadEp.method,
        targetParameter: uploadEp.fieldName,
        risk: 'CRITICAL',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: true,
        destructive: false,
        description: 'Verify upload endpoints reject executable extensions (.php, .exe, .sh, .html) and validate MIME types against content.'
      });

      testCases.push({
        id: 'sec_upload_filename_traversal',
        title: 'File Uploads - Filename Path Traversal Sanitization',
        category: 'file_uploads',
        subcategory: 'filename_sanitization',
        targetEndpoint: uploadEp.path,
        targetMethod: uploadEp.method,
        targetParameter: uploadEp.fieldName,
        risk: 'HIGH',
        safeModeCompatible: true,
        requiresAuthentication: false,
        requiresBrowser: false,
        requiresApi: true,
        requiresFixtureData: true,
        destructive: false,
        description: 'Verify filenames containing directory traversal characters (../../image.png) are sanitized before storage.'
      });
    }

    const byCategory: Record<SecurityCategory, number> = {
      authentication: 0,
      authorization: 0,
      forms_inputs: 0,
      injection: 0,
      api_security: 0,
      sessions_tokens: 0,
      file_uploads: 0
    };

    const byRisk: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    for (const tc of testCases) {
      byCategory[tc.category] = (byCategory[tc.category] || 0) + 1;
      byRisk[tc.risk] = (byRisk[tc.risk] || 0) + 1;
    }

    return {
      planId: `sec_plan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      surface,
      testCases,
      summary: {
        totalTests: testCases.length,
        byCategory,
        byRisk,
        estimatedDurationSec: Math.ceil(testCases.length * 0.4)
      }
    };
  }
}
