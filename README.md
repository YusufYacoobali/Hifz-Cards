# Hifz Cards

Expo React Native app for Quran memorisation and revision through custom local notifications and swipeable test cards.

## Run

```powershell
npm install
npm start
```

The app is pinned to Expo SDK `~54.0.35`. I did not start the dev server during the build pass.

## Review Flow

- Complete onboarding: choose new memorisation, revision, or both; select ranges; set frequency, active hours, days, and community mode.
- Open reminders: adjust separate Today's Memorisation and Wird / Revision plans. Weak ayahs are prioritised inside the revision schedule.
- Start a card session: tap to reveal, use result buttons, or swipe right/left to save results.
- Check progress: review the ayah map, weak spots due, streak calendar, and weekly recap.
- Check profile: review persisted journal marks, current goal, reminder settings, circle settings, and clear local review history if needed.

## Structure

- `App.tsx` contains the screen composition and React Native presentation components.
- `src/hooks/useHifzAppState.ts` owns app state, persistence, session commands, and native side effects.
- `src/native.ts` owns local notification scheduling and native in-app review cadence.
- `src/hifzModel.ts` contains typed hifz domain models and derived dashboard/progress/recap data.
- `src/data.ts` contains the seeded Al-Mulk cards, revision flows, and leaderboard content from the mockup.
- `src/deck.ts` contains deck/domain helpers used by the session and progress views.
- `src/theme.ts` contains shared color and shadow tokens.
