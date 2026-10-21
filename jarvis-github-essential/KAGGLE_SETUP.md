# JARVIS Kaggle Package

This package contains the complete server-backed JARVIS web application, including the React HUD, Express server, live context integrations, camera/object detection, multilingual voice capture, automatic language transcription, same-language AI responses, creator identity configuration, and a custom OpenAI-compatible API provider panel.

## Kaggle notebook workflow

1. Upload `kaggle_jarvis.ipynb` directly to Kaggle and run all cells. The notebook contains an embedded source fallback and does not require a separate Dataset.
2. Optionally attach this source package as a Kaggle Dataset. If a JARVIS ZIP is present in `/kaggle/input`, the notebook uses that attached source instead of its embedded fallback.
3. The notebook installs Node.js dependencies, runs TypeScript validation, builds the production bundle, starts the server, validates the route manifest, checks `/api/health`, and tests Custom API request validation.
4. For managed AI, transcription, and vision, add `MANUS_API_URL` and `MANUS_API_KEY` as Kaggle Secrets. The app still launches without them, but AI-backed routes return an unavailable response.
5. Open the printed local preview URL from the notebook environment. Browser microphone, camera, and geolocation permissions must be granted from the browser running the preview.

## Use your own API

Open the **Custom API** control in the left rail. Enter an OpenAI-compatible base URL, model, and API key, or import a `.env`/JSON configuration file. Select **Test & use API** to verify the connection. Successful voice and text requests will then use that provider for the current browser session. The key is sent only to the server proxy for the request and is not saved to local storage, the database, the ZIP, or the Kaggle notebook.

The accepted JSON shape is `{ "apiKey": "…", "apiUrl": "https://api.example.com/v1", "model": "model-name" }`. `.env` files may use `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`.

## Important limitations

Kaggle Notebooks are compute environments, not permanent public web hosting. The included notebook launches JARVIS for the active notebook session. For a stable public URL, deploy the same source to a Node-capable host and provide the same runtime environment variables.

No secrets, `.env` files, `node_modules`, build output, Git metadata, runtime logs, camera frames, or temporary files are included in this package.
