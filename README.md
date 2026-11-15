# Timbang

Calorie targets, Filipino meal plans, guided training and weight tracking for lifters.
"Timbang" is a working name. Change it in `src/config/brand.ts`.

Everything the app calculates is written down in [How the numbers are worked out](#how-the-numbers-are-worked-out),
so anyone can check it. Where a number is our own rule of thumb and not a published standard, it says so.

## Run it

```bash
npm install
npm run dev          # local development
npm test             # unit tests for the calculation and planning logic
npm run build        # type-check and build to dist/
npm run preview      # serve the built app
FDC_API_KEY=... npm run verify:foods   # check the food catalog against USDA (see Food data)
```

Pushing to `main` runs the tests, builds, and deploys to GitHub Pages (`.github/workflows/cicd.yml`).

## What is in it

| Screen | What it does |
|---|---|
| Today | Home. Today's workout, meals, steps and weigh-in in one place. |
| Target | Calorie and macro targets for cutting, maintaining or building. Optional fine-tuning of pace, protein and body fat. Settings: units, install. |
| Meals | Three ways to handle food, chosen in setup and changeable any time: **suggested** (a week of Filipino meals that hit the target, with swaps), **my own plan** (enter meals once, from the food list or your own numbers), or **just track** (no plan, log food against the target). On the day, meals are marked eaten or skipped and off-plan food is added. |
| Training | A weekly split chosen from the number of lifting days, with exercises for a gym, dumbbells or no equipment. Each lift has sets, reps, rest, a suggested weight, a moving stick figure and a video link. Any lift can be changed for a suggestion or anything in the catalog. A guided session runs set by set, with a set clock, a big rest countdown, and a hold timer for planks and wall sits. |
| Progress | Weigh-in log, a smoothed trend, and a pace check against the plan, with an offer to correct the calorie estimate. A Lifts view shows records, estimated one-rep max and history per lift. |

Also: dark (default) and light themes, metric or imperial units, steps tracking, and the app can be added to a
phone's home screen and opens offline.

Everything is saved in the browser on the device. There are no accounts and no server, and the app never sends your
data anywhere. After it loads it only fetches its own files, which it keeps for offline use. The only outside link is
"Watch it done on YouTube", which opens in a new tab.

## How the code is organized

```
src/
  domain/        Pure logic. No React, no browser APIs. Fully unit-tested.
    nutrition/   BMR, maintenance, targets, steps, calorie calibration
    foods/       Food types, the catalog (one file per food group), USDA comparison
    mealplan/    Meal templates, the generator, portion fitting, swaps,
                 plans of one's own, and tracking of what was eaten
    training/    Exercise catalog, splits, program builder, weight guidance,
                 effort and progression, kg and lb systems, guided-session rules, stats
    progress/    Trend smoothing and pace checks
  state/         Saved app state and its storage (one store per concern)
  features/      One folder per screen
  ui/            Shared building blocks: Button, Dial, Sheet, DateStepper, ...
  app/           App frame, tab navigation, routing
  styles/        Design tokens (colors, type, spacing) and global styles
  lib/           Formatting, units, dates, install and device helpers
  config/        Brand name
```

Dependencies point one way. `features` use `state`, `ui` and `domain`. `domain` uses nothing else. A change to how
calories are computed never touches a screen, and a redesign never touches the math.

### Common changes

- **Add a food:** an entry in the matching file in `src/domain/foods/catalog/`. Calories are computed from the
  macros, so only protein, carbs and fat are entered.
- **Add an exercise:** an entry in `src/domain/training/exercises.ts` with the movement pattern it trains. It then
  appears as a swap option automatically.
- **Add a stick-figure demo:** two poses in `src/features/training/figures.ts`, and map the exercise id to it at the
  bottom of that file.
- **Change a split or workout:** `src/domain/training/splits.ts`.
- **Change a formula or default:** `src/domain/nutrition/` and the tables below.
- **Change colors or add a theme:** `src/styles/tokens.css`. A theme is one block of color tokens, listed in
  `src/state/themeStore.ts`.
- **Add accounts and sync:** replace the storage in `src/state/storage.ts`. The stores do not need to change.

## How the numbers are worked out

All of this is in `src/domain/`. Weights and heights are stored in metric and converted only for display.

These numbers are estimates for healthy adults, not medical advice. The app is for ages 18 and up.

### Calories

**Resting energy (BMR).** Mifflin-St Jeor by default:

- Men: `10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5`
- Women: `10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161`

If body fat % is entered, Katch-McArdle is used instead, which works from lean mass:
`370 + 21.6 × lean mass(kg)`, where lean mass is `weight × (1 − body fat %)`.

**Maintenance.** `BMR × activity multiplier`. The multiplier is **our own simplification**, not a standard table:

| Normal day outside the gym | Base |
|---|---|
| Mostly sitting | 1.20 |
| Sitting and moving | 1.30 |
| On my feet | 1.40 |
| Physical work | 1.50 |

Add `0.035` for each lifting day a week, capped at `1.90`. Training is therefore counted as a weekly average
spread over every day. Training days are not given more calories than rest days.

**Corrections from the person's own data.** Two things can move the estimate, both optional:

- *Steps.* A week of logged steps suggests an activity level: under 5,000 a day is "mostly sitting", 5,000 to 7,499
  "sitting and moving", 7,500 to 9,999 "on my feet", and 10,000 or more "physical work". If it differs from the one
  chosen, the app offers to switch. Steps are never added on top, so nothing is counted twice.
- *Weigh-ins.* After at least 14 days and 5 weigh-ins since the last correction, the weight trend is compared with
  what the target predicts. If they differ, the app offers a correction to the maintenance estimate:
  `(planned − actual weekly change in kg) × 7700 ÷ 7`, rounded to 50 kcal, ignored if under 100 kcal, and never more
  than 300 kcal at once. It is only applied when the person taps, it assumes they ate to the plan, and it can be
  removed. The goal and pace stay the same, so the cut or surplus is still measured against the corrected maintenance.

**Target.** `maintenance × (1 + adjustment)`, rounded to 10 kcal:

| Goal | Easy | Steady | Fast |
|---|---|---|---|
| Lose fat | −10% | −20% | −25% |
| Build muscle | +5% | +10% | +15% |
| Maintain | 0% | 0% | 0% |

The default pace is Steady for cutting. For building it depends on experience: beginners Fast, intermediate Steady,
advanced Easy (newer lifters gain muscle faster, so a bigger surplus is used well). The target never goes below
**1,500 kcal for men or 1,200 kcal for women**, and the app says when that floor applied.

**Expected weekly change.** `(target − maintenance) × 7 ÷ 7700`, in kg. 7,700 kcal per kg of body weight is the
common rule of thumb (Wishnofsky 1958). It is a simplification that overstates long-term change, because the body
adapts (Hall et al. 2011). That is one reason the weigh-in correction exists.

### Macros

- **Protein:** `grams per kg × reference weight`. Defaults are 2.2 g/kg when cutting, 2.0 when building, 1.8 when
  maintaining, adjustable between 1.2 and 3.0. The reference weight is the lower of body weight and the weight at
  BMI 27.5, so protein does not balloon at high body fat. Rounded to 5 g.
- **Fat:** 25% of calories, but at least 0.6 g per kg of reference weight. Rounded to 5 g.
- **Carbohydrate:** whatever calories remain, `(calories − 4 × protein − 9 × fat) ÷ 4`. Rounded to 5 g.
- **Water:** 35 ml per kg of body weight, rounded to 0.1 L. This is a common rule of thumb, not a strong standard.
  Needs rise with training, sweat and heat.

### Meal plans

The suggested plan is built in `src/domain/mealplan/`:

1. Calories are split across the day's meals (for example 25/32/13/30% for four meals).
2. For each meal a template is picked at random, weighted, and filled with foods from the catalog that fit the
   budget tier, excluded foods and whey setting. Foods used earlier in the week are less likely to repeat. When
   protein is a large share of the target (typical on a cut), leaner foods are favoured.
3. The portion of every food is then adjusted, in the steps each food allows (half a cup of rice, a whole egg), by a
   small search that minimizes the squared relative error of calories, protein, carbs and fat, plus a penalty for
   meals far from their share. Several menus are tried per day and the closest is kept.
4. The tests require every day to land within 8% of the calorie target and 20% of the protein target, and the week
   within 5% and 10%, across several body types and preference sets.

A plan of one's own is never changed by the app. It only reports how a day adds up against the target. Marking meals
eaten or skipped, and food added outside the plan, is stored per calendar day with the macros as they were when
marked, so editing a plan later does not rewrite what was eaten. Re-portioning the meals still to come for the day uses
the same fitting search, on those meals only, and applies to that date only.

### Food data

Every food has protein, carbs and fat per serving. Calories are computed from them (`4 × protein + 4 × carbs +
9 × fat`), so the totals always agree. Each food carries a `source`:

- **`usda`:** checked against [USDA FoodData Central](https://fdc.nal.usda.gov/), which is public domain (CC0). So far
  this is **cooked white rice** (SR Legacy 168878: 130 kcal, 2.69 g protein, 28.2 g carbs, 0.28 g fat per 100 g),
  which matches the catalog within 1%.
- **`estimate`:** every other food. These are typical values for home or carinderia cooking and are **not
  lab-measured**. Cooking method, portion size and recipe change them a lot, especially for dishes such as adobo,
  sinigang or tapa. The food sheet in the app says which kind a food is.

**What has not been done.** The Philippine Food Composition Tables (PhilFCT, DOST-FNRI) are the right source for
Filipino dishes. They are not used here. Their website blocks automated access, so no values were copied, and their
terms of use should be read before any are. A nutritionist should check the dishes against PhilFCT before the app is
relied on for real diets.

**Checking the rest yourself.** `FDC_API_KEY=your-key npm run verify:foods` compares about twenty foods that have a
USDA equivalent (rice, eggs, chicken breast, tuna, tilapia, banana, milk and so on) and lists any whose numbers
differ by more than 15% for calories or 20% for a macro. A free key comes from
https://fdc.nal.usda.gov/api-key-signup. It changes nothing. It prints what to review. It has not yet been run against
the live API from this project, so the matches it prints should be read by a person.

### Weight tracking

- **Trend.** Each weigh-in's trend value is a straight line fitted through the nearby weigh-ins, with closer days
  counted more (a Gaussian weight with a 5-day spread), read at that date. Unlike a running average it does not lag
  behind a steady loss or gain, and it smooths out daily water swings.
- **Weekly rate.** A least-squares line through the weigh-ins of the last 28 days, shown per week. It needs at
  least 3 weigh-ins spread over at least 7 days.
- **Pace check.** The actual rate is compared with the planned one. "On pace" is within 35% of the planned rate (at
  least 0.1 kg a week). Moving the wrong way by more than 0.15 kg a week is flagged. For maintenance, within 0.15 kg
  a week counts as steady.

### Training

**Split.** Chosen from the number of lifting days: 1 to 3 full body, 4 upper/lower, 5 upper/lower plus push/pull/legs,
6 push/pull/legs. Seven days is planned as six, so there is always a rest day. These are common, widely used
arrangements, not the only valid ones.

**Sets, reps, rest.** By the role of the lift in the workout:

| Role | Reps | Rest | Sets (beginner / intermediate / advanced) |
|---|---|---|---|
| Main | 6 to 10 | 2½ min | 3 / 3 / 4 |
| Secondary | 8 to 12 | 2 min | 3 / 3 / 3 |
| Accessory | 10 to 15 | 75 s | 2 / 3 / 3 |

Timed holds use 30 to 60 seconds. These are typical hypertrophy-oriented ranges, chosen by us.

**Starting weight.** `reference body weight × exercise ratio × experience factor × sex factor`, rounded to what the
equipment can load (2.5 kg on a barbell, 5 kg on a machine, 1 or 2.5 kg for dumbbells; the lb system uses 5 lb and
10 lb steps, a 45 lb bar and lb plates). Experience factors are 1, 1.4 and 1.75. For women the factor is 0.6 on
upper-body lifts and 0.75 on lower-body lifts. The **ratios per exercise are our own conservative estimates**, written
in `exercises.ts`. They are only a place to begin, and the screen says to adjust them on the day.

**Effort.** After each set the person says how many more reps they could have done: Easy (3 or more), Solid (2), Hard
(1), Max (none). This is reps in reserve (RIR), a standard way to rate effort in strength training (Zourdos et al.
2016). Sets with no rating count as "2 left".

**Progressive overload.** Double progression: stay at a weight until every set reaches the top of the rep range, then
add weight and work back up. Effort adjusts the call at the edges:

| Last session | Next session |
|---|---|
| Every set at the top of the range, with reps to spare | Add one step of weight (2.5 kg barbell upper body, 5 kg barbell lower body, the next rack weight for dumbbells, 5 kg machine) |
| Every set at the top and it felt easy (average 3 or more left) | Add two steps |
| Every set at the top but most sets were to the limit (average under 1 left) | Hold, and repeat once |
| Inside the range, but sets felt easy (average 2.5 or more left) | Add one step, since the weight is too light |
| Inside the range | Hold, and aim for one more rep than the weakest set |
| Any set under the bottom of the range | Back off 10% |

Bodyweight lifts progress by reps, then by making them harder. This is a common approach (see the American College of
Sports Medicine's position stand on progression in resistance training, 2009). The thresholds are ours.

**Easy week.** If, in the last 10 days, at least 9 rated sets averaged under 0.8 reps in reserve, or at least two lifts
did worse than last time at the same weight (2 or more total reps fewer), the app suggests an easy week. It is never
started without a tap. During it, weights are 90% of the usual and every lift has one set fewer (never fewer than
two), for seven days.

**Estimated one-rep max.** Epley's formula: `weight × (1 + reps ÷ 30)`, with reps above 12 counted as 12 because the
estimate gets rough beyond that. A single rep counts as the max. The rep table reverses it: `1RM ÷ (1 + reps ÷ 30)`,
rounded to loadable weights. It is for tracking progress. Nobody needs to test a real max.

**Records.** A new record is more weight on the bar than ever before, or, at the same weight, a higher estimated max.
For bodyweight lifts it is more reps in a set. A lift's first session sets no record.

### References

Listed so they can be checked. They were written from memory of the literature, so check the details before
quoting them anywhere official.

- Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals.
  *Am J Clin Nutr* 1990;51(2):241-247.
- McArdle WD, Katch FI, Katch VL. *Exercise Physiology* (the Katch-McArdle equation).
- Wishnofsky M. Caloric equivalents of gained or lost weight. *Am J Clin Nutr* 1958;6(5):542-546.
- Hall KD, et al. Quantification of the effect of energy imbalance on bodyweight. *Lancet* 2011;378(9793):826-837.
- Morton RW, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation
  on resistance training-induced gains in muscle mass and strength. *Br J Sports Med* 2018;52(6):376-384.
- Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation:
  nutrition and supplementation. *J Int Soc Sports Nutr* 2014;11:20.
- Tudor-Locke C, Bassett DR. How many steps/day are enough? Preliminary pedometer indices for public health.
  *Sports Med* 2004;34(1):1-8.
- Epley B. Poundage chart. *Boyd Epley Workout*, 1985.
- Zourdos MC, et al. Novel resistance training-specific rating of perceived exertion scale measuring repetitions in
  reserve. *J Strength Cond Res* 2016;30(1):267-275.
- American College of Sports Medicine. Progression models in resistance training for healthy adults. *Med Sci Sports
  Exerc* 2009;41(3):687-708.

## Before launch

- **Verify the nutrition data.** Have a nutritionist check the dishes against the Philippine Food Composition Tables
  (DOST-FNRI) and read its terms of use. Run `npm run verify:foods` with a USDA key and review what it lists.
- **Review the training defaults.** A coach should look over the exercise list, cues, starting-weight ratios and the
  progression thresholds.
- **Check the legal and safety text.** The app says its numbers are estimates and that it is not medical advice, and
  it limits itself to adults with a calorie floor. Have that wording reviewed for the places it will be used.
- **Sync and accounts.** Data lives on one device. Clearing the browser loses it.

## Not built yet

Accounts and cross-device sync, progress photos and body measurements, a grocery list, a weekly review screen,
barcode scanning, custom exercises typed in by the user, real exercise videos or illustrations in place of stick
figures, reminders (a website cannot send them when closed), and reading steps automatically (a website cannot read
a phone's step counter, so steps are typed in).
