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
};
