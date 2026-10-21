[JARVIS __ Tactical Interface.md](https://github.com/user-attachments/files/33757000/JARVIS.__.Tactical.Interface.md)
# JARVIS // Tactical Interface

A cinematic, voice-first tactical assistant interface built with React, Vite, Express, TypeScript, and TensorFlow.js. It includes live browser location, weather, Google News context, camera-based COCO-SSD object detection, multilingual voice interaction, creator identity, and a user-owned OpenAI-compatible API provider.

## Run locally

Requirements: Node.js 20+, pnpm 10+, and a modern browser with microphone, camera, and geolocation support.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. For a production build:

```bash
pnpm check
pnpm build
pnpm start
```

The managed AI, transcription, and vision routes use `MANUS_API_URL` and `MANUS_API_KEY` when supplied in the server environment. The dashboard still loads without those variables, with local fallback behavior.

## Use your own AI API

Open **Custom API** in the left rail. Enter an OpenAI-compatible base URL, model, and API key, or import a `.env`/JSON configuration file. Select **Test & use API** to route Jarvis text and voice responses through that provider for the current browser session. The API key is not saved to local storage, the database, or the repository. If the provider is unavailable, Jarvis retries the managed route and then uses its local fallback.

Example JSON configuration:

```json
{
  "apiKey": "your-key",
  "apiUrl": "https://api.openai.com/v1",
  "model": "gpt-4o-mini"
}
```

## Project layout

- `client/` — React HUD interface, voice controls, camera integration, live context, and custom API panel.
- `server/` — Express routes for AI responses, transcription, vision, news, and the non-persistent custom API proxy.
- `shared/` — Shared TypeScript types and constants.
- `public/manus-routes.json` — Page route manifest.
- `kaggle_jarvis.ipynb` — Kaggle setup and launch notebook.
- `KAGGLE_SETUP.md` — Kaggle deployment notes and provider configuration.
- `Dockerfile` — Production container build.

## Privacy and safety

Camera analysis is advisory only and does not identify people or infer identity, emotion, or sensitive traits. Browser location and media permissions remain under the operator's control. Do not commit API keys or `.env` files.

The interface is an original cinematic tactical dashboard inspired by futuristic HUD design; it does not include film assets or fictional character attribution.
