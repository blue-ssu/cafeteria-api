import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { registerMealRoutes } from "./routes/mealRoute.js";
import { registerTableRoute } from "./routes/tableRoute.js";

const app = new Hono();

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
