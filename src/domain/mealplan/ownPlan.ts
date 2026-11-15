import type { DayPlan, PlanItem, PlanMeal, WeekPlan } from './types';

/**
 * A meal plan the person writes themselves. These are pure edits on a week of
 * meals. A meal here is a name and a list of foods with portions, nothing more.
 */

const newId = (() => {
  let counter = 0;
  return (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
})();

/** The meals a new plan starts with. */
export const STARTER_MEALS = ['Almusal', 'Tanghalian', 'Hapunan'] as const;

function blankMeal(label: string, dayIndex: number): PlanMeal {
  return { id: newId(`o${dayIndex}`), slot: 'meryenda', label, share: 0, items: [] };
}

export function emptyOwnWeek(): WeekPlan {
  const days: DayPlan[] = Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    seed: dayIndex,
    meals: STARTER_MEALS.map((label) => blankMeal(label, dayIndex)),
  }));
  return { days, builtFor: 'own', createdAt: new Date().toISOString() };
}

/** Gives every meal in a day a fresh id, so a copy can be edited without touching the original. */
function cloneDay(day: DayPlan, dayIndex: number): DayPlan {
  return {
    ...day,
    dayIndex,
    meals: day.meals.map((meal) => ({ ...meal, id: newId(`o${dayIndex}`), items: meal.items.map((item) => ({ ...item })) })),
  };
}

/** Starts from a suggested week, to edit it into the person's own. */
export function ownWeekFrom(week: WeekPlan): WeekPlan {
  return { days: week.days.map((day) => cloneDay(day, day.dayIndex)), builtFor: 'own', createdAt: new Date().toISOString() };
}

/** Puts one day's meals on every day of the week. */
export function copyDayToAll(week: WeekPlan, from: number): WeekPlan {
  const source = week.days.find((day) => day.dayIndex === from);
  if (!source) return week;
  return { ...week, days: week.days.map((day) => (day.dayIndex === from ? day : cloneDay(source, day.dayIndex))) };
}

export function addMeal(day: DayPlan, label: string): DayPlan {
  return { ...day, meals: [...day.meals, blankMeal(label.trim() || 'Meal', day.dayIndex)] };
}

export function renameMeal(day: DayPlan, mealId: string, label: string): DayPlan {
  const name = label.trim();
  if (!name) return day;
  return { ...day, meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, label: name } : meal)) };
}

export function removeMeal(day: DayPlan, mealId: string): DayPlan {
  return { ...day, meals: day.meals.filter((meal) => meal.id !== mealId) };
}

const edit = (day: DayPlan, mealId: string, change: (items: PlanItem[]) => PlanItem[]): DayPlan => ({
  ...day,
  meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, items: change(meal.items) } : meal)),
});

export function addItem(day: DayPlan, mealId: string, foodId: string, portions: number): DayPlan {
  return edit(day, mealId, (items) => [...items, { foodId, role: 'ulam', portions }]);
}

export function setItemPortions(day: DayPlan, mealId: string, index: number, portions: number): DayPlan {
  return edit(day, mealId, (items) => items.map((item, i) => (i === index ? { ...item, portions: Math.max(0.25, portions) } : item)));
}

export function removeItem(day: DayPlan, mealId: string, index: number): DayPlan {
  return edit(day, mealId, (items) => items.filter((_, i) => i !== index));
}
