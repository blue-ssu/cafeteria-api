import { createMealClient, CafeteriaType as ScraperCafeteriaType } from "@bluessu/meal-scraper";
import type { CafeteriaType } from "../types/meal.js";
import type { MealScrapePayload } from "../types/meal.js";

const SCRAPER_CAFETERIA_MAP: Record<CafeteriaType, ScraperCafeteriaType> = {
  haksik: ScraperCafeteriaType.HAKSIK,
  dodam: ScraperCafeteriaType.DODAM,
  faculty: ScraperCafeteriaType.FACULTY,
  dormitory: ScraperCafeteriaType.DORMITORY,
};

type ParsedMealType = "breakfast" | "lunch" | "dinner";

export async function fetchDailyMenuFromScraper(
  payload: MealScrapePayload
): Promise<Array<{ cafeteria: CafeteriaType; mealType: ParsedMealType; name: string; menu: string[] }>> {
  const parser = payload.cafeteria === "dormitory" ? "noop" : "gpt";

  if (parser === "gpt" && !process.env.GPT_API_KEY) {
    throw new Error("GPT_API_KEY is required for gpt parser.");
  }

  const client = createMealClient({
    parser,
    gptApiKey: process.env.GPT_API_KEY,
  });

  const cafeteria = SCRAPER_CAFETERIA_MAP[payload.cafeteria];
  const menu = await client.getDailyMenu(cafeteria, payload.date);

  const flatten: Array<{
    cafeteria: CafeteriaType;
    mealType: "breakfast" | "lunch" | "dinner";
    name: string;
    menu: string[];
  }> = [];

  const sections: Array<"breakfast" | "lunch" | "dinner"> = [
    "breakfast",
    "lunch",
    "dinner",
  ];

  for (const mealType of sections) {
    const section = menu[mealType];
    if (!section || typeof section !== "object") continue;

    for (const [name, items] of Object.entries(section)) {
      if (!name.trim()) continue;

      if (!Array.isArray(items)) {
        continue;
      }

      const menuItems = items
        .map((entry) => String(entry).trim())
        .filter((entry) => entry.length > 0);
      if (menuItems.length === 0) continue;

      flatten.push({
        cafeteria: payload.cafeteria,
        mealType,
        name,
        menu: menuItems,
      });
    }
  }

  return flatten;
}
