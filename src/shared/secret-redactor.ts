/**
 * Central redaction utility for security logs, reports, and MCP outputs.
 * Masks tokens, passwords, session cookies, auth headers, and API keys.
 */
export class SecretRedactor {
  private static sensitivePatterns = [
    /("?password"?\s*[:=]\s*)"([^"]+)"/gi,
    /("?password"?\s*[:=]\s*)'([^']+)'/gi,
    /("?token"?\s*[:=]\s*)"([^"]+)"/gi,
    /("?secret"?\s*[:=]\s*)"([^"]+)"/gi,
    /("?apiKey"?\s*[:=]\s*)"([^"]+)"/gi,
    /(Bearer\s+)[a-zA-Z0-9_\-\.]{15,}/gi,
    /(Basic\s+)[a-zA-Z0-9+\/=]{15,}/gi,
    /(eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,})/g, // JWTs
    /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, // Emails (partially masked)
    /(connect\.sid=[a-zA-Z0-9_\-%]+)/gi,
    /(sessionId=[a-zA-Z0-9_\-%]+)/gi
  ];

  public static redact(text: string): string {
    if (!text || typeof text !== 'string') return text;
    let redacted = text;

    // Redact JWT tokens
    redacted = redacted.replace(/(eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,})/g, 'eyJ...[REDACTED_JWT]...');

    // Redact Bearer authorization
    redacted = redacted.replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_BEARER_TOKEN]');

    // Redact password values in json / query
    redacted = redacted.replace(/("?password"?\s*[:=]\s*)"[^"]+"/gi, '$1"***REDACTED***"');
    redacted = redacted.replace(/("?password"?\s*[:=]\s*)'[^']+'/gi, '$1\'***REDACTED***\'');

    // Redact secrets and api keys (quoted JSON / config)
    redacted = redacted.replace(/("?(?:secret|apiKey|api_key|access_token|private_key)"?\s*[:=]\s*)"[^"]+"/gi, '$1"***REDACTED***"');

    // Redact bare token=/password=/api_key= in logs (process stdout); keep prior JWT/Bearer markers
    redacted = redacted.replace(
      /\b((?:access_)?token|password|api[_-]?key|secret)\s*=\s*([^\s&;,"']{8,})/gi,
      (full, key: string, value: string) => (/REDACTED/i.test(value) ? full : `${key}=***`)
    );
    // Redact session cookies
    redacted = redacted.replace(/(connect\.sid=)[^;\s]+/gi, '$1[REDACTED_SESSION_COOKIE]');
    redacted = redacted.replace(/(session(?:_id|Id)?=)[^;\s]+/gi, '$1[REDACTED_SESSION_COOKIE]');

    return redacted;
  }

  public static redactObject<T>(obj: T): T {
    if (!obj) return obj;
    try {
      const json = JSON.stringify(obj);
      const redactedJson = SecretRedactor.redact(json);
      return JSON.parse(redactedJson);
    } catch {
      return obj;
    }
  }
}
