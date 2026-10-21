[JARVIS __ Tactical Intelligence Core.md](https://github.com/user-attachments/files/33757420/JARVIS.__.Tactical.Intelligence.Core.md)# JARVIS // Tactical Intelligence Core

Try Here:https://jarvis-hcbmrpsv.manus.space/

JARVIS is a cinematic, voice-first tactical assistant dashboard created by **Vignesh P**. It combines a responsive holographic HUD with conversational AI, multilingual voice interaction, browser sensors, live geographical context, news awareness, camera-based object detection, and a user-owned API provider system.

The project is an original futuristic interface inspired by tactical HUD design. It does not include film assets or fictional character attribution.

## Creator

**Created by Vignesh P**

- Instagram: [@vignesh_pgd](https://instagram.com/vignesh_pgd)
- Email: [vigneshperingode352@gmail.com](mailto:vigneshperingode352@gmail.com)
- Email: [cybrogofficial@gmail.com](mailto:cybrogofficial@gmail.com)

If the assistant is asked who created it, it identifies **Vignesh P** and provides these official contact details. It does not attribute the project to a fictional character.

## What the project includes

### Cinematic tactical HUD

The interface uses a near-black command-center aesthetic with electric cyan and warm amber accents. It includes a responsive dashboard, animated holographic orb, radar rings, targeting marks, scanlines, glass-like panels, glowing borders, live status indicators, precision typography, system telemetry, power reserve, network status, diagnostic summaries, an activity feed, and mobile-friendly layouts.

The interface is designed to feel like a calm personal operating system rather than a conventional chat page. Motion is restrained and meaningful: listening, processing, scanning, sensor activation, and system completion each have distinct visual states.

### Voice-first conversational assistant

JARVIS supports hands-free browser voice interaction through a listen, process, and speak loop. After the initial browser permission gesture, it can continuously re-arm the voice channel after normal recognition pauses and completed responses.

Voice behavior includes:

- Browser speech recognition for live spoken commands.
- Automatic recovery after normal recognition endings and recoverable errors.
- Microphone permission and unavailable-device messages.
- Speech interruption when the operator starts speaking.
- Browser speech synthesis for assistant responses and system actions.
- Typed command support through the tactical console.
- Wake-word support using “Jarvis” without requiring a button for every question.
- Camera-compatible microphone handling with echo cancellation, noise suppression, and automatic gain control.
- Local fallback responses when an AI service is unavailable.

### Multilingual conversation

The assistant supports explicit language selection and an Auto Detect mode. It can use a managed Whisper-compatible transcription route to identify the spoken language, preserve the original script, and answer in the same language.

Supported voice locale families include English, Indian languages, European languages, Arabic, Russian, Japanese, Korean, and Chinese, depending on the voices available in the operator’s browser. The response language is passed explicitly to the intelligence layer to reduce accidental English-only replies.

### Custom API provider

The left rail includes a **Custom API** panel for connecting a user-owned OpenAI-compatible provider. Users can enter:

- API base URL, such as `https://api.openai.com/v1`.
- Model name, such as `gpt-4o-mini`.
- API key.
- Optional `.env`, `.txt`, or JSON configuration upload.

The connection can be tested before activation. Once connected, text and voice requests use the custom provider for the current browser session. If that provider fails, JARVIS retries the managed intelligence route and then uses a local fallback.

Accepted JSON format:

```json
{
  "apiKey": "your-key",
  "apiUrl": "https://api.openai.com/v1",
  "model": "gpt-4o-mini"
}
```

Accepted `.env` names include:

```env
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

Custom API credentials are held in the active browser session and are not written to local storage, the application database, the notebook, the source archive, or server logs. The backend validates the endpoint and proxies requests without persisting the user’s key. Only OpenAI-compatible chat-completions endpoints are supported by this panel.

### Live location and geographical context

JARVIS can request high-accuracy browser geolocation and continuously refresh the current context. It uses zero-cache-age GPS requests, watches movement, refreshes environmental data, displays latitude and longitude, and derives the current timezone and regional place.

If precise browser permission is blocked, the app can use an approximate network-location fallback and labels that result honestly. The location panel provides a visible retry path for regaining precise GPS access.

The dashboard can open Google Maps at the current coordinates and can respond to map-related spoken commands. Location access is revocable and is not retained by the interface after access is removed.

### Live weather and time

The main clock follows the current location timezone. Weather and environmental readouts update from the active coordinates and continue refreshing while the operator remains stationary. The dashboard exposes live context status so approximate, precise, unavailable, and refreshing states are distinguishable.

### Camera perimeter and object recognition

The Vision Perimeter can request camera access independently from the microphone. It keeps a visible live preview and loads a local COCO-SSD detector using the MobileNet V2 model. Supported objects are identified directly from the live video frame without uploading every frame to an external model.

The camera system includes:

- Live camera preview.
- Independent camera and microphone permission handling.
- Automatic first-frame analysis after camera metadata is ready.
- Recurring automatic analysis at a safe interval.
- On-demand visual analysis.
- Local object labels and confidence display.
- Advisory threat levels: LOW, GUARDED, ELEVATED, and UNKNOWN.
- Cautious observations and suggested next actions.
- Background voice interaction while the camera is active.

Vision is deliberately limited to visible environmental hazards, obstacles, vehicles, fires, weapons, unsafe conditions, and unusual objects. It does not identify people, infer identity, infer emotion, or infer sensitive traits. It is not an emergency, security, or medical guarantee.

### Live news intelligence

The dashboard can query Google News RSS using the current regional place, region, and country. It refreshes the local briefing periodically, exposes source links, and can speak a new headline when it matches urgent-event keywords. The news channel is treated as live context, not as a guaranteed or authoritative emergency alert system.

### Creator profile and identity

The avatar opens a dedicated creator card containing Vignesh P’s name, role, Instagram handle, and both official email addresses. Creator responses are intentionally professional and consistent. The UI and prompt instructions prohibit fictional creator attribution.

### Backend services

The Express server provides routes for:

- `/api/health` — runtime health check.
- `/api/ai/respond` — managed conversational AI.
- `/api/custom-ai/respond` — non-persistent user-owned API proxy.
- `/api/speech/transcribe` — multilingual audio transcription.
- `/api/ai/vision` — advisory visual analysis.
- `/api/live/news` — regional Google News RSS context.
- `/api/camera/frame/:id` — temporary camera-frame delivery for vision requests.
- `/api/platform/config.js` — safe public runtime configuration.
- `/manus-routes.json` — page route manifest.

## Run locally

Requirements:

- Node.js 20 or newer.
- pnpm 10 or newer.
- A modern browser for camera, microphone, location, and speech APIs.
- Internet access for dependency installation and optional live services.

Install and launch the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Run validation and create a production build:

```bash
pnpm check
pnpm build
pnpm start
```

Useful commands:

```bash
pnpm test          # Run application tests
pnpm check         # TypeScript validation
pnpm build         # Frontend and backend production build
pnpm start         # Serve the production bundle
pnpm db:migrate    # Apply checked-in database migrations when configured
```

## Managed service configuration

Managed AI, transcription, and vision routes can use these optional server environment variables:

```env
MANUS_API_URL=
MANUS_API_KEY=
PORT=3000
NODE_ENV=development
```

Copy `.env.example` to `.env` for local configuration. Never commit `.env` or real API keys. The dashboard can still launch without managed credentials; AI-backed requests then use the available fallback behavior or the Custom API panel.

## Kaggle

The repository includes `kaggle_jarvis.ipynb`, a self-contained notebook that embeds a complete source fallback. Upload the notebook directly to Kaggle, enable Internet access, and run all cells from top to bottom. It will:

1. Prepare the source automatically.
2. Install the pinned pnpm toolchain and dependencies.
3. Load optional `MANUS_API_URL` and `MANUS_API_KEY` Kaggle Secrets without printing them.
4. Run TypeScript validation.
5. Build the production frontend and server.
6. Start JARVIS on port 3000.
7. Verify the health endpoint and route manifest.
8. Verify Custom API request validation.
9. Display a clickable local HUD link.

Kaggle sessions are temporary. Browser permissions must be granted in the browser view opened from the notebook. You can configure a user-owned provider inside the running HUD without adding the provider key to Kaggle Secrets.

## Project structure

```text
client/
  index.html                 Browser entry document
  src/App.tsx                Application shell and routes
  src/pages/Home.tsx         Main HUD, voice, sensors, context, and Custom API panel
  src/index.css              Cinematic tactical visual system
  src/components/             Required interface primitives
server/
  _core/index.ts             Express server and HTTP routes
  _core/                     Runtime, auth, Vite, platform, and service helpers
  routers.ts                 tRPC application router
shared/                       Shared constants and TypeScript types
drizzle/                      Database schema and migrations
public/manus-routes.json      Page route manifest
kaggle_jarvis.ipynb            Self-contained Kaggle launcher
KAGGLE_SETUP.md                Kaggle-specific documentation
Dockerfile                     Production container build
```

## Privacy, permissions, and safety

The browser controls microphone, camera, and geolocation permission. Location and media access can be revoked from browser site settings. Camera analysis is advisory only. It must not be used as the sole basis for emergency, security, medical, legal, or safety decisions.

The local object detector and browser sensors operate on the client. Temporary camera frames used by the optional vision route are removed after a short retention window. User-owned API keys are accepted only for the active request/session flow and are not persisted by this project.

Do not commit API keys, cookies, private datasets, generated build directories, dependency directories, or `.env` files.

## Design and attribution

JARVIS is an original Vignesh P project with a futuristic tactical-dashboard aesthetic. It is not a recreation of protected film artwork or a claim of fictional ownership. The project’s identity, creator metadata, and assistant instructions consistently identify **Vignesh P** as the creator.

## License and contributions

Add the license that matches your intended distribution before publishing the repository. Contributions should preserve the privacy boundaries, advisory-only vision behavior, multilingual response requirements, and explicit Vignesh P creator attribution described above.
