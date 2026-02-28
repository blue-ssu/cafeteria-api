import { clearCacheByPrefix, getCache, makeMealCacheKey, setCache } from "../lib/cache.js";
import type {
  MealScrapePayload,
  MealScrapeResult,
  MealCreatePayload,
  MealFilter,
  MealUpdatePayload,
  ParsedMealQuery,
} from "../types/meal.js";
import { fetchDailyMenuFromScraper } from "./mealScraper.js";
import {
  createMeal,
  findMealByNaturalKey,
  deleteMeal,
  findMealById,
  findMealsByFilter,
  updateMeal,
} from "../repositories/mealRepository.js";
import type { Meal } from "../generated/prisma/client.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_TZ_OFFSET = "Asia/Seoul";
const ISO_DATE_IN_KST_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getKstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TZ_OFFSET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getKstDayBoundary(date: string): Date {
  if (!ISO_DATE_IN_KST_PATTERN.test(date)) {
    throw new Error("Invalid date format for internal conversion");
  }
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function buildFilter(query: ParsedMealQuery): MealFilter {
  const queryDate = query.date ?? getKstToday();
  if (query.mode === "single") {
    const dateFrom = getKstDayBoundary(queryDate);
    const dateTo = new Date(dateFrom.getTime() + DAY_MS);
    return {
      cafeteriaType: query.cafeteria,
      mealType: query.mealType,
      dateFrom,
      dateTo,
    };
  }

  if (!query.startDate || !query.endDate) {
    throw new Error("Invalid query state: missing startDate or endDate");
  }

  const dateFrom = getKstDayBoundary(query.startDate);
  const dateTo = new Date(getKstDayBoundary(query.endDate).getTime() + DAY_MS);
  return {
    cafeteriaType: query.cafeteria,
    mealType: query.mealType,
    dateFrom,
    dateTo,
  };
}

function buildCacheKeyFromQuery(query: ParsedMealQuery): string {
  const from = query.mode === "single" ? query.date ?? getKstToday() : query.startDate;
  const to = query.mode === "single" ? query.date ?? getKstToday() : query.endDate;
  if (!from || !to) {
    throw new Error("Invalid query state: cache key date range not found");
  }

  return makeMealCacheKey({
    cafeteria: query.cafeteria,
    mealType: query.mealType,
    rangeStart: from,
    rangeEnd: to,
  });
}

export async function getMealsByQuery(query: ParsedMealQuery): Promise<Meal[]> {
  const filter = buildFilter(query);
  const cacheKey = buildCacheKeyFromQuery(query);
  const cached = getCache<Meal[]>(cacheKey);
  if (cached && Array.isArray(cached)) {
    return cached;
  }

  const meals = await findMealsByFilter(filter);
  setCache(cacheKey, meals, CACHE_TTL_MS);
  return meals;
}

export async function getMealById(mealId: string): Promise<Meal | null> {
  return findMealById(mealId);
}

export async function createMealEntry(payload: MealCreatePayload): Promise<Meal> {
  const existed = await findMealByNaturalKey(payload);
  if (existed) {
    const updated = await updateMeal(existed.id, {
      cafeteriaType: payload.cafeteriaType,
      mealType: payload.mealType,
      name: payload.name,
      menu: payload.menu,
      date: payload.date,
    });
    clearCacheByPrefix("query");
    return updated;
  }

  const created = await createMeal(payload);
  clearCacheByPrefix("query");
  return created;
}

export async function scrapeMealsAndSave(payload: MealScrapePayload): Promise<MealScrapeResult> {
  const scraped = await fetchDailyMenuFromScraper(payload);

  const result: MealScrapeResult = {
    requested: {
      cafeteria: payload.cafeteria,
      date: payload.date,
    },
    inserted: 0,
    updated: 0,
    skipped: 0,
  };
  const errors: string[] = [];

  for (const item of scraped) {
    const { mealType, name, menu } = item;
    const mealPayload: MealCreatePayload = {
      cafeteriaType: item.cafeteria,
      mealType,
      name: name.trim(),
      menu,
      date: payload.date,
    };

    if (!mealPayload.name || mealPayload.menu.length === 0) {
      result.skipped += 1;
      continue;
    }

    try {
      const existed = await findMealByNaturalKey(mealPayload);
      if (existed) {
        await updateMeal(existed.id, {
          cafeteriaType: mealPayload.cafeteriaType,
          mealType: mealPayload.mealType,
          name: mealPayload.name,
          menu: mealPayload.menu,
          date: mealPayload.date,
        });
        result.updated += 1;
      } else {
        await createMeal(mealPayload);
        result.inserted += 1;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save scraped meal.";
      errors.push(`${mealPayload.name} (${mealPayload.mealType}): ${message}`);
      result.skipped += 1;
    }
  }

  clearCacheByPrefix("query");
  if (errors.length > 0) {
    result.errors = errors;
  }
  return result;
}

export async function updateMealEntry(
  mealId: string,
  payload: MealUpdatePayload
): Promise<Meal | null> {
  try {
    const updated = await updateMeal(mealId, payload);
    clearCacheByPrefix("query");
    return updated;
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2025") return null;
    throw error;
  }
}

export async function deleteMealEntry(mealId: string): Promise<boolean> {
  try {
    await deleteMeal(mealId);
    clearCacheByPrefix("query");
    return true;
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2025") {
      return false;
    }
    throw error;
  }
}
