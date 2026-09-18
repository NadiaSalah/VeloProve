/**
 * Shared execution policy: timeouts, retries, concurrency.
 * Deterministic — read from VeloProveConfig.execution with safe defaults.
 */

export interface ExecutionTimeouts {
  processMs: number;
  browserMs: number;
  networkMs: number;
  aiMs: number;
  scannerMs: number;
}

export interface RetryPolicy {
  /** Max attempts for transient infrastructure failures (not test assertion fails). */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface ExecutionPolicyConfig {
  timeouts: ExecutionTimeouts;
  retry: RetryPolicy;
  concurrency: number;
}

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicyConfig = {
  timeouts: {
    processMs: 120_000,
    browserMs: 60_000,
    networkMs: 15_000,
    aiMs: 60_000,
    scannerMs: 180_000
  },
  retry: {
    maxAttempts: 2,
    baseDelayMs: 200,
    maxDelayMs: 2_000
  },
  concurrency: 4
};

export function mergeExecutionPolicy(
  partial?: Partial<{
    timeouts?: Partial<ExecutionTimeouts>;
    retry?: Partial<RetryPolicy>;
    concurrency?: number;
  }>
): ExecutionPolicyConfig {
  return {
    timeouts: { ...DEFAULT_EXECUTION_POLICY.timeouts, ...(partial?.timeouts || {}) },
    retry: { ...DEFAULT_EXECUTION_POLICY.retry, ...(partial?.retry || {}) },
    concurrency: partial?.concurrency && partial.concurrency > 0
      ? Math.min(32, Math.floor(partial.concurrency))
      : DEFAULT_EXECUTION_POLICY.concurrency
  };
}

const TRANSIENT_PATTERNS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /socket hang up/i,
  /rate limit/i,
  /429/,
  /503/,
  /EPIPE/i,
  /timed?\s*out/i
];

export function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_PATTERNS.some((p) => p.test(msg));
}

export async function withBoundedRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_EXECUTION_POLICY.retry,
  options: { signal?: AbortSignal; label?: string } = {}
): Promise<T> {
  let lastError: unknown;
  const attempts = Math.max(1, policy.maxAttempts);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (options.signal?.aborted) {
      throw Object.assign(new Error('Cancelled'), { code: 'VP_CANCELLED' });
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const transient = isTransientError(err);
      if (!transient || attempt >= attempts) {
        throw err;
      }
      const delay = Math.min(
        policy.maxDelayMs,
        policy.baseDelayMs * Math.pow(2, attempt - 1)
      );
      await sleep(delay, options.signal);
    }
  }

  throw lastError;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('Cancelled'), { code: 'VP_CANCELLED' }));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(Object.assign(new Error('Cancelled'), { code: 'VP_CANCELLED' }));
      },
      { once: true }
    );
  });
}

/** Run async work over items with a fixed concurrency ceiling. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results: R[] = new Array(items.length);
  let next = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      if (signal?.aborted) {
        throw Object.assign(new Error('Cancelled'), { code: 'VP_CANCELLED' });
      }
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
  return results;
}
