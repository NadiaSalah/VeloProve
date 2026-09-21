import http from 'node:http';

const port = Number(process.env.PORT || process.env.VP_FIXTURE_PORT || 8791);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === '/api/items' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ items: [{ id: 1, name: 'alpha' }] }));
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`api-local listening on ${port}`);
});
