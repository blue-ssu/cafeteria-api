import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Hono } from "hono";

const TABLE_HTML_PATH = path.resolve(process.cwd(), "public", "table.html");
const TABLE_CSS_PATH = path.resolve(process.cwd(), "public", "table.css");
const TABLE_JS_PATH = path.resolve(process.cwd(), "public", "table.js");

async function serveAsset(pathname: string, contentType: string) {
  const content = await readFile(pathname);
  return new Response(content, {
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

export function registerTableRoute(app: Hono): void {
  app.get("/table", async (c) => {
    const content = await readFile(TABLE_HTML_PATH, "utf-8");
    return c.html(content);
  });

  app.get("/table.css", async () => {
    return serveAsset(TABLE_CSS_PATH, "text/css; charset=utf-8");
  });

  app.get("/table.js", async () => {
    return serveAsset(TABLE_JS_PATH, "application/javascript; charset=utf-8");
  });

  app.get("/favicon.ico", async () => {
    return new Response(null, { status: 204 });
  });
}
