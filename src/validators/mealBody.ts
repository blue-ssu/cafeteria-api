import { z } from "zod";

import type { MealCreatePayload, MealUpdatePayload } from "../types/meal.js";

const CAFETERIA_VALUES = ["haksik", "dodam", "faculty", "dormitory"] as const;
const MEAL_TYPE_VALUES = ["breakfast", "lunch", "dinner"] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const cafeteriaTypeSchema = z.enum(CAFETERIA_VALUES);
const mealTypeSchema = z.enum(MEAL_TYPE_VALUES);

const dateSchema = z
  .string()
  .trim()
  .regex(DATE_REGEX, "date must be in YYYY-MM-DD format.")
  .superRefine((date, ctx) => {
    const parsed = new Date(`${date}T00:00:00+09:00`);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "date must be a valid calendar date.",
      });
    }
  });

const createMealSchema = z.object({
  cafeteriaType: cafeteriaTypeSchema,
  mealType: mealTypeSchema,
  name: z.string().trim().min(1, "name is required."),
  menu: z
    .array(
      z.string().trim().min(1, "menu item is required.")
    )
    .min(1, "menu must contain at least one item."),
  date: dateSchema,
});

const updateMealSchema = z
  .object({
    cafeteriaType: cafeteriaTypeSchema.optional(),
    mealType: mealTypeSchema.optional(),
    name: z.string().trim().min(1, "name is required.").optional(),
    menu: z
      .array(
        z.string().trim().min(1, "menu item is required.")
      )
      .min(1, "menu must contain at least one item.")
      .optional(),
    date: dateSchema.optional(),
  })
  .refine(
    (value) =>
      value.cafeteriaType !== undefined ||
      value.mealType !== undefined ||
      value.name !== undefined ||
      value.menu !== undefined ||
      value.date !== undefined,
    {
      message: "At least one field must be provided.",
      path: ["body"],
    }
  );

function mapZodErrors(
  issues: Array<{
    path: Array<string | number | symbol>;
    message: string;
  }>
): string[] {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.map(String).join(".") : "body";
    return `${path}: ${issue.message}`;
  });
}

export type MealPayloadValidationError = {
  error: "INVALID_QUERY";
  message: string;
  details?: string[];
};

export function parseMealCreatePayload(
  body: unknown
): MealCreatePayload | MealPayloadValidationError {
  const parsed = createMealSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: "INVALID_QUERY",
      message: "Invalid payload.",
      details: mapZodErrors(parsed.error.issues),
    };
  }

  return parsed.data;
}

export function parseMealUpdatePayload(
  body: unknown
): MealUpdatePayload | MealPayloadValidationError {
  const parsed = updateMealSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: "INVALID_QUERY",
      message: "Invalid payload.",
      details: mapZodErrors(parsed.error.issues),
    };
  }

  return parsed.data;
}
