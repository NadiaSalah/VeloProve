/**
 * Live-observed API grounding (local Backend-2.0 analog).
 * GET/HEAD only — never mutates. Falls back silently when offline.
 */
export interface LiveApiObservation {
  url: string;
  method: 'GET' | 'HEAD';
  status: number;
  contentType?: string;
  bodyPreview?: string;
  /** Top-level JSON keys when body parses as object/array-of-object */
  jsonKeys?: string[];
  grounded: boolean;
  reason: string;
}

function pickPathFromTestCase(description: string, expectedBehavior: string, targetFiles: string[]): string {
  const blob = `${description} ${expectedBehavior} ${targetFiles.join(' ')}`;
  const m = blob.match(/(\/[a-zA-Z0-9._~!$&'()*+,;=:@/%-]{1,120})/);
  if (m) return m[1].split(/[?\s'"]/)[0];
  return '/';
}

/** Extract stable top-level keys from a JSON preview (max 12). */
export function extractJsonKeys(bodyPreview?: string): string[] | undefined {
  if (!bodyPreview || !bodyPreview.trim()) return undefined;
  try {
    const parsed = JSON.parse(bodyPreview);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object') {
      return Object.keys(parsed[0] as object).slice(0, 12);
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.keys(parsed as object).slice(0, 12);
    }
  } catch {
    /* not JSON */
  }
  return undefined;
}

export async function observeLiveApi(options: {
  baseURL?: string;
  pathHint?: string;
  timeoutMs?: number;
}): Promise<LiveApiObservation> {
  const base = (options.baseURL || process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const pathHint = options.pathHint || '/';
  const url = pathHint.startsWith('http') ? pathHint : `${base}${pathHint.startsWith('/') ? '' : '/'}${pathHint}`;
  const timeoutMs = options.timeoutMs ?? 2500;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal
    });
    const contentType = res.headers.get('content-type') || undefined;
    let bodyPreview: string | undefined;
    try {
      const text = await res.text();
      bodyPreview = text.slice(0, 400);
    } catch {
      /* ignore */
    }
    const jsonKeys = extractJsonKeys(bodyPreview);
    return {
      url,
      method: 'GET',
      status: res.status,
      contentType,
      bodyPreview,
      jsonKeys,
      grounded: res.status > 0 && res.status < 600,
      reason: `Observed live ${res.status} from ${url}`
    };
  } catch (err) {
    return {
      url,
      method: 'GET',
      status: 0,
      grounded: false,
      reason: err instanceof Error ? err.message : 'offline'
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe many paths with a small concurrency pool (GET only). */
export async function observeLiveApiBatch(options: {
  baseURL?: string;
  paths: string[];
  timeoutMs?: number;
  concurrency?: number;
}): Promise<Map<string, LiveApiObservation>> {
  const paths = [...new Set(options.paths.filter(Boolean))];
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 8));
  const out = new Map<string, LiveApiObservation>();
  let i = 0;
  async function worker() {
    while (i < paths.length) {
      const idx = i++;
      const p = paths[idx];
      const obs = await observeLiveApi({
        baseURL: options.baseURL,
        pathHint: p,
        timeoutMs: options.timeoutMs
      });
      out.set(p, obs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, () => worker()));
  return out;
}

export function pathHintForTestCase(tc: {
  description: string;
  expectedBehavior: string;
  targetFiles: string[];
}): string {
  return pickPathFromTestCase(tc.description, tc.expectedBehavior, tc.targetFiles);
}
