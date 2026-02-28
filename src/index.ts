import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import { registerMealRoutes } from "./routes/mealRoute.js";
import { registerTableRoute } from "./routes/tableRoute.js";

const app = new Hono();

app.use("/*", serveStatic({ root: "./public" }));

const port = Number(process.env.PORT) || 3000;

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

registerMealRoutes(app);
registerTableRoute(app);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
