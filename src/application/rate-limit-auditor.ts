import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface RateLimitProbeResult {
  targetUrl: string;
  totalRequestsSent: number;
  burstDurationMs: number;
  successful2xxCount: number;
  rateLimited429Count: number;
  serverError5xxCount: number;
  clientError4xxCount: number;
  detectedHeaders: {
    limitHeader?: string;
    remainingHeader?: string;
    resetHeader?: string;
    retryAfterHeader?: string;
  };
  hasRateLimitingProtection: boolean;
  isVulnerableToSimpleDos: boolean;
  resilienceScore: number; // 0 - 100
  verdict: 'STRONG_PROTECTION' | 'BASIC_PROTECTION' | 'NO_RATE_LIMIT_UNPROTECTED' | 'SERVER_CRASH_VULNERABLE';
  recommendations: string[];
}

export class RateLimitAuditorService {
  public static async auditEndpoint(options: {
    targetUrl: string;
    requestCount?: number;
    concurrency?: number;
    method?: string;
    headers?: Record<string, string>;
  }): Promise<RateLimitProbeResult> {
    const targetUrl = options.targetUrl;
    const requestCount = options.requestCount || 30;
    const concurrency = options.concurrency || 10;
    const method = options.method || 'GET';
    const customHeaders = options.headers || {};

    let successful2xx = 0;
    let rateLimited429 = 0;
    let serverError5xx = 0;
    let clientError4xx = 0;

    let detectedLimit: string | undefined;
    let detectedRemaining: string | undefined;
    let detectedReset: string | undefined;
    let detectedRetryAfter: string | undefined;

    const startTime = Date.now();

    // Run probes in concurrent batches
    const executeSingle = async (): Promise<void> => {
      try {
        const u = new URL(targetUrl);
        const isHttps = u.protocol === 'https:';
        const client = isHttps ? https : http;

        await new Promise<void>((resolve) => {
          const req = client.request(
            targetUrl,
            {
              method,
              headers: {
                'User-Agent': 'VeloProve-RateLimit-Probe/1.0',
                ...customHeaders
              },
              timeout: 4000
            },
            (res) => {
              const code = res.statusCode || 0;
              if (code >= 200 && code < 300) successful2xx++;
              else if (code === 429) rateLimited429++;
              else if (code >= 500) serverError5xx++;
              else if (code >= 400 && code < 500) clientError4xx++;

              // Check rate limit headers
              if (res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']) {
                detectedLimit = String(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']);
              }
              if (res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining']) {
                detectedRemaining = String(res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining']);
              }
              if (res.headers['ratelimit-reset'] || res.headers['x-ratelimit-reset']) {
                detectedReset = String(res.headers['ratelimit-reset'] || res.headers['x-ratelimit-reset']);
              }
              if (res.headers['retry-after']) {
                detectedRetryAfter = String(res.headers['retry-after']);
              }

              res.on('data', () => {});
              res.on('end', () => resolve());
            }
          );

          req.on('error', () => {
            serverError5xx++;
            resolve();
          });

          req.on('timeout', () => {
            req.destroy();
            serverError5xx++;
            resolve();
          });

          req.end();
        });
      } catch {
        serverError5xx++;
      }
    };

    // Execute in parallel batches
    for (let i = 0; i < requestCount; i += concurrency) {
      const batchSize = Math.min(concurrency, requestCount - i);
      const promises = Array.from({ length: batchSize }, () => executeSingle());
      await Promise.all(promises);
    }

    const durationMs = Date.now() - startTime;
    const hasRateLimiting = rateLimited429 > 0 || !!detectedLimit;
    const isVulnerableToDos = serverError5xx > (requestCount * 0.3);

    const recommendations: string[] = [];
    let resilienceScore = 100;

    if (isVulnerableToDos) {
      resilienceScore = 20;
      recommendations.push('Server yielded 5xx errors under modest burst. Implement backpressure or connection pooling.');
    } else if (!hasRateLimiting) {
      resilienceScore = 50;
      recommendations.push('No 429 status or RateLimit headers returned. Add middleware like express-rate-limit or reverse-proxy rate limiting.');
    } else {
      recommendations.push('Rate limiting is active and returned proper 429 / header throttling responses.');
    }

    let verdict: RateLimitProbeResult['verdict'] = 'STRONG_PROTECTION';
    if (isVulnerableToDos) verdict = 'SERVER_CRASH_VULNERABLE';
    else if (!hasRateLimiting) verdict = 'NO_RATE_LIMIT_UNPROTECTED';
    else if (rateLimited429 > 0 && !detectedLimit) verdict = 'BASIC_PROTECTION';

    return {
      targetUrl,
      totalRequestsSent: requestCount,
      burstDurationMs: durationMs,
      successful2xxCount: successful2xx,
      rateLimited429Count: rateLimited429,
      serverError5xxCount: serverError5xx,
      clientError4xxCount: clientError4xx,
      detectedHeaders: {
        limitHeader: detectedLimit,
        remainingHeader: detectedRemaining,
        resetHeader: detectedReset,
        retryAfterHeader: detectedRetryAfter
      },
      hasRateLimitingProtection: hasRateLimiting,
      isVulnerableToSimpleDos: isVulnerableToDos,
      resilienceScore,
      verdict,
      recommendations
    };
  }
}
