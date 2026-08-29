import * as http from 'http';

export interface StatefulMockServerConfig {
  port?: number;
  initialData?: Record<string, any[]>;
  latencyMs?: number;
}

export interface MockRequestLog {
  id: string;
  method: string;
  url: string;
  status: number;
  timestamp: string;
}

export class StatefulMockServerService {
  private static activeServer: http.Server | null = null;
  private static activePort: number = 4040;
  private static stateStore: Map<string, any[]> = new Map();
  private static initialSeed: Record<string, any[]> = {};
  private static requestLogs: MockRequestLog[] = [];
  private static simulatedLatencyMs: number = 0;

  public static startServer(config: StatefulMockServerConfig = {}): Promise<{ port: number; status: string; collections: string[] }> {
    return new Promise((resolve, reject) => {
      if (this.activeServer) {
        this.stopServer();
      }

      this.activePort = config.port || 4040;
      this.simulatedLatencyMs = config.latencyMs || 0;
      this.initialSeed = config.initialData || {
        users: [
          { id: '1', name: 'Nadia Developer', email: 'nadia@example.com', role: 'admin' },
          { id: '2', name: 'Tariq Tester', email: 'tariq@example.com', role: 'qa' }
        ],
        products: [
          { id: 'p101', title: 'QAForge Enterprise License', price: 299, inStock: true },
          { id: 'p102', title: 'Local AI Test Agent', price: 99, inStock: true }
        ]
      };

      this.resetState();

      const server = http.createServer(async (req, res) => {
        if (this.simulatedLatencyMs > 0) {
          await new Promise(r => setTimeout(r, this.simulatedLatencyMs));
        }
        this.handleRequest(req, res);
      });

      server.listen(this.activePort, () => {
        this.activeServer = server;
        resolve({
          port: this.activePort,
          status: 'RUNNING',
          collections: Array.from(this.stateStore.keys())
        });
      });

      server.on('error', (err) => {
        reject(err);
      });
    });
  }

  public static stopServer(): { status: string } {
    if (this.activeServer) {
      this.activeServer.close();
      this.activeServer = null;
      return { status: 'STOPPED' };
    }
    return { status: 'NOT_RUNNING' };
  }

  public static resetState(): { collections: string[]; itemCount: number } {
    this.stateStore.clear();
    let totalItems = 0;
    for (const [col, items] of Object.entries(this.initialSeed)) {
      this.stateStore.set(col, JSON.parse(JSON.stringify(items)));
      totalItems += items.length;
    }
    this.requestLogs = [];
    return { collections: Array.from(this.stateStore.keys()), itemCount: totalItems };
  }

  public static getStatus(): { isRunning: boolean; port: number; collections: string[]; totalRequests: number } {
    return {
      isRunning: this.activeServer !== null,
      port: this.activePort,
      collections: Array.from(this.stateStore.keys()),
      totalRequests: this.requestLogs.length
    };
  }

  public static getLogs(limit: number = 50): MockRequestLog[] {
    return this.requestLogs.slice(-limit);
  }

  private static handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const rawUrl = req.url || '/';
    const parsedUrl = new URL(rawUrl, `http://localhost:${this.activePort}`);
    const pathname = parsedUrl.pathname;
    const method = (req.method || 'GET').toUpperCase();

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Special reset endpoint
    if (pathname === '/_mock/reset' && method === 'POST') {
      this.resetState();
      this.sendJson(res, 200, { success: true, message: 'Stateful mock reset to initial seed.' });
      this.logReq(method, rawUrl, 200);
      return;
    }

    // Special status endpoint
    if (pathname === '/_mock/status' && method === 'GET') {
      this.sendJson(res, 200, this.getStatus());
      this.logReq(method, rawUrl, 200);
      return;
    }

    // Parse resource path: /api/:collection or /:collection/:id
    const parts = pathname.replace(/^\/api\//, '/').replace(/^\//, '').split('/').filter(Boolean);

    if (parts.length === 0) {
      this.sendJson(res, 200, {
        message: 'QAForge Stateful Mock Server Ready',
        availableCollections: Array.from(this.stateStore.keys())
      });
      this.logReq(method, rawUrl, 200);
      return;
    }

    const collectionName = parts[0];
    const itemId = parts[1];

    if (!this.stateStore.has(collectionName)) {
      this.stateStore.set(collectionName, []);
    }
    const items = this.stateStore.get(collectionName)!;

    // Read body helper
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      let parsedBody: any = {};
      try {
        if (bodyData.trim()) parsedBody = JSON.parse(bodyData);
      } catch {
        parsedBody = { raw: bodyData };
      }

      // Route handling
      if (method === 'GET') {
        if (itemId) {
          const found = items.find(i => String(i.id) === String(itemId));
          if (found) {
            this.sendJson(res, 200, found);
            this.logReq(method, rawUrl, 200);
          } else {
            this.sendJson(res, 404, { error: 'Not Found', id: itemId });
            this.logReq(method, rawUrl, 404);
          }
        } else {
          // List with filter
          let result = [...items];
          parsedUrl.searchParams.forEach((val, key) => {
            result = result.filter(item => String(item[key]).toLowerCase() === val.toLowerCase());
          });
          this.sendJson(res, 200, result);
          this.logReq(method, rawUrl, 200);
        }
      } else if (method === 'POST') {
        const newItem = {
          id: parsedBody.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ...parsedBody,
          createdAt: new Date().toISOString()
        };
        items.push(newItem);
        this.sendJson(res, 201, newItem);
        this.logReq(method, rawUrl, 201);
      } else if (method === 'PUT' || method === 'PATCH') {
        if (!itemId) {
          this.sendJson(res, 400, { error: 'Missing item ID for update' });
          this.logReq(method, rawUrl, 400);
          return;
        }
        const idx = items.findIndex(i => String(i.id) === String(itemId));
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...parsedBody, id: itemId, updatedAt: new Date().toISOString() };
          this.sendJson(res, 200, items[idx]);
          this.logReq(method, rawUrl, 200);
        } else {
          this.sendJson(res, 404, { error: 'Item not found for update' });
          this.logReq(method, rawUrl, 404);
        }
      } else if (method === 'DELETE') {
        if (!itemId) {
          this.sendJson(res, 400, { error: 'Missing item ID for delete' });
          this.logReq(method, rawUrl, 400);
          return;
        }
        const initialLen = items.length;
        const filtered = items.filter(i => String(i.id) !== String(itemId));
        this.stateStore.set(collectionName, filtered);
        if (filtered.length < initialLen) {
          this.sendJson(res, 200, { success: true, deletedId: itemId });
          this.logReq(method, rawUrl, 200);
        } else {
          this.sendJson(res, 404, { error: 'Item not found for delete' });
          this.logReq(method, rawUrl, 404);
        }
      } else {
        this.sendJson(res, 405, { error: 'Method Not Allowed' });
        this.logReq(method, rawUrl, 405);
      }
    });
  }

  private static sendJson(res: http.ServerResponse, code: number, data: any): void {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  }

  private static logReq(method: string, url: string, status: number): void {
    this.requestLogs.push({
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      method,
      url,
      status,
      timestamp: new Date().toLocaleTimeString()
    });
  }
}
