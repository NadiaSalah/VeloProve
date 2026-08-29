export type NetworkProfile =
  | 'GPRS_SLOW'       // 50 kbps, 500ms latency
  | 'REGULAR_3G'      // 750 kbps, 100ms latency
  | 'GOOD_4G'         // 4 Mbps, 20ms latency
  | 'OFFLINE_DROP'    // 0 kbps, connection dropped
  | 'PACKET_LOSS';    // 30% drop rate

export interface ThrottledRequestOptions {
  targetUrl: string;
  method?: string;
  profile: NetworkProfile;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ThrottledResponseResult {
  targetUrl: string;
  profile: NetworkProfile;
  latencyAddedMs: number;
  totalDurationMs: number;
  statusCode: number;
  passed: boolean;
  handledGracefully: boolean;
  resilienceRating: 'EXCELLENT' | 'DEGRADED' | 'FAILED_OFFLINE';
  detail: string;
}

export class NetworkThrottlerService {
  /**
   * Simulates network latency, packet loss, and offline state against HTTP endpoints
   */
  public static async runThrottledRequest(options: ThrottledRequestOptions): Promise<ThrottledResponseResult> {
    const profile = options.profile;
    const targetUrl = options.targetUrl;
    const method = options.method || 'GET';
    const timeoutMs = options.timeoutMs || 8000;

    let latencyAddedMs = 0;
    let simulateDrop = false;

    switch (profile) {
      case 'GPRS_SLOW':
        latencyAddedMs = 500;
        break;
      case 'REGULAR_3G':
        latencyAddedMs = 150;
        break;
      case 'GOOD_4G':
        latencyAddedMs = 20;
        break;
      case 'OFFLINE_DROP':
        simulateDrop = true;
        break;
      case 'PACKET_LOSS':
        latencyAddedMs = 300;
        simulateDrop = Math.random() < 0.3;
        break;
    }

    const startTime = Date.now();

    if (simulateDrop) {
      return {
        targetUrl,
        profile,
        latencyAddedMs,
        totalDurationMs: 10,
        statusCode: 0,
        passed: false,
        handledGracefully: true,
        resilienceRating: 'FAILED_OFFLINE',
        detail: `Simulated offline network drop (${profile}). Application should activate offline fallback cache.`
      };
    }

    // Add artificial delay
    if (latencyAddedMs > 0) {
      await new Promise(res => setTimeout(res, latencyAddedMs));
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(targetUrl, {
        method,
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      clearTimeout(timer);

      const totalDuration = Date.now() - startTime;
      const statusCode = res.status;
      const passed = statusCode < 500;

      return {
        targetUrl,
        profile,
        latencyAddedMs,
        totalDurationMs: totalDuration,
        statusCode,
        passed,
        handledGracefully: true,
        resilienceRating: totalDuration < 1000 ? 'EXCELLENT' : 'DEGRADED',
        detail: `Completed with HTTP ${statusCode} in ${totalDuration}ms under ${profile} throttling.`
      };
    } catch (err: any) {
      const totalDuration = Date.now() - startTime;
      return {
        targetUrl,
        profile,
        latencyAddedMs,
        totalDurationMs: totalDuration,
        statusCode: 0,
        passed: false,
        handledGracefully: false,
        resilienceRating: 'FAILED_OFFLINE',
        detail: `Connection failed/timed out after ${totalDuration}ms: ${err.message}`
      };
    }
  }
}
