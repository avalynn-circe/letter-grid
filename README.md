# Spelling Grid — React Native App

A real native app (via Expo/React Native) — actual native UI components,
not a web view. Rewritten from scratch from the earlier web version;
the game rules, letter weights, dictionary, and visual design all carry
over, but every screen is real `View`/`Text`/`Pressable` components.

## What's here
- `App.tsx` — root component, wires everything together (including the
  new-puzzle confirm dialog and the ambient-sound toggle)
- `src/game/game.ts` — pure game logic (board generation, letter weights,
  adjacency, scoring) — no UI dependencies, fully unit-tested by hand
- `src/data/` — loads the same 170k-word dictionary, now bundled as a real
  JSON asset (`assets/dictionary.json`) that Metro packs directly — the old
  gzip+base64+pako pipeline is gone
- `assets/` — the dictionary JSON and the ambient audio track
  (`ambient.mp3`, played via `expo-audio`: looping, off by default,
  volume 0.35 — same behavior as the web version)
- `src/theme/` — light/dark color tokens, synced to the current web
  build's blue palette
- `src/storage/` — persistence via `AsyncStorage` — the real on-device
  storage for React Native, not a browser API. Puzzles and stats survive
  indefinitely, same as promised before.
- `src/components/` — Board (with the SVG thread trace), Tile (handles
  the Qu combined-tile), FoundWords, StatsSheet (a real native Modal)

## Run it (fastest way — no Xcode/Android Studio needed to preview)
1. Install [Node.js](https://nodejs.org) if you don't have it.
2. In this folder: `npm install`
3. `npx expo start`
4. Install **Expo Go** from the App Store or Play Store on your phone,
   then scan the QR code that appears in your terminal. The app opens
   live on your phone — real native rendering, not a browser.

Any edits you make and save will hot-reload on your phone automatically.

## Building a real installable app (App Store / Play Store)
Expo Go is for development only — for a distributable build, use
[EAS Build](https://docs.expo.dev/build/introduction/):
```
npm install -g eas-cli
eas login
eas build --platform android   # or ios, or both
```
This builds in the cloud and gives you a downloadable `.apk`/`.aab` or
`.ipa` — for iOS you'll still need an Apple Developer account to sign
and submit it, same as any iOS app.

## If you want to verify things yourself before running on a phone
- Type-check: `npx tsc --noEmit`
- The dictionary and game-logic modules (`src/data/dictionary.ts`,
  `src/game/game.ts`) have no React Native dependencies, so they can be
  tested directly with plain Node if you ever want to script that.

## Known simplifications versus the web version
- Tile taps use the same tap-sequence selection as before (tap a tile,
  then an adjacent one, and so on) rather than a drag gesture — matches
  what was already decided earlier in this project.
- The web version's keyboard bindings (arrows/Space/Backspace/Enter)
  don't apply here — this is a touch UI.

Music: "Lofi Chill Beat (Window Rain Vibes)" by
[free_audio_library](https://pixabay.com/music/beats-lofi-chill-beat-window-rain-vibes-366048/)
via Pixabay.
