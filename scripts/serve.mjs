import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.argv[2] || "dist");
const port = Number(process.argv[3] || 4173);
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(root + path.sep)) throw Error();
      const body = await readFile(file);
      res.setHeader(
        "Content-Type",
        { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".vtt": "text/vtt", ".mp4": "video/mp4" }[
          path.extname(file)
        ] || "application/octet-stream",
      );
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));
