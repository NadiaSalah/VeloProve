import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../../execution/workspace-guard.js';
import type { ProjectProfile } from '../../shared/types/project.js';
import type { DiscoveredRequirement } from '../../shared/types/requirements.js';
import { DynamicVariableStore } from './dynamic-variables.js';

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

export interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: Array<{ key: string; value: string; disabled?: boolean }>;
}

export interface PostmanRequestBody {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file';
  raw?: string;
  options?: {
    raw?: {
      language?: 'json' | 'text' | 'javascript' | 'html' | 'xml';
    };
  };
}

export interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  url: string | PostmanUrl;
  body?: PostmanRequestBody;
  description?: string;
}

export interface PostmanEventScript {
  type: string;
  exec: string[];
}

export interface PostmanEvent {
  listen: 'prerequest' | 'test';
  script: PostmanEventScript;
}

export interface PostmanItem {
  id?: string;
  name: string;
  request?: PostmanRequest;
  response?: any[];
  item?: PostmanItem[];
  event?: PostmanEvent[];
}

export interface PostmanCollection {
  info: {
    name: string;
    _postman_id?: string;
    description?: string;
    schema: string;
    version?: string;
  };
  item: PostmanItem[];
  variable?: Array<{ key: string; value: string; type?: string }>;
}

export interface PostmanEnvironment {
  name: string;
  values: Array<{ key: string; value: string; enabled?: boolean }>;
}

export interface PostmanStepResult {
  stepId: string;
  name: string;
  method: string;
  url: string;
  status: 'passed' | 'failed';
  httpStatus: number;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseHeaders: Record<string, string>;
  responseBody?: unknown;
  errorMessage?: string;
  assertions: Array<{ name: string; passed: boolean; error?: string }>;
}

export interface PostmanRunResult {
  collectionName: string;
  totalRequests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  steps: PostmanStepResult[];
  environment: Record<string, unknown>;
}

export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpResponseResult {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: unknown;
  rawText: string;
  sizeBytes: number;
}

