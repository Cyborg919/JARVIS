import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const cameraFrameDir = path.join(process.cwd(), ".camera-frames");
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "geolocation=*, camera=*, microphone=*");
    next();
  });
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/speech/transcribe", async (req, res) => {
    const audio = typeof req.body?.audio === "string" ? req.body.audio : "";
    const mimeType = typeof req.body?.mimeType === "string" && req.body.mimeType.startsWith("audio/") ? req.body.mimeType : "audio/webm";
    if (!audio) return res.status(400).json({ error: "audio_required" });
    const bytes = Buffer.from(audio, "base64");
    if (bytes.length === 0 || bytes.length > 12 * 1024 * 1024) return res.status(413).json({ error: "audio_size_invalid" });
    const apiUrl = process.env.MANUS_API_URL;
    const apiKey = process.env.MANUS_API_KEY;
    if (!apiUrl || !apiKey) return res.status(503).json({ error: "transcription_unavailable" });
    try {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: mimeType }), "jarvis-voice.webm");
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("prompt", "Transcribe only clearly audible operator speech. Detect the spoken language automatically. Preserve the original language and script. If there is only silence, music, noise, or unclear audio, return an empty text rather than guessing.");
      const upstream = await fetch(`${apiUrl}/v1/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
      const payload = await upstream.json() as { text?: string; language?: string; segments?: Array<{ text?: string; no_speech_prob?: number }>; error?: { message?: string } };
      if (!upstream.ok || payload.error) return res.status(upstream.status || 502).json({ error: payload.error?.message || "transcription_failed" });
      const segments = Array.isArray(payload.segments) ? payload.segments : [];
      const silent = segments.length > 0 && segments.every((segment) => typeof segment.no_speech_prob === "number" && segment.no_speech_prob >= 0.72);
      return res.json({ text: silent ? "" : payload.text || "", language: payload.language || "" });
    } catch (error) {
      console.error("[Speech] Transcription failed:", error);
      return res.status(502).json({ error: "transcription_request_failed" });
    }
  });
  app.get("/api/live/news", async (req, res) => {
    const place = typeof req.query.place === "string" ? req.query.place.trim() : "";
    const region = typeof req.query.region === "string" ? req.query.region.trim() : "";
    const country = typeof req.query.country === "string" ? req.query.country.trim() : "";
    const query = [place, region, country, "breaking news"].filter(Boolean).join(" ");
    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query || "breaking news")}&hl=en&gl=US&ceid=US:en`;
    try {
      const upstream = await fetch(feedUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
      if (!upstream.ok) return res.status(502).json({ error: "news_source_unavailable" });
      const xml = await upstream.text();
      const decode = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      const tag = (item: string, name: string) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "");
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8).map((match) => {
        const item = match[1];
        return { title: tag(item, "title"), source: tag(item, "source") || "Google News", link: tag(item, "link"), publishedAt: tag(item, "pubDate") };
      }).filter((item) => item.title && item.link);
      res.set("Cache-Control", "no-store").json({ items });
    } catch (error) {
      console.error("[Live News] Request failed:", error);
      res.status(502).json({ error: "news_request_failed" });
    }
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  app.get("/api/camera/frame/:id", (req, res) => {
    const safeId = req.params.id.replace(/[^a-zA-Z0-9-]/g, "");
    res.sendFile(path.join(cameraFrameDir, `${safeId}.jpg`), (error) => {
      if (error && !res.headersSent) res.status(404).end();
    });
  });
  app.post("/api/custom-ai/respond", async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
    const apiUrl = typeof req.body?.apiUrl === "string" ? req.body.apiUrl.trim().replace(/\/$/, "") : "";
    const model = typeof req.body?.model === "string" ? req.body.model.trim() : "";
    const context = typeof req.body?.context === "string" ? req.body.context.trim() : "Dashboard telemetry only; live context is offline.";
    const language = typeof req.body?.language === "string" ? req.body.language.trim() : "auto";
    if (!message || !apiKey || !apiUrl || !model) return res.status(400).json({ error: "message_api_url_key_and_model_required" });
    try {
      const target = new URL(apiUrl);
      const blockedHost = /^(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(target.hostname);
      if (!/^https?:$/.test(target.protocol) || blockedHost) return res.status(400).json({ error: "custom_api_url_not_allowed" });
      const endpoint = `${apiUrl}${apiUrl.endsWith("/chat/completions") ? "" : "/chat/completions"}`;
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are JARVIS, created by Vignesh P. Answer only in the trusted operator language supplied below. Keep spoken answers concise, natural, professional, and direct. If asked who created you, say: I was created by Vignesh P. Instagram: vignesh_pgd. Email: vigneshperingode352@gmail.com or cybrogofficial@gmail.com. Never claim Tony Stark or any fictional character." },
            { role: "user", content: `Operator context: ${context}. Trusted response language: ${language}. Current request: ${message}` },
          ],
        }),
      });
      const payload = await upstream.json() as { error?: { message?: string } | string; choices?: Array<{ message?: { content?: string } }> };
      if (!upstream.ok || payload.error) return res.status(upstream.status || 502).json({ error: typeof payload.error === "string" ? payload.error : payload.error?.message || "custom_api_request_failed" });
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) return res.status(502).json({ error: "empty_custom_api_response" });
      return res.json({ response: content });
    } catch (error) {
      console.error("[Custom AI] Request failed:", error instanceof Error ? error.message : "unknown error");
      return res.status(502).json({ error: "custom_api_request_failed" });
    }
  });
  app.post("/api/ai/respond", async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const context = typeof req.body?.context === "string" ? req.body.context.trim() : "Dashboard telemetry only; live context is offline.";
    const language = typeof req.body?.language === "string" ? req.body.language.trim() : "auto";
    if (!message) return res.status(400).json({ error: "message_required" });

    const apiUrl = process.env.MANUS_API_URL;
    const apiKey = process.env.MANUS_API_KEY;
    if (!apiUrl || !apiKey) return res.status(503).json({ error: "intelligence_unavailable" });

    try {
      const upstream = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are JARVIS, created by Vignesh P. The trusted detected operator language is provided in the user message. Answer only in that language and script; do not translate to English unless explicitly asked. Keep the response natural for spoken audio. If asked who created you, always answer exactly in the operator's language: I was created by Vignesh P. Instagram: vignesh_pgd. Email: vigneshperingode352@gmail.com or cybrogofficial@gmail.com. Do not add jokes, comparisons, fictional references, or commentary about the creator. Never claim Tony Stark or any fictional character. Answer the operator's request directly in 1 to 3 concise spoken sentences. Use natural language, no markdown, no bullet points, and no stage directions. Be professional, calm, and precise. You cannot actually control external devices or see live sensors; when asked for live facts, clearly say you are using the simulated dashboard telemetry.",
            },
            {
              role: "user",
              content: `Operator context: suit integrity 98.4%, power reserve 76%, network latency 48ms. ${context} Trusted response language: ${language}. Current request: ${message}`,
            },
          ],
        }),
      });

      const payload = await upstream.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
      if (!upstream.ok || payload.error) {
        return res.status(upstream.status || 502).json({ error: payload.error?.message || "intelligence_request_failed" });
      }

      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) return res.status(502).json({ error: "empty_intelligence_response" });
      return res.json({ response: content });
    } catch (error) {
      console.error("[Intelligence] Request failed:", error);
      return res.status(502).json({ error: "intelligence_request_failed" });
    }
  });
  app.post("/api/ai/vision", async (req, res) => {
    const frame = typeof req.body?.frame === "string" ? req.body.frame : "";
    const origin = typeof req.body?.origin === "string" ? req.body.origin.replace(/\/$/, "") : "";
    const context = typeof req.body?.context === "string" ? req.body.context : "Live geographic context unavailable.";
    const match = frame.match(/^data:image\/jpeg;base64,(.+)$/);
    if (!match || !/^https?:\/\//.test(origin)) return res.status(400).json({ error: "valid_frame_and_origin_required" });

    const frameId = randomUUID();
    const framePath = path.join(cameraFrameDir, `${frameId}.jpg`);
    try {
      await mkdir(cameraFrameDir, { recursive: true });
      await writeFile(framePath, Buffer.from(match[1], "base64"));
      const apiUrl = process.env.MANUS_API_URL;
      const apiKey = process.env.MANUS_API_KEY;
      if (!apiUrl || !apiKey) return res.status(503).json({ error: "intelligence_unavailable" });

      const upstream = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `You are a cautious visual safety advisor for a personal HUD. Analyze only visible environmental hazards, obstacles, fires, vehicles, weapons, unsafe conditions, or unusual objects. Never identify people, infer identity, infer emotion or facial expression, infer sensitive traits, or claim certainty from an ambiguous frame. Context: ${context}. Return exactly one JSON object with this shape: {"level":"LOW|GUARDED|ELEVATED|UNKNOWN","summary":"one concise sentence","observations":["short visible observation"],"action":"one cautious next step"}. Use UNKNOWN when the frame is unclear. This is an advisory, not an emergency or security guarantee.` },
              { type: "image_url", image_url: { url: `${origin}/api/camera/frame/${frameId}`, detail: "low" } },
            ],
          }],
        }),
      });
      const payload = await upstream.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
      if (!upstream.ok || payload.error) return res.status(upstream.status || 502).json({ error: payload.error?.message || "vision_request_failed" });
      const rawContent = payload.choices?.[0]?.message?.content?.trim();
      if (!rawContent) return res.status(502).json({ error: "empty_vision_response" });
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      try {
        const result = JSON.parse(cleaned) as { level?: string; summary?: string; observations?: string[]; action?: string };
        const level = ["LOW", "GUARDED", "ELEVATED", "UNKNOWN"].includes(result.level ?? "") ? result.level : "UNKNOWN";
        return res.json({ level, summary: result.summary || "The frame was inconclusive.", observations: Array.isArray(result.observations) ? result.observations.slice(0, 4) : [], action: result.action || "Use human judgment and verify the scene directly." });
      } catch {
        return res.json({ level: "UNKNOWN", summary: rawContent, observations: [], action: "Treat this advisory as unverified and inspect the scene directly." });
      }
    } catch (error) {
      console.error("[Vision] Request failed:", error);
      return res.status(502).json({ error: "vision_request_failed" });
    } finally {
      setTimeout(() => { void unlink(framePath).catch(() => undefined); }, 120_000);
    }
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
