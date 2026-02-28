import { prisma } from "../lib/prisma.js";
import type { MealCreatePayload, MealUpdatePayload } from "../types/meal.js";
import type { MealFilter } from "../types/meal.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateFromYmd(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function getMealDateBoundary(dateText: string): Date {
  return dateFromYmd(dateText);
}

export async function findMealByNaturalKey(payload: Pick<MealCreatePayload, "cafeteriaType" | "mealType" | "name" | "date">) {
  const dateFrom = getMealDateBoundary(payload.date);
  const dateTo = new Date(dateFrom.getTime() + DAY_MS);
  return prisma.meal.findFirst({
    where: {
      cafeteriaType: payload.cafeteriaType,
      mealType: payload.mealType,
      name: payload.name,
      date: {
        gte: dateFrom,
        lt: dateTo,
      },
    },
  });
}

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

export async function findMealById(mealId: string) {
  return prisma.meal.findUnique({
    where: {
      id: mealId,
    },
  });
}

export async function createMeal(payload: MealCreatePayload) {
  return prisma.meal.create({
    data: {
      cafeteriaType: payload.cafeteriaType,
      mealType: payload.mealType,
      name: payload.name,
      menu: payload.menu,
      date: dateFromYmd(payload.date),
    },
  });
}

export async function updateMeal(mealId: string, payload: MealUpdatePayload) {
  return prisma.meal.update({
    where: {
      id: mealId,
    },
    data: {
      ...(payload.cafeteriaType ? { cafeteriaType: payload.cafeteriaType } : {}),
      ...(payload.mealType ? { mealType: payload.mealType } : {}),
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.menu ? { menu: payload.menu } : {}),
      ...(payload.date
        ? {
            date: dateFromYmd(payload.date),
          }
        : {}),
    },
  });
}

export async function deleteMeal(mealId: string) {
  return prisma.meal.delete({
    where: {
      id: mealId,
    },
  });
}
