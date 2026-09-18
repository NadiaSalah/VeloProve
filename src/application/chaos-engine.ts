export type ChaosStrategy =
  | 'CORRUPTED_PAYLOAD'
  | 'PAYLOAD_FLOOD'
  | 'HEADER_MUTATION'
  | 'CONCURRENT_BURST'
  | 'TYPE_CONFUSION';

export interface ChaosTestOptions {
  targetUrl: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  basePayload?: Record<string, unknown>;
  strategies?: ChaosStrategy[];
  iterations?: number;
  timeoutMs?: number;
}

export interface ChaosProbeResult {
  strategy: ChaosStrategy;
  name: string;
  method: string;
  payloadSent: unknown;
  headersSent: Record<string, string>;
  statusCode: number;
  latencyMs: number;
  passed: boolean;
  resilienceVerdict: 'RESILIENT' | 'CRASHED_500' | 'TIMEOUT' | 'UNHANDLED_EXCEPTION';
  detail: string;
}

export interface ChaosReport {
  targetUrl: string;
  totalProbes: number;
  resilientCount: number;
  unhandled500Count: number;
  timeoutCount: number;
  resilienceScore: number; // 0 - 100
  overallVerdict: 'HIGHLY_RESILIENT' | 'DEGRADED' | 'VULNERABLE';
  probes: ChaosProbeResult[];
  summary: string;
}

export class ChaosEngineService {
  public static async runChaosTest(options: ChaosTestOptions): Promise<ChaosReport> {
    const targetUrl = options.targetUrl;
    const method = options.method || 'POST';
    const defaultStrategies: ChaosStrategy[] = ['CORRUPTED_PAYLOAD', 'PAYLOAD_FLOOD', 'HEADER_MUTATION', 'CONCURRENT_BURST', 'TYPE_CONFUSION'];
    const strategies: ChaosStrategy[] = options.strategies && options.strategies.length > 0
      ? options.strategies
      : defaultStrategies;
    const iterations = Math.max(1, Math.min(options.iterations || 3, 20));
    const timeoutMs = options.timeoutMs || 4000;

    const probes: ChaosProbeResult[] = [];

    // Generator for chaos payloads
    for (const strategy of strategies) {
      for (let i = 0; i < iterations; i++) {
        let payload: unknown = options.basePayload ? { ...options.basePayload } : { sample: 'data', count: 1 };
        let customHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'VeloProve-ChaosEngine/1.0',
          ...(options.headers || {})
        };
        let probeName = `${strategy} Probe #${i + 1}`;

        switch (strategy) {
          case 'CORRUPTED_PAYLOAD':
            if (i === 0) {
              payload = '{"broken": json... invalid';
              probeName = 'Malformed Non-JSON Syntax';
            } else if (i === 1) {
              payload = { __proto__: { admin: true }, constructor: { prototype: { poll: 1 } } };
              probeName = 'Prototype Pollution Probe';
            } else {
              payload = { input: '\'; DROP TABLE users; --', xss: '<script>alert(1)</script>' };
              probeName = 'SQLi / XSS Injection Probe';
            }
            break;

          case 'PAYLOAD_FLOOD':
            payload = { hugeString: 'A'.repeat(50000 * (i + 1)), deepArray: Array.from({ length: 1000 }, (_, idx) => idx) };
            probeName = `Large Buffer Memory Flood (${50 * (i + 1)}KB)`;
            break;

          case 'HEADER_MUTATION':
            if (i === 0) {
              customHeaders['Content-Type'] = 'text/plain; charset=utf-8';
              payload = 'Plaintext instead of JSON';
              probeName = 'Mismatched Content-Type';
            } else if (i === 1) {
              customHeaders['Content-Length'] = '999999';
              probeName = 'Spoofed Content-Length Header';
            } else {
              customHeaders['X-Forwarded-For'] = '127.0.0.1, 10.0.0.1';
              customHeaders['X-Forwarded-Host'] = 'evil.com';
              probeName = 'Host Header Injection';
            }
            break;

          case 'TYPE_CONFUSION':
            payload = {
              id: [1, 2, 3],
              count: 'not-a-number',
              isActive: { nested: true },
              email: null,
              timestamp: -99999999999999
            };
            probeName = 'Extreme Type Confusion';
            break;

          case 'CONCURRENT_BURST':
            probeName = `Concurrent Burst Worker #${i + 1}`;
            break;
        }

        const probeResult = await this.executeProbe(targetUrl, method, payload, customHeaders, strategy, probeName, timeoutMs);
        probes.push(probeResult);
      }
    }

    let resilientCount = 0;
    let unhandled500Count = 0;
    let timeoutCount = 0;

    for (const p of probes) {
      if (p.resilienceVerdict === 'RESILIENT') resilientCount++;
      else if (p.resilienceVerdict === 'CRASHED_500' || p.resilienceVerdict === 'UNHANDLED_EXCEPTION') unhandled500Count++;
      else if (p.resilienceVerdict === 'TIMEOUT') timeoutCount++;
    }

    const total = probes.length;
    const resilienceScore = total > 0 ? Math.round((resilientCount / total) * 100) : 100;

    let overallVerdict: ChaosReport['overallVerdict'] = 'HIGHLY_RESILIENT';
    if (resilienceScore < 60 || unhandled500Count > 2) {
      overallVerdict = 'VULNERABLE';
    } else if (resilienceScore < 85 || unhandled500Count > 0) {
      overallVerdict = 'DEGRADED';
    }

    const summary = `${overallVerdict} (Resilience: ${resilienceScore}%): Executed ${total} chaos probes. ${resilientCount} handled gracefully, ${unhandled500Count} server crash 500s, ${timeoutCount} timeouts.`;

    return {
      targetUrl,
      totalProbes: total,
      resilientCount,
      unhandled500Count,
      timeoutCount,
      resilienceScore,
      overallVerdict,
      probes,
      summary
    };
  }

  private static async executeProbe(
    targetUrl: string,
    method: string,
    payload: unknown,
    headers: Record<string, string>,
    strategy: ChaosStrategy,
    name: string,
    timeoutMs: number
  ): Promise<ChaosProbeResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let bodyStr: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    }

    try {
      const res = await fetch(targetUrl, {
        method,
        headers,
        body: bodyStr,
        signal: controller.signal
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - startTime;
      const statusCode = res.status;

      // 4xx client error is a graceful rejection = RESILIENT!
      // 2xx is also fine if endpoint handled it
      // 500 or 502/503 indicates an unhandled crash or exception
      let resilienceVerdict: ChaosProbeResult['resilienceVerdict'] = 'RESILIENT';
      let passed = true;

      if (statusCode >= 500) {
        resilienceVerdict = 'CRASHED_500';
        passed = false;
      }

      return {
        strategy,
        name,
        method,
        payloadSent: payload,
        headersSent: headers,
        statusCode,
        latencyMs,
        passed,
        resilienceVerdict,
        detail: `HTTP ${statusCode} in ${latencyMs}ms (${resilienceVerdict})`
      };
    } catch (err: any) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');

      return {
        strategy,
        name,
        method,
        payloadSent: payload,
        headersSent: headers,
        statusCode: 0,
        latencyMs,
        passed: false,
        resilienceVerdict: isTimeout ? 'TIMEOUT' : 'UNHANDLED_EXCEPTION',
        detail: isTimeout ? `Request timed out after ${timeoutMs}ms` : `Connection error: ${err.message}`
      };
    }
  }
}
