import http from 'node:http';

export interface MockRecord {
  id: string | number;
  [key: string]: unknown;
}

export interface SandboxEnvironment {
  port: number;
  baseURL: string;
  tables: Record<string, MockRecord[]>;
  close: () => void;
}

export class MockSandboxService {
  public static async createSandbox(port = 8089): Promise<SandboxEnvironment> {
    const tables: Record<string, MockRecord[]> = {
      users: [
        { id: 1, name: 'Alice Test', email: 'alice@example.com', role: 'admin' },
        { id: 2, name: 'Bob QA', email: 'bob@example.com', role: 'user' }
      ],
      orders: [
        { id: 'ord_101', userId: 1, total: 99.5, status: 'completed' }
      ],
      products: [
        { id: 'prod_1', name: 'Standard Widget', price: 19.99, stock: 50 }
      ]
    };

    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';
        res.setHeader('Content-Type', 'application/json');

        // Extract entity collection name e.g. /api/users or /users
        const cleanPath = url.split('?')[0].replace(/^\/api/, '').replace(/^\//, '');
        const parts = cleanPath.split('/');
        const collection = parts[0];
        const id = parts[1];

        if (tables[collection]) {
          if (method === 'GET') {
            if (id) {
              const item = tables[collection].find(r => String(r.id) === String(id));
              if (item) {
                res.writeHead(200);
                res.end(JSON.stringify(item));
              } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Record not found' }));
              }
            } else {
              res.writeHead(200);
              res.end(JSON.stringify(tables[collection]));
            }
            return;
          }

          if (method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const newRecord = { id: Date.now(), ...parsed };
                tables[collection].push(newRecord);
                res.writeHead(201);
                res.end(JSON.stringify(newRecord));
              } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              }
            });
            return;
          }

          if (method === 'DELETE' && id) {
            tables[collection] = tables[collection].filter(r => String(r.id) !== String(id));
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, deletedId: id }));
            return;
          }
        }

        // Default mock response
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'VeloProve Mock Sandbox Active', endpoint: url }));
      });

      server.listen(port, () => {
        resolve({
          port,
          baseURL: `http://localhost:${port}`,
          tables,
          close: () => server.close()
        });
      });
    });
  }
}
