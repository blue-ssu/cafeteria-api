import { prisma } from "../lib/prisma.js";
import type { MealFilter } from "../types/meal.js";

export async function findMealsByFilter(filter: MealFilter) {
  return prisma.meal.findMany({
    where: {
      cafeteriaType: filter.cafeteriaType,
      ...(filter.mealType ? { mealType: filter.mealType } : {}),
      date: {
        gte: filter.dateFrom,
        lt: filter.dateTo,
      },
    },
    orderBy: {
      date: "asc",
    },
  });
}
