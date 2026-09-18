import http from "node:http";

const port = Number(process.env.VP_FIXTURE_PORT || process.env.PORT || 3456);

const server = http.createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, port }));
    return;
  }
  if (req.url === "/api/login" && req.method === "POST") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ token: "demo" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<html><body><h1>Smoke App</h1><form method=\"post\" action=\"/api/login\"><input name=\"user\"/><button>Login</button></form></body></html>");
});

server.listen(port, "127.0.0.1", () => console.log(`smoke app on :${port}`));
