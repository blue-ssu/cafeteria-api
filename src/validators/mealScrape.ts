import { z } from "zod";

import type { MealScrapePayload } from "../types/meal.js";

const CAFETERIA_VALUES = ["haksik", "dodam", "faculty", "dormitory"] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const mealScrapePayloadSchema = z.object({
  cafeteria: z.enum(CAFETERIA_VALUES),
  date: z
    .string()
    .trim()
    .regex(DATE_REGEX, "date must be in YYYY-MM-DD format.")
    .superRefine((date, ctx) => {
      const [year, month, day] = date.split("-").map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      if (
        dateObj.getUTCFullYear() !== year ||
        dateObj.getUTCMonth() + 1 !== month ||
        dateObj.getUTCDate() !== day
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: "date must be a valid calendar date.",
        });
      }
    }),
});

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

export type MealScrapePayloadError = {
  error: "INVALID_QUERY";
  message: string;
  details?: string[];
};

export function parseMealScrapePayload(
  body: unknown
): MealScrapePayload | MealScrapePayloadError {
  const parsed = mealScrapePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: "INVALID_QUERY",
      message: "Invalid payload.",
      details: mapZodErrors(parsed.error.issues),
    };
  }

  return parsed.data;
}