export class PostmanRunnerService {
  /**
   * Parse Postman Collection v2.1/v2.0 from file or string
   */
  public static loadCollection(guard: WorkspaceGuard, filePathOrJson: string): PostmanCollection {
    let content: string;
    try {
      const resolved = guard.resolveSafePath(filePathOrJson);
      if (fs.existsSync(resolved)) {
        content = fs.readFileSync(resolved, 'utf8');
      } else {
        content = filePathOrJson;
      }
    } catch {
      content = filePathOrJson;
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.item || !Array.isArray(parsed.item)) {
        throw new Error('Invalid Postman Collection: missing "item" array.');
      }
      return parsed as PostmanCollection;
    } catch (err: any) {
      throw new Error(`Failed to parse Postman Collection: ${err.message}`);
    }
  }

  /**
   * Parse Postman Environment file
   */
  public static loadEnvironment(guard: WorkspaceGuard, filePathOrJson?: string): Record<string, string> {
    if (!filePathOrJson) return {};
    let content: string;
    try {
      const resolved = guard.resolveSafePath(filePathOrJson);
      if (fs.existsSync(resolved)) {
        content = fs.readFileSync(resolved, 'utf8');
      } else {
        content = filePathOrJson;
      }
    } catch {
      content = filePathOrJson;
    }

    try {
      const parsed = JSON.parse(content) as PostmanEnvironment;
      const envMap: Record<string, string> = {};
      if (Array.isArray(parsed.values)) {
        for (const item of parsed.values) {
          if (item.enabled !== false && item.key) {
            envMap[item.key] = item.value;
          }
        }
      }
      return envMap;
    } catch {
      return {};
    }
  }


  /**
   * Flatten nested folder items from collection
   */
  public static flattenItems(items: PostmanItem[], folderPrefix = ''): Array<{ name: string; request: PostmanRequest; events?: PostmanEvent[] }> {
    const flat: Array<{ name: string; request: PostmanRequest; events?: PostmanEvent[] }> = [];

    for (const item of items) {
      const itemTitle = folderPrefix ? `${folderPrefix} / ${item.name}` : item.name;
      if (item.request) {
        flat.push({
          name: itemTitle,
          request: item.request,
          events: item.event
        });
      }
      if (item.item && Array.isArray(item.item)) {
        flat.push(...this.flattenItems(item.item, itemTitle));
      }
    }

    return flat;
  }

  /**
   * Execute single HTTP request with latency and size tracking
   */
  public static async sendRequest(options: HttpRequestOptions): Promise<HttpResponseResult> {
    const startTime = Date.now();
    let urlStr = options.url;

    // Append query params if specified
    if (options.params && Object.keys(options.params).length > 0) {
      const urlObj = new URL(urlStr.startsWith('http') ? urlStr : `http://localhost:3000${urlStr.startsWith('/') ? '' : '/'}${urlStr}`);
      for (const [k, v] of Object.entries(options.params)) {
        urlObj.searchParams.set(k, v);
      }
      urlStr = urlObj.toString();
    }

    const headers: Record<string, string> = {
      ...(options.headers || {})
    };

    let bodyPayload: string | undefined;
    if (options.body && options.method !== 'GET' && options.method !== 'HEAD') {
      if (typeof options.body === 'string') {
        bodyPayload = options.body;
      } else {
        bodyPayload = JSON.stringify(options.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

      const response = await fetch(urlStr, {
        method: options.method,
        headers,
        body: bodyPayload,
        signal: controller.signal
      });

      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;

      const resHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      const contentType = response.headers.get('content-type') || '';
      let parsedBody: unknown = null;
      let rawText = '';

      if (contentType.includes('application/json')) {
        try {
          parsedBody = await response.json();
          rawText = JSON.stringify(parsedBody, null, 2);
        } catch {
          rawText = await response.text();
          parsedBody = rawText;
        }
      } else {
        rawText = await response.text();
        parsedBody = rawText;
      }

      const sizeBytes = Buffer.byteLength(rawText, 'utf8');

      return {
        status: response.status,
        statusText: response.statusText,
        durationMs,
        headers: resHeaders,
        body: parsedBody,
        rawText,
        sizeBytes
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return {
        status: 0,
        statusText: err.name === 'AbortError' ? 'Timeout' : 'Network Error',
        durationMs,
        headers: {},
        body: null,
        rawText: err.message || 'Network request failed',
        sizeBytes: 0
      };
    }
  }

  /**
   * Run entire Postman Collection sequentially with dynamic variables and assertion checks
   */
  public static async runCollection(
    collection: PostmanCollection,
    options: {
      initialEnv?: Record<string, string>;
      baseURL?: string;
    } = {}
  ): Promise<PostmanRunResult> {
    const startTime = Date.now();
    const store = new DynamicVariableStore();

    // 1. Seed collection level variables
    if (collection.variable) {
      for (const v of collection.variable) {
        if (v.key) store.set(v.key, v.value);
      }
    }

    // 2. Seed environment variables
    if (options.initialEnv) {
      for (const [k, v] of Object.entries(options.initialEnv)) {
        store.set(k, v);
      }
    }

    // 3. Set baseURL default if provided
    if (options.baseURL) {
      store.set('baseUrl', options.baseURL);
      store.set('baseURL', options.baseURL);
    }

    const flatRequests = this.flattenItems(collection.item);
    const steps: PostmanStepResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < flatRequests.length; i++) {
      const reqItem = flatRequests[i];
      const req = reqItem.request;

      // URL normalization
      let rawUrl = typeof req.url === 'string' ? req.url : req.url.raw || '';
      let interpolatedUrl = store.interpolate(rawUrl);

      // If relative URL without host, prepend baseURL
      if (interpolatedUrl.startsWith('/') && options.baseURL) {
        interpolatedUrl = `${options.baseURL.replace(/\/$/, '')}${interpolatedUrl}`;
      }

      // Headers normalization
      const headers: Record<string, string> = {};
      if (req.header) {
        for (const h of req.header) {
          if (h.disabled !== true && h.key) {
            headers[h.key] = store.interpolate(h.value);
          }
        }
      }

      // Body normalization
      let bodyData: any = undefined;
      if (req.body && req.body.raw) {
        const interpolatedBody = store.interpolate(req.body.raw);
        try {
          bodyData = JSON.parse(interpolatedBody);
        } catch {
          bodyData = interpolatedBody;
        }
      }

      const method = (req.method || 'GET').toUpperCase() as HttpRequestOptions['method'];

      const response = await this.sendRequest({
        method,
        url: interpolatedUrl,
        headers,
        body: bodyData
      });

      const assertions: Array<{ name: string; passed: boolean; error?: string }> = [];

      // Check default HTTP status < 400 assertion
      const statusPassed = response.status >= 200 && response.status < 400;
      assertions.push({
        name: `Status code is successful (${response.status})`,
        passed: statusPassed,
        error: statusPassed ? undefined : `Received status ${response.status} ${response.statusText}`
      });

      // Auto-extract common JWT tokens or IDs into variable store
      if (response.body && typeof response.body === 'object') {
        const json = response.body as any;
        if (json.token) store.set('token', json.token);
        if (json.accessToken) store.set('accessToken', json.accessToken);
        if (json.authToken) store.set('authToken', json.authToken);
        if (json.id) store.set('lastId', json.id);
        if (json.data?.id) store.set('lastId', json.data.id);
      }

      const stepPassed = assertions.every(a => a.passed);
      if (stepPassed) {
        passedCount++;
      } else {
        failedCount++;
      }

      steps.push({
        stepId: `step-${i + 1}`,
        name: reqItem.name,
        method,
        url: interpolatedUrl,
        status: stepPassed ? 'passed' : 'failed',
        httpStatus: response.status,
        durationMs: response.durationMs,
        requestHeaders: headers,
        requestBody: bodyData,
        responseHeaders: response.headers,
        responseBody: response.body,
        errorMessage: stepPassed ? undefined : assertions.find(a => !a.passed)?.error,
        assertions
      });
    }

    return {
      collectionName: collection.info.name || 'VeloProve API Collection',
      totalRequests: flatRequests.length,
      passedCount,
      failedCount,
      totalDurationMs: Date.now() - startTime,
      steps,
      environment: store.getAll()
    };
  }

  /**
   * Export discovered routes and API endpoints to standard Postman Collection v2.1
   */
  public static exportToPostman(
    profile: ProjectProfile,
    requirements: DiscoveredRequirement[] = [],
    collectionName?: string
  ): PostmanCollection {
    const name = collectionName || `${profile.projectName || 'VeloProve'} API Collection`;

    const items: PostmanItem[] = [];

    // Group endpoints by route prefix or resource
    const endpointGroups: Record<string, typeof profile.apiEndpoints> = {};

    for (const ep of profile.apiEndpoints) {
      const parts = ep.path.split('/').filter(Boolean);
      const groupName = parts[1] ? parts[1].toUpperCase() : parts[0] ? parts[0].toUpperCase() : 'GENERAL';
      if (!endpointGroups[groupName]) {
        endpointGroups[groupName] = [];
      }
      endpointGroups[groupName].push(ep);
    }

    for (const [groupName, endpoints] of Object.entries(endpointGroups)) {
      const folderItems: PostmanItem[] = endpoints.map((ep, idx) => {
        const matchingReq = requirements.find(r => r.relatedEndpoints?.includes(ep.path));
        const postmanUrl: PostmanUrl = {
          raw: `{{baseUrl}}${ep.path.startsWith('/') ? '' : '/'}${ep.path}`,
          host: ['{{baseUrl}}'],
          path: ep.path.split('/').filter(Boolean)
        };

        const headers: PostmanHeader[] = [
          { key: 'Content-Type', value: 'application/json' }
        ];

        if (ep.authRequired) {
          headers.push({ key: 'Authorization', value: 'Bearer {{authToken}}', description: 'Auto-Injected Auth Token' });
        }

        let body: PostmanRequestBody | undefined;
        if (['POST', 'PUT', 'PATCH'].includes(ep.method.toUpperCase())) {
          body = {
            mode: 'raw',
            raw: JSON.stringify({ name: 'Sample Payload', value: 100 }, null, 2),
            options: {
              raw: { language: 'json' }
            }
          };
        }

        return {
          id: `req-${groupName.toLowerCase()}-${idx + 1}`,
          name: `${ep.method.toUpperCase()} ${ep.path}${matchingReq ? ` (${matchingReq.title})` : ''}`,
          request: {
            method: ep.method.toUpperCase(),
            header: headers,
            url: postmanUrl,
            body,
            description: matchingReq ? matchingReq.description : `Endpoint mapped from ${ep.sourceFile || 'source'}`
          }
        };
      });

      items.push({
        name: groupName,
        item: folderItems
      });
    }

    return {
      info: {
        name,
        _postman_id: `veloprove-col-${Date.now()}`,
        description: `Generated autonomously by VeloProve for ${profile.projectName}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        version: '1.0.0'
      },
      item: items,
      variable: [
        { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' },
        { key: 'authToken', value: '', type: 'string' }
      ]
    };
  }
}
