import { CafeteriaType, createMealClient } from "@bluessu/meal-scraper";
import "dotenv/config";

async function main() {
  const client = createMealClient({
    parser: "gpt", // DORMITORY 의 경우 noop 사용
    gptApiKey: process.env.GPT_API_KEY,
  });
  const menu = await client.getDailyMenu(CafeteriaType.DODAM, "2024-06-01");
  console.log(menu); // type: DailyMenu

  // {
  //   date: '2024-06-01',
  //   cafeteria: 'DODAM',
  //   status: 'open',
  //   breakfast: {},
  //   lunch: { '중식1': [ '반계탕', '도토리묵 양념장', '아삭오이무침', '찰흑미밥', '깍두기', '파인애플' ] },
  //   dinner: {}
  // }
}

main().catch(console.error);
