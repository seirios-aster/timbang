import { describe, expect, it } from 'vitest';
import { getFood } from './catalog';
import { compareFood, readPer100g, type UsdaNutrient } from './verify';

/**
 * Part one runs always: the comparison logic, using the record USDA returned for cooked white rice.
 * Part two checks the whole catalog against USDA, and only runs when an API key is given:
 *
 *   FDC_API_KEY=your-key npm run verify:foods
 *
 * A free key comes from https://fdc.nal.usda.gov/api-key-signup. It prints foods whose numbers differ
 * from USDA's by more than the tolerance, for a person to review. It changes nothing.
 */

// From FoodData Central, SR Legacy 168878: Rice, white, long-grain, regular, enriched, cooked.
const RICE: UsdaNutrient[] = [
  { number: '208', value: 130, unit: 'KCAL' },
  { number: '268', value: 544, unit: 'kJ' },
  { number: '203', value: 2.69, unit: 'G' },
  { number: '204', value: 0.28, unit: 'G' },
  { number: '205', value: 28.2, unit: 'G' },
];

describe('comparing a catalog food with USDA', () => {
  it('reads calories and macros per 100 g, ignoring kilojoules', () => {
    expect(readPer100g(RICE)).toEqual({ kcal: 130, protein: 2.69, carbs: 28.2, fat: 0.28 });
  });

  it('also reads the field names the search endpoint uses', () => {
    expect(readPer100g([{ nutrientNumber: '203', value: 10 }, { nutrientNumber: '208', amount: 90 }]).protein).toBe(10);
  });

  it('finds the catalog rice within tolerance of USDA', () => {
    const results = compareFood(getFood('kanin'), readPer100g(RICE));
    expect(results.every((result) => result.ok)).toBe(true);
    expect(results.find((result) => result.nutrient === 'carbs')!.usda).toBeCloseTo(45.1, 1);
  });

  it('flags a food that is far from the record', () => {
    const results = compareFood(getFood('kanin'), { kcal: 130, protein: 2.69, carbs: 15, fat: 0.28 });
    expect(results.find((result) => result.nutrient === 'carbs')!.ok).toBe(false);
  });

  it('tags rice as checked and the dishes as estimates', () => {
    expect(getFood('kanin').source).toBe('usda');
    expect(getFood('chicken-adobo').source).toBe('estimate');
  });
});

/** Catalog food to the USDA SR Legacy description it most closely matches. */
const MATCHES: Record<string, string> = {
  kanin: 'Rice, white, long-grain, regular, enriched, cooked',
  'brown-rice': 'Rice, brown, long-grain, cooked',
  oatmeal: 'Cereals, oats, regular and quick, not fortified, dry',
  kamote: 'Sweet potato, cooked, boiled, without skin',
  tasty: 'Bread, white, commercially prepared',
  'pritong-itlog': 'Egg, whole, cooked, fried',
  'nilagang-itlog': 'Egg, whole, cooked, hard-boiled',
  'inihaw-na-pecho': 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
  'lechon-manok': 'Chicken, broilers or fryers, meat and skin, cooked, roasted',
  'tuna-flakes': 'Fish, tuna, light, canned in water, drained solids',
  'inihaw-na-tilapia': 'Fish, tilapia, cooked, dry heat',
  saging: 'Bananas, raw',
  papaya: 'Papayas, raw',
  mangga: 'Mangos, raw',
  'peanut-butter': 'Peanut butter, smooth style, with salt',
  gatas: 'Milk, whole, 3.25% milkfat, without added vitamin A and vitamin D',
  'greek-yogurt': 'Yogurt, Greek, plain, nonfat',
  'pritong-tokwa': 'Tofu, raw, firm, prepared with calcium sulfate',
  'ginisang-monggo': 'Mung beans, mature seeds, cooked, boiled, without salt',
  'nilagang-mani': 'Peanuts, all types, boiled, with salt',
  'corned-beef': 'Beef, cured, corned beef, canned',
  sardinas: 'Fish, sardine, Pacific, canned in tomato sauce, drained solids with bone',
};

const KEY = process.env.FDC_API_KEY;

describe.skipIf(!KEY)('catalog against USDA FoodData Central (live)', () => {
  it('lists foods that differ from USDA by more than the tolerance', { timeout: 120_000 }, async () => {
    const review: string[] = [];
    for (const [id, description] of Object.entries(MATCHES)) {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(description)}&dataType=${encodeURIComponent('SR Legacy')}&pageSize=1&api_key=${KEY}`;
      const response = await fetch(url);
      const body = (await response.json()) as { foods?: { description: string; fdcId: number; foodNutrients: UsdaNutrient[] }[] };
      const hit = body.foods?.[0];
      if (!hit) {
        review.push(`${id}: no USDA match for "${description}"`);
        continue;
      }
      const off = compareFood(getFood(id), readPer100g(hit.foodNutrients)).filter((result) => !result.ok);
      if (off.length > 0) {
        const detail = off.map((r) => `${r.nutrient} ${r.catalog.toFixed(1)} vs ${r.usda.toFixed(1)}`).join(', ');
        review.push(`${id} (USDA ${hit.fdcId}, "${hit.description}"): ${detail}`);
      }
    }
    console.log(review.length === 0 ? 'Every matched food is within tolerance.' : `Review these:\n${review.join('\n')}`);
    expect(true).toBe(true);
  });
});
