import type { Context } from "hono";
import type { Hono } from "hono";
import { mealWriteAuth } from "../middleware/mealAuth.js";
import { parseMealQuery } from "../validators/mealQuery.js";
import { parseMealScrapePayload } from "../validators/mealScrape.js";
import { parseMealCreatePayload, parseMealUpdatePayload } from "../validators/mealBody.js";
import {
  createMealEntry,
  deleteMealEntry,
  getMealById,
  scrapeMealsAndSave,
  getMealsByQuery,
  updateMealEntry,
} from "../services/mealService.js";

export function registerMealRoutes(app: Hono): void {
  app.get("/api/meals", mealHandler);
  app.get("/api/meals/:mealId", mealByIdHandler);
  app.post("/api/meals", mealWriteAuth, mealCreateHandler);
  app.patch("/api/meals/:mealId", mealWriteAuth, mealPatchHandler);
  app.delete("/api/meals/:mealId", mealWriteAuth, mealDeleteHandler);
  app.post("/api/scrape-meals", mealWriteAuth, mealScrapeHandler);
}

async function mealHandler(c: Context) {
  const query = parseMealQuery(c.req.query());
  if ("error" in query) {
    return c.json(query, 400);
  }

  const meals = await getMealsByQuery(query);
  return c.json(meals);
}

async function mealByIdHandler(c: Context) {
  const mealId = c.req.param("mealId")?.trim();
  if (!mealId) {
    return c.json(
      {
        error: "INVALID_QUERY",
        message: "`mealId` is required.",
      },
      400
    );
  }

  const meal = await getMealById(mealId);
  if (!meal) {
    return c.json({ error: "NOT_FOUND", message: "Meal not found." }, 404);
  }

  return c.json(meal);
}

async function mealCreateHandler(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "INVALID_QUERY",
        message: "Invalid JSON body.",
      },
      400
    );
  }

  const payload = parseMealCreatePayload(body);
  if ("error" in payload) {
    return c.json(payload, 400);
  }

  const meal = await createMealEntry(payload);
  return c.json(meal, 201);
}

async function mealPatchHandler(c: Context) {
  const mealId = c.req.param("mealId")?.trim();
  if (!mealId) {
    return c.json(
      {
        error: "INVALID_QUERY",
        message: "`mealId` is required.",
      },
      400
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "INVALID_QUERY",
        message: "Invalid JSON body.",
      },
      400
    );
  }

  const payload = parseMealUpdatePayload(body);
  if ("error" in payload) {
    return c.json(payload, 400);
  }

  const meal = await updateMealEntry(mealId, payload);
  if (!meal) {
    return c.json({ error: "NOT_FOUND", message: "Meal not found." }, 404);
  }

  return c.json(meal);
}

async function mealDeleteHandler(c: Context) {
  const mealId = c.req.param("mealId")?.trim();
  if (!mealId) {
    return c.json(
      {
        error: "INVALID_QUERY",
        message: "`mealId` is required.",
      },
      400
    );
  }

  const deleted = await deleteMealEntry(mealId);
  if (!deleted) {
    return c.json({ error: "NOT_FOUND", message: "Meal not found." }, 404);
  }

  return c.json({ success: true });
}

async function mealScrapeHandler(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "INVALID_QUERY",
        message: "Invalid JSON body.",
      },
      400
    );
  }

  const payload = parseMealScrapePayload(body);
  if ("error" in payload) {
    return c.json(payload, 400);
  }

  try {
    const result = await scrapeMealsAndSave(payload);
    return c.json(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to scrape and store meals.";
    return c.json(
      {
        error: "INVALID_QUERY",
        message,
      },
      500
    );
  }
}
