export type CafeteriaType = "haksik" | "dodam" | "faculty" | "dormitory";
export type MealType = "breakfast" | "lunch" | "dinner";

export type MealQuery = {
  cafeteria: CafeteriaType;
  mealType?: MealType;
  date?: string;
  startDate?: string;
  endDate?: string;
};

export type ParsedMealQuery = {
  cafeteria: CafeteriaType;
  mealType?: MealType;
  mode: "single" | "range";
  date?: string;
  startDate?: string;
  endDate?: string;
};

export type MealFilter = {
  cafeteriaType: CafeteriaType;
  mealType?: MealType;
  dateFrom: Date;
  dateTo: Date;
};

export type MealQueryError = {
  error: "INVALID_QUERY";
  message: string;
  details?: string[];
};

export type MealCreatePayload = {
  cafeteriaType: CafeteriaType;
  mealType: MealType;
  name: string;
  menu: string[];
  date: string;
};

export type MealScrapePayload = {
  cafeteria: CafeteriaType;
  date: string;
};

export type MealScrapeResult = {
  requested: MealScrapePayload;
  inserted: number;
  updated: number;
  skipped: number;
  errors?: string[];
};

export type MealUpdatePayload = {
  cafeteriaType?: CafeteriaType;
  mealType?: MealType;
  name?: string;
  menu?: string[];
  date?: string;
};

export type MealWriteAuthTokenPayload = {
  sub: number | string;
  iss: string;
  [key: string]: unknown;
};

export type UnauthorizedError = {
  error: "UNAUTHORIZED" | "INVALID_TOKEN";
  message: string;
};
