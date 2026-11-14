# Timbang

Calorie targets, Filipino meal plans, guided training and weight tracking for lifters.
"Timbang" is a working name. Change it in `src/config/brand.ts`.

## Run it

```bash
npm install
npm run dev        # local development
npm test           # unit tests for the calculation and planning logic
npm run build      # type-check and build to dist/
npm run preview    # serve the built app
```

## What is in it

| Screen | What it does |
|---|---|
| Today | Home. Today's workout, meals and weigh-in in one place. |
| Target | Calorie and macro targets for losing fat, maintaining, or building muscle. Optional fine-tuning for pace, protein and body fat. |
| Meals | A seven-day plan built from Filipino foods to hit the targets. Each food shows portion, weight, calories and macros. Any food can be swapped or resized. On the day itself, meals are marked eaten or skipped and off-plan food can be added, with the day tracked against the target. After a skip or a snack, the meals still to come can be re-portioned for that day only. |
| Training | A weekly split chosen from the number of lifting days, with exercises for a gym, dumbbells or no equipment. Each lift shows sets, reps, rest and a suggested weight that moves up or down from what was logged, with a moving stick figure and a video link for people who do not know the exercise. Any lift can be changed for a suggested alternative or anything else in the catalog. A guided session walks through the workout set by set with a rest timer, and can be paused, reordered or finished early. Weights show in kg or lb, with the matching bar and plates. |
| Progress | Weigh-in log, a smoothed trend line, and a check of actual pace against the plan. A Lifts view shows total weight lifted and, per lift, the heaviest set, an estimated one-rep max, what that means for other rep counts, a chart and the full history. New records are called out when a session is saved. |

There are light and dark themes, and the app can be added to a phone's home screen.

Everything is saved in the browser on the device. There are no accounts and no server yet.

## How the code is organized

```
src/
  domain/        Pure logic. No React, no browser APIs. Fully unit-tested.
    nutrition/   BMR, maintenance calories, calorie and macro targets
    foods/       Food types and the catalog (one file per food group)
    mealplan/    Meal templates, the plan generator, portion fitting, swaps, and
                 tracking of what was eaten
    training/    Exercise catalog, splits, program builder, weight guidance, kg and lb
                 unit systems, and the guided-session rules
    progress/    Trend smoothing and pace checks
  state/         Saved app state (profile, plan, meal log, training, weigh-ins, theme)
                 and its storage
  features/      One folder per screen: onboarding, today, target, meals, training, progress
  ui/            Shared building blocks: Button, Dial, Barbell, Sheet, ...
  app/           App frame, tab navigation, routing
  styles/        Design tokens (colors, type, spacing) and global styles
  lib/           Formatting and date helpers
  config/        Brand name
```

The rule that keeps this maintainable: dependencies point one way.
`features` use `state`, `ui` and `domain`. `domain` uses nothing else. A change to how
calories are computed never touches a screen, and a redesign never touches the math.

## Common changes

- **Add a food:** add an entry to the matching file in `src/domain/foods/catalog/`.
  Calories are computed from the macros, so only protein, carbs and fat are entered.
- **Change a formula or default:** `src/domain/nutrition/`. The constants at the top of
  `targets.ts` hold the deficit and surplus sizes and protein per kg.
- **Change how meals are composed:** `src/domain/mealplan/templates.ts`.
- **Add an exercise:** add an entry to `src/domain/training/exercises.ts` with the movement
  pattern it trains. It then shows up as a swap option automatically.
- **Change a split or workout:** `src/domain/training/splits.ts`.
- **Add a stick-figure demo:** add two poses to `src/features/training/figures.ts` and map
  the exercise id to it at the bottom of that file.
- **Change colors or type, or add a theme:** `src/styles/tokens.css`. A theme is one block of
  color tokens, listed in `src/state/themeStore.ts`.
- **Add accounts and sync:** replace the storage in `src/state/storage.ts`. The stores
  do not need to change.

## Before launch

- **Verify the nutrition data.** Values in the catalog are working estimates. Check them
  against the DOST-FNRI Philippine Food Composition Tables and confirm its terms of use.
- **Review the training defaults.** Starting weights are conservative fractions of body
  weight, and progression is a simple rule: add weight once every set reaches the top of the
  rep range. A coach should look over the exercise list, cues and ratios.
- Calorie targets come from the Mifflin-St Jeor and Katch-McArdle formulas. They are
  estimates, and the app says so. It is limited to adults and has a minimum calorie floor.

## Not built yet

Accounts and cross-device sync, progress photos and body measurements, a grocery list,
a food database beyond the built-in catalog, barcode scanning, custom exercises typed in by the user, real exercise videos or
illustrations in place of stick figures, and targets that adjust themselves from weigh-in data.
