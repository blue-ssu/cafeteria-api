import { getCache, makeMealCacheKey, setCache } from "../lib/cache.js";
import type { MealFilter, ParsedMealQuery } from "../types/meal.js";
import { findMealsByFilter } from "../repositories/mealRepository.js";
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
  return new Date(`${date}T00:00:00+09:00`);
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
