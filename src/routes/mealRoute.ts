import type { Context } from "hono";
import type { Hono } from "hono";
import { parseMealQuery } from "../validators/mealQuery.js";
import { getMealsByQuery } from "../services/mealService.js";

export function registerMealRoutes(app: Hono): void {
  app.get("/api/meals", mealHandler);
}

async function mealHandler(c: Context) {
  const query = parseMealQuery(c.req.query());
  if ("error" in query) {
    return c.json(query, 400);
  }

  const meals = await getMealsByQuery(query);
  return c.json(meals);
}
