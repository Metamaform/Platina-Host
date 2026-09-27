<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c981c7e2-607d-4baa-b9b8-cc5e00b1b53d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Checks

```sh
npm run lint
npm run build
npx tsx --test tests/plinkoRewards.test.ts
```

Browser regression tests cover range dragging (mouse/touch), keyboard control,
release/cancel/blur, isolated preview renders and bottom-sheet interruptions:

```sh
npx puppeteer browsers install chrome
npx tsx --test tests/dragControls.test.ts
```

Alternatively, set `PUPPETEER_EXECUTABLE_PATH` to an installed Chromium binary.
The browser fixture runs locally and needs no Telegram credentials or backend.
