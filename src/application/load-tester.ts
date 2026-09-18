export interface LoadTestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  vus?: number; // Virtual Users (concurrent workers)
  durationSec?: number; // Total duration in seconds
  maxRequests?: number; // Optional limit on total requests
  timeoutMs?: number;
}

export interface LatencyPercentiles {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface LoadTestReport {
  targetUrl: string;
  method: string;
  vus: number;
  durationMs: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  totalBytes: number;
  bytesPerSecond: number;
  errorRatePercent: number;
  latency: LatencyPercentiles;
  statusCodeDistribution: Record<number, number>;
  status: 'PASSED' | 'DEGRADED' | 'FAILED';
  summary: string;
}

export class LoadTesterService {
  public static async runLoadTest(options: LoadTestOptions): Promise<LoadTestReport> {
    const method = options.method || 'GET';
    const vus = Math.max(1, Math.min(options.vus || 10, 200));
    const durationMs = (options.durationSec || 5) * 1000;
    const timeoutMs = options.timeoutMs || 5000;

    const latencies: number[] = [];
    const statusCodes: Record<number, number> = {};
    let totalBytes = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    const startTime = Date.now();
    const endTime = startTime + durationMs;

    let bodyPayload: string | undefined;
    if (options.body && method !== 'GET') {
      bodyPayload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const headers: Record<string, string> = {
      'User-Agent': 'VeloProve-LoadEngine/1.0',
      ...(options.headers || {})
    };
    if (bodyPayload && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Worker function for each virtual user
    const worker = async () => {
      while (Date.now() < endTime) {
        if (options.maxRequests && (successfulRequests + failedRequests) >= options.maxRequests) {
          break;
        }

        const reqStart = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await fetch(options.url, {
            method,
            headers,
            body: bodyPayload,
            signal: controller.signal
          });
          clearTimeout(timeout);

          const reqDuration = Date.now() - reqStart;
          latencies.push(reqDuration);

          statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;

          const text = await res.text();
          const size = Buffer.byteLength(text, 'utf8');
          totalBytes += size;

          if (res.status >= 200 && res.status < 400) {
            successfulRequests++;
          } else {
            failedRequests++;
          }
        } catch {
          clearTimeout(timeout);
          const reqDuration = Date.now() - reqStart;
          latencies.push(reqDuration);
          statusCodes[0] = (statusCodes[0] || 0) + 1;
          failedRequests++;
        }
      }
    };

    // Run workers concurrently
    await Promise.all(Array.from({ length: vus }, () => worker()));

    const actualDurationMs = Math.max(Date.now() - startTime, 1);
    const totalRequests = successfulRequests + failedRequests;
    const rps = Math.round((totalRequests / (actualDurationMs / 1000)) * 100) / 100;
    const bytesPerSec = Math.round((totalBytes / (actualDurationMs / 1000)) * 100) / 100;
    const errorRate = totalRequests > 0 ? Math.round((failedRequests / totalRequests) * 10000) / 100 : 0;

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const getPercentile = (p: number): number => {
      if (latencies.length === 0) return 0;
      const idx = Math.min(Math.floor((p / 100) * latencies.length), latencies.length - 1);
      return latencies[idx];
    };

    const min = latencies.length > 0 ? latencies[0] : 0;
    const max = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
    const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    const latencyMetrics: LatencyPercentiles = {
      min,
      max,
      avg,
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };

    let status: LoadTestReport['status'] = 'PASSED';
    if (errorRate > 10 || latencyMetrics.p95 > 2000) {
      status = 'FAILED';
    } else if (errorRate > 1 || latencyMetrics.p95 > 800) {
      status = 'DEGRADED';
    }

    const summary = `${status}: ${totalRequests} reqs in ${(actualDurationMs / 1000).toFixed(1)}s with ${vus} VUs (${rps} req/s). Avg: ${avg}ms, p95: ${latencyMetrics.p95}ms, Error Rate: ${errorRate}%.`;

    return {
      targetUrl: options.url,
      method,
      vus,
      durationMs: actualDurationMs,
      totalRequests,
      successfulRequests,
      failedRequests,
      requestsPerSecond: rps,
      totalBytes,
      bytesPerSecond: bytesPerSec,
      errorRatePercent: errorRate,
      latency: latencyMetrics,
      statusCodeDistribution: statusCodes,
      status,
      summary
    };
  }
}
