# Wisp: Quit Vaping Buddy

Wisp is a fully local iOS app for people who want to quit vaping. Instead of a bare puff counter it gives you a
companion — **your Wisp**, a small cloud-spirit drawn entirely in code — whose glow mirrors your clean streak. The
design is relapse-forgiving: a slip dims your Wisp one stage for a day and restarts the streak clock, but lifetime
stats keep accumulating, nothing ever resets to zero, and the app never says you failed. There is no login and no
network traffic except RevenueCat for subscriptions.

## Features

- **Living companion** (`src/components/Wisp.tsx`) — SVG cloud creature with 6 visual stages (grey → lavender → sky →
  mint → golden → radiant), 5 moods (happy / neutral / sad / craving / proud), breathing + float + blink idle animation
  using the plain `Animated` API.
- **Onboarding** — 6 short steps: device type, puffs/day + nicotine %, weekly spend, reasons to quit, quit method
  (cold turkey or 7/14/30-day taper), name your Wisp with a reveal animation.
- **Home** — big Wisp, live streak timer, next-milestone card, money / puffs / nicotine avoided tiles, `Craving? SOS`,
  `I slipped` sheet, taper allowance ring (taper mode only).
- **Craving SOS** — 3 × 60s: box breathing with haptics → "catch the Wisp" tap mini-game → reflection cards cycling
  your reasons → sparkle burst, Wisp goes `proud` for 10 minutes, `cravingsBeaten` increments.
- **Health timeline** — 10 milestones from 20 minutes to 1 year with progress bars (general information, not medical
  advice).
- **Stats** — lifetime / current / longest streak, slips (forgiving copy), cravings beaten, money, puffs, a 14-day
  SVG bar chart and an 8-badge achievements grid.
- **Taper plan** — linear daily allowance to zero, ring with remaining puffs, +1 / +5 logging, under-allowance streak,
  "Go fully clean today?" when the schedule ends.
- **Settings** — edit Wisp name / quit date / puffs / cost, reminders toggle (daily 8pm check-in + milestone
  notifications), restore purchases, manage subscription, privacy / terms, reset.
- **Paywall** — RevenueCat `$rc_weekly` (3-day trial label) and `$rc_annual` (best value) from `offerings.current`,
  entitlement `pro`. Free tier keeps Home, the Wisp, slips and one SOS per day; Stats, Health, Taper details and
  unlimited SOS are gated.

## State model

Persisted as JSON to AsyncStorage under `wisp.state.v1` (`src/store/AppContext.tsx`, types in `src/logic/types.ts`):

| field | meaning |
| --- | --- |
| `onboarded`, `wispName`, `vapeType`, `puffsPerDay`, `nicotinePct`, `weeklyCost`, `reasons[]`, `quitMode` | onboarding answers |
| `quitAt` | ISO start of the *current* clean streak (restarts on slip) |
| `originalQuitAt` | ISO of the first quit — lifetime stats count from here |
| `slips[]` `{at, puffs}` | every slip logged |
| `cravings[]` `{at, beaten}` | every SOS session (beaten or left early) |
| `taperPuffLog` `{dateKey: count}` | puffs logged per day in taper mode |
| `cravingsBeaten`, `longestStreakMs` | counters |
| `slipPenaltyUntil` | ISO; while in the future, effective stage is one lower and mood is `sad` |
| `proudUntil` | ISO; while in the future, mood is `proud` |
| `notificationsEnabled` | reminders toggle |

All derived values are pure functions in `src/logic/wisp.ts` and take `now` as an argument: `streakMs`, `stage`,
`effectiveStage`, `mood`, `nextMilestone`, `moneySaved`, `puffsAvoided`, `nicotineAvoidedMg`, `taperAllowance`,
`taperSchedule`, `underAllowanceStreak`, `healthMilestones`, `achievements`, `dailyHistory`.

## Stage and slip math

- `streakMs = now - quitAt`.
- Stage from streak: 0 = < 1 day, 1 = 1–2 d, 2 = 3–6 d, 3 = 7–13 d, 4 = 14–29 d, 5 = 30+ d.
- **Slip**: appends to `slips`, records `longestStreakMs`, sets `quitAt = now` and `slipPenaltyUntil = now + 24h`.
  `effectiveStage = max(0, stage - 1)` while the penalty is active. `originalQuitAt` never changes.
- **Puffs avoided** = `puffsPerDay × lifetimeDays − Σ slip puffs − Σ taper puffs` (never below 0).
- **Money saved** = `puffsAvoided × (weeklyCost / 7 / puffsPerDay)`.
- **Nicotine avoided (mg)** = `puffsAvoided × (nicotinePct / 100 × 1000 mg/mL) × 0.05 mL`. Assumption: one puff
  vaporises ≈ 0.05 mL of liquid, so a 5 % puff carries ≈ 2.5 mg of liquid nicotine (absorbed dose is lower).
- **Taper allowance** on day *i* of *N* = `round(puffsPerDay × (1 − i / N))`, day 0 = the day you started, 0 after
  the schedule ends. Going over is shown as "over today", never as failure.
- SOS "beaten" sets `proudUntil = now + 10 min`; leaving early logs the craving as not beaten and does nothing else.

## Notifications

`src/services/notifications.ts` asks permission only when reminders are switched on. It schedules a daily 8 pm local
check-in plus one-off milestones at 24 h / 72 h / 7 d / 14 d / 30 d from `quitAt`, and reschedules from scratch when the
quit date changes or reminders are toggled. The module is imported lazily behind a `Platform` check so the web bundle
never loads it.

## Environment variables

| var | purpose |
| --- | --- |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat public iOS SDK key. Without it billing is a no-op and the app runs in free mode. |
| `EXPO_PUBLIC_DEV_UNLOCK` | `1` / `true` unlocks all Pro features locally for development. |

## Development

```sh
npm install
npx tsc --noEmit
npx expo start            # iOS simulator / device
eas init && eas build -p ios --profile production
```

Bundle id `com.formaz.wisp`, Expo SDK 57, React Native 0.86, React 19. Legal pages: `https://tryforma.app/wisp/terms.html`
and `https://tryforma.app/wisp/privacy.html`.
