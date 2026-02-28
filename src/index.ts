import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { registerMealRoutes } from "./routes/mealRoute.js";
import { registerTableRoute } from "./routes/tableRoute.js";

const app = new Hono();
const manifestPath = path.resolve(process.cwd(), "public", "manifest.json");

app.use("/*", serveStatic({ root: "./public" }));

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

registerMealRoutes(app);
registerTableRoute(app);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
