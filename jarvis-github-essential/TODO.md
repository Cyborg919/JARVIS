
## User-owned API provider
- [x] Add a visible Custom API section where users can enter an OpenAI-compatible base URL, model, and API key, or import a `.env`/JSON configuration file.
- [x] Test the user-owned endpoint before activating it, route subsequent Jarvis text and voice responses through it for the current browser session, and provide a managed-AI fallback when it is disconnected or unavailable.
- [x] Keep user API credentials out of local storage, the database, the notebook, the ZIP, and server logs; validate custom endpoint URLs and proxy requests without persisting the key.
