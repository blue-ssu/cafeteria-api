import type { CafeteriaType, MealQueryError, MealType, ParsedMealQuery } from "../types/meal.js";

const CAFETERIA_VALUES = ["haksik", "dodam", "faculty", "dormitory"] as const;
const MEAL_TYPE_VALUES = ["breakfast", "lunch", "dinner"] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateFormat(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;

  const match = date.match(DATE_REGEX);
  if (!match) return false;

  const [year, month, day] = date.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() + 1 === month &&
    dateObj.getUTCDate() === day
  );
}

function invalid(message: string): MealQueryError {
  return { error: "INVALID_QUERY", message };
}

function toCafeteriaType(value: string): CafeteriaType {
  return value as CafeteriaType;
}

function toMealType(value?: string): MealType | undefined {
  if (!value) return undefined;
  return value as MealType;
}

export function parseMealQuery(
  query: Record<string, string | undefined>
): ParsedMealQuery | MealQueryError {
  const cafeteria = query.cafeteria?.trim();
  if (!cafeteria) {
    return invalid("`cafeteria` is required. (haksik | dodam | faculty | dormitory)");
  }
  if (!CAFETERIA_VALUES.includes(cafeteria as (typeof CAFETERIA_VALUES)[number])) {
    return invalid("`cafeteria` must be one of haksik, dodam, faculty, dormitory.");
  }

  const mealType = query.mealType?.trim();
  if (mealType && !MEAL_TYPE_VALUES.includes(mealType as (typeof MEAL_TYPE_VALUES)[number])) {
    return invalid("`mealType` must be one of breakfast, lunch, dinner.");
  }

  const date = query.date?.trim();
  const startDate = query.startDate?.trim();
  const endDate = query.endDate?.trim();

  const hasSingleDate = Boolean(date);
  const hasRangeDate = Boolean(startDate || endDate);

  if (hasSingleDate && hasRangeDate) {
    return invalid("`date` and `startDate`/`endDate` cannot be used together.");
  }

  if (hasRangeDate) {
    if (!startDate || !endDate) {
      return invalid("`startDate` and `endDate` must both be provided together.");
    }
    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      return invalid("`startDate` and `endDate` must be in YYYY-MM-DD format.");
    }
    if (startDate > endDate) {
      return invalid("`startDate` must be earlier than or equal to `endDate`.");
    }

    return {
      cafeteria: toCafeteriaType(cafeteria),
      mealType: toMealType(mealType),
      mode: "range",
      startDate,
      endDate,
    };
  }

  if (date && !isValidDateFormat(date)) {
    return invalid("`date` must be in YYYY-MM-DD format.");
  }

  return {
    cafeteria: toCafeteriaType(cafeteria),
    mealType: toMealType(mealType),
    mode: "single",
    date,
  };
}
