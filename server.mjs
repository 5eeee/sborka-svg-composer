import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};
http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost");
      let rel = decodeURIComponent(u.pathname);
      if (rel === "/") rel = "/index.html";
      const p = path.resolve(root, "." + rel);
      if (!p.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end();
      }
      const data = await fs.readFile(p);
      res.writeHead(200, {
        "Content-Type": types[path.extname(p)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(8774, "127.0.0.1", () =>
    console.log("SVG Assembly: http://127.0.0.1:8774"),
  );
