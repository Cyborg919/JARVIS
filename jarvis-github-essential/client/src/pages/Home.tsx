import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Aperture,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  BrainCircuit,
  Camera,
  CameraOff,
  ChevronRight,
  CloudSun,
  Cpu,
  Crosshair,
  LocateFixed,
  Gauge,
  Globe2,
  Hexagon,
  Instagram,
  KeyRound,
  Layers3,
  Mail,
  MapPin,
  Mic,
  MicOff,
  MoreHorizontal,
  Navigation,
  Radio,
  Radar,
  RefreshCw,
  ScanLine,
  Settings,
  Send,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Terminal,
  TimerReset,
  Volume2,
  Wifi,
  X,
  Zap,
} from "lucide-react";

type VoiceState = "idle" | "listening" | "processing" | "responded";
type ActivityTone = "cyan" | "amber" | "muted" | "red";

type ActivityItem = {
  time: string;
  title: string;
  detail: string;
  tone: ActivityTone;
};

type NewsItem = {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
};

type SpeechResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechEventLike = {
  results: { length: number; [index: number]: SpeechResultLike };
  resultIndex?: number;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type LiveContext = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  place: string;
  region: string;
  country: string;
  timezone: string;
  elevation: number | null;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  cloudCover: number;
  weatherLabel: string;
  isDay: boolean;
  updatedAt: string;
};

type CameraState = "off" | "requesting" | "live" | "analyzing";
type ThreatLevel = "LOW" | "GUARDED" | "ELEVATED" | "UNKNOWN";

type ThreatResult = {
  level: ThreatLevel;
  summary: string;
  observations: string[];
  objects: DetectedObject[];
  action: string;
  analyzedAt: string;
};

type DetectedObject = {
  label: string;
  confidence: number;
};

type ObjectModel = {
  detect: (input: HTMLVideoElement, maxNumBoxes?: number, minScore?: number) => Promise<Array<{ class: string; score: number }>>;
};

const initialActivity: ActivityItem[] = [
  { time: "17:08:41", title: "Neural mesh synchronized", detail: "All cognitive clusters nominal", tone: "cyan" },
  { time: "17:08:34", title: "Perimeter sweep complete", detail: "0 anomalies detected in local grid", tone: "muted" },
  { time: "17:08:12", title: "Telemetry uplink stable", detail: "Encrypted channel · 48 ms latency", tone: "cyan" },
  { time: "17:07:56", title: "Thermal load rising", detail: "Cooling array compensating at 72%", tone: "amber" },
];

const quickCommands = ["Run a system scan", "Open mission telemetry", "Check suit diagnostics"];

const voiceLanguages = [
  ["auto", "Auto detect"],
  ["en-US", "English"], ["hi-IN", "हिन्दी"], ["ml-IN", "മലയാളം"], ["ta-IN", "தமிழ்"], ["te-IN", "తెలుగు"], ["kn-IN", "ಕನ್ನಡ"], ["bn-IN", "বাংলা"], ["mr-IN", "मराठी"], ["gu-IN", "ગુજરાતી"], ["pa-IN", "ਪੰਜਾਬੀ"],
  ["es-ES", "Español"], ["fr-FR", "Français"], ["de-DE", "Deutsch"], ["it-IT", "Italiano"], ["pt-BR", "Português"],
  ["ru-RU", "Русский"], ["ar-SA", "العربية"], ["ja-JP", "日本語"], ["ko-KR", "한국어"], ["zh-CN", "中文"],
] as const;

const detectedLanguageLocales: Record<string, string> = {
  english: "en-US", hindi: "hi-IN", malayalam: "ml-IN", tamil: "ta-IN", telugu: "te-IN", kannada: "kn-IN", bengali: "bn-IN", bangla: "bn-IN", marathi: "mr-IN", gujarati: "gu-IN", punjabi: "pa-IN", spanish: "es-ES", french: "fr-FR", german: "de-DE", italian: "it-IT", portuguese: "pt-BR", russian: "ru-RU", arabic: "ar-SA", japanese: "ja-JP", korean: "ko-KR", chinese: "zh-CN", mandarin: "zh-CN",
};

function formatTime(date: Date, timeZone?: string) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone });
}

function MiniBars({ values, tone = "cyan" }: { values: number[]; tone?: "cyan" | "amber" }) {
  return (
    <div className={`mini-bars ${tone}`} aria-hidden="true">
      {values.map((value, index) => (
        <i key={`${value}-${index}`} style={{ height: `${value}%` }} />
      ))}
    </div>
  );
}

function Panel({
  label,
  eyebrow,
  children,
  className = "",
  accent = "cyan",
}: {
  label: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  accent?: "cyan" | "amber";
}) {
  return (
    <section className={`hud-panel accent-${accent} ${className}`}>
      <div className="panel-header">
        <div>
          {eyebrow && <span className="panel-eyebrow">{eyebrow}</span>}
          <h2>{label}</h2>
        </div>
        <MoreHorizontal size={16} strokeWidth={1.5} />
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [command, setCommand] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState("Systems nominal. Awaiting your command, sir.");
  const [activity, setActivity] = useState(initialActivity);
  const [transcript, setTranscript] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState(() => {
    return "auto";
  });
  const [handsFree, setHandsFree] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [customApiEnabled, setCustomApiEnabled] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState("https://api.openai.com/v1");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customApiModel, setCustomApiModel] = useState("gpt-4o-mini");
  const [customApiStatus, setCustomApiStatus] = useState("No custom API configured. Keys stay in this browser session only.");
  const [liveContext, setLiveContext] = useState<LiveContext | null>(null);
  const [contextStatus, setContextStatus] = useState<"idle" | "locating" | "ready" | "denied">("idle");
  const [locationPrecision, setLocationPrecision] = useState<"precise" | "approximate">("precise");
  const [locationPermission, setLocationPermission] = useState<"unknown" | "prompt" | "granted" | "denied">("unknown");
  const [cameraState, setCameraState] = useState<CameraState>("off");
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [cameraAutoScan, setCameraAutoScan] = useState(false);
  const [objectModelState, setObjectModelState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [threatResult, setThreatResult] = useState<ThreatResult | null>(null);
  const [liveNews, setLiveNews] = useState<NewsItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const handsFreeRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const pendingCommandRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const wakeWordRef = useRef("jarvis");
  const locationWatchRef = useRef<number | null>(null);
  const networkRefreshRef = useRef<number | null>(null);
  const liveRefreshRef = useRef<number | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);
  const announcedNewsRef = useRef<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const voiceRetryRef = useRef<number | null>(null);
  const speechLanguageRef = useRef("auto");
  const detectedLanguageRef = useRef("auto");
  const autoRecorderRef = useRef<MediaRecorder | null>(null);
  const autoRecorderStreamRef = useRef<MediaStream | null>(null);
  const autoRecorderTimerRef = useRef<number | null>(null);
  const objectModelRef = useRef<ObjectModel | null>(null);
  const objectModelLoadingRef = useRef<Promise<ObjectModel> | null>(null);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    let permissionStatus: PermissionStatus | undefined;
    if (!navigator.permissions?.query) return;
    void navigator.permissions.query({ name: "geolocation" }).then((status) => {
      permissionStatus = status;
      setLocationPermission(status.state);
      status.onchange = () => setLocationPermission(status.state);
    }).catch(() => undefined);
    return () => { if (permissionStatus) permissionStatus.onchange = null; };
  }, []);

  useEffect(() => {
    const armOnInteraction = () => {
      if (recognitionRef.current) return;
      handsFreeRef.current = true;
      setHandsFree(true);
      if (voiceStateRef.current !== "listening") startListening();
    };
    window.addEventListener("pointerdown", armOnInteraction);
    return () => window.removeEventListener("pointerdown", armOnInteraction);
  }, []);

  function recordActivity(title: string, detail: string, tone: ActivityTone = "cyan") {
    setActivity((items): ActivityItem[] => [
      { time: formatTime(new Date()), title, detail, tone },
      ...items,
    ].slice(0, 5));
  }

  function weatherLabelForCode(code: number) {
    if (code === 0) return "Clear sky";
    if ([1, 2, 3].includes(code)) return "Partly cloudy";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Variable conditions";
  }

  async function loadLiveContext(position: GeolocationPosition, announce = false, precision: "precise" | "approximate" = "precise"): Promise<boolean> {
    const { latitude, longitude, accuracy, altitude } = position.coords;
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,is_day&timezone=auto`;
      const placeUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const [weatherResponse, placeResponse] = await Promise.all([fetch(weatherUrl), fetch(placeUrl)]);
      if (!weatherResponse.ok || !placeResponse.ok) throw new Error("context lookup failed");
      const weather = await weatherResponse.json() as { timezone?: string; elevation?: number; current?: { temperature_2m?: number; apparent_temperature?: number; relative_humidity_2m?: number; weather_code?: number; cloud_cover?: number; wind_speed_10m?: number; is_day?: number } };
      const place = await placeResponse.json() as { locality?: string; city?: string; principalSubdivision?: string; countryName?: string };
      const current = weather.current ?? {};
      const nextContext: LiveContext = {
        latitude,
        longitude,
        accuracy,
        altitude: altitude ?? null,
        place: place.locality || place.city || "Current position",
        region: place.principalSubdivision || "",
        country: place.countryName || "",
        timezone: weather.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        elevation: typeof weather.elevation === "number" ? weather.elevation : altitude ?? null,
        temperature: current.temperature_2m ?? 0,
        apparentTemperature: current.apparent_temperature ?? current.temperature_2m ?? 0,
        humidity: current.relative_humidity_2m ?? 0,
        windSpeed: current.wind_speed_10m ?? 0,
        cloudCover: current.cloud_cover ?? 0,
        weatherLabel: weatherLabelForCode(current.weather_code ?? -1),
        isDay: current.is_day === 1,
        updatedAt: formatTime(new Date()),
      };
      setLiveContext(nextContext);
      setContextStatus("ready");
      setLocationPrecision(precision);
      recordActivity("Live context synchronized", `${nextContext.place}, ${nextContext.country} · ${nextContext.weatherLabel} · ${Math.round(nextContext.temperature)}°`, "cyan");
      if (announce) speakResponse(`Live context is online. You are near ${nextContext.place}, ${nextContext.region}. It is ${Math.round(nextContext.temperature)} degrees with ${nextContext.weatherLabel.toLowerCase()}, and the position accuracy is ${Math.round(nextContext.accuracy)} meters.`);
      return true;
    } catch {
      setContextStatus("denied");
      recordActivity("Context lookup unavailable", "Location was received, but weather or geography enrichment failed", "amber");
      if (announce) speakResponse("I received your location, but live weather and geographic enrichment are temporarily unavailable.");
      return false;
    }
  }

  async function loadApproximateNetworkContext(announce = true) {
    try {
      const response = await fetch("https://ipwho.is/");
      if (!response.ok) throw new Error("network location unavailable");
      const network = await response.json() as { success?: boolean; latitude?: number; longitude?: number; city?: string; region?: string; country?: string };
      if (network.success === false || typeof network.latitude !== "number" || typeof network.longitude !== "number") throw new Error("network coordinates unavailable");
      const approximatePosition = { coords: { latitude: network.latitude, longitude: network.longitude, accuracy: 5_000, altitude: null } } as GeolocationPosition;
      if (!await loadLiveContext(approximatePosition, false, "approximate")) throw new Error("network context enrichment unavailable");
      recordActivity("Approximate location online", `${network.city || "Network region"}, ${network.region || network.country || "unknown"} · weather refresh active`, "amber");
      if (announce) speakResponse(`Precise GPS access is blocked, so I’m using an approximate network location near ${network.city || network.region || "your current region"}. Weather and regional context will continue refreshing.`);
      if (networkRefreshRef.current === null) networkRefreshRef.current = window.setInterval(() => { void loadApproximateNetworkContext(false); }, 60_000);
    } catch {
      setContextStatus("denied");
      recordActivity("Location access unavailable", "Allow browser location or enable device location services", "amber");
      if (announce) speakResponse("Precise location is blocked and the approximate network fallback is unavailable. Allow location for this site, then press Grant access again.");
    }
  }

  async function refreshLiveNews(announceImportant = false) {
    if (!liveContext) return;
    try {
      const params = new URLSearchParams({ place: liveContext.place, region: liveContext.region, country: liveContext.country, latitude: String(liveContext.latitude), longitude: String(liveContext.longitude) });
      const response = await fetch(`/api/live/news?${params.toString()}`);
      if (!response.ok) throw new Error("live news unavailable");
      const payload = await response.json() as { items?: NewsItem[] };
      const items = Array.isArray(payload.items) ? payload.items : [];
      setLiveNews(items);
      const urgent = items.find((item) => /breaking|emergency|earthquake|tsunami|wildfire|storm|flood|evacuation|terror|attack|major outage/i.test(item.title) && !announcedNewsRef.current.has(item.link));
      if (announceImportant && urgent) {
        announcedNewsRef.current.add(urgent.link);
        recordActivity("Priority live update", `${urgent.source}: ${urgent.title}`, "amber");
        speakResponse(`Priority update from ${urgent.source}. ${urgent.title}`);
      }
    } catch {
      recordActivity("Live news link unavailable", "Weather and location remain active", "muted");
    }
  }

  function openGoogleMaps() {
    if (!liveContext) {
      speakResponse("Enable precise live location first, then I can open Google Maps at your current coordinates.");
      return;
    }
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${liveContext.latitude},${liveContext.longitude}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
    recordActivity("Google Maps opened", `${liveContext.latitude.toFixed(5)}, ${liveContext.longitude.toFixed(5)}`, "cyan");
    speakResponse("Opening Google Maps at your current live position.");
  }

  function enableLiveContext() {
    if (!navigator.geolocation) {
      setContextStatus("denied");
      speakResponse("This browser does not expose geolocation access. I can still answer general questions without live coordinates.");
      return;
    }
    if (locationWatchRef.current !== null || contextStatus === "locating") return;
    setContextStatus("locating");
    recordActivity("Location permission requested", "Waiting for operator approval", "amber");
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 };
    const handleError = (error: GeolocationPositionError, initialRequest: boolean) => {
      if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
      setContextStatus("denied");
      if (error.code === 1) setLocationPermission("denied");
      if (error.code === 1 || error.code === 2 || error.code === 3) {
        void loadApproximateNetworkContext(initialRequest);
        return;
      }
      const message = error.code === 1
        ? "Location permission is blocked. Allow location for this site in your browser address-bar settings, then press Grant access again."
        : error.code === 3
          ? "Location lookup timed out. Check that device location services are enabled, then retry."
          : "The browser could not resolve your current location. Please retry when a location signal is available.";
      recordActivity(initialRequest ? "Location access denied" : "Location stream interrupted", message, "amber");
      if (initialRequest) speakResponse(message);
    };
    navigator.geolocation.getCurrentPosition((position) => {
      if (networkRefreshRef.current !== null) window.clearInterval(networkRefreshRef.current);
      networkRefreshRef.current = null;
      lastPositionRef.current = position;
      setLocationPermission("granted");
      void loadLiveContext(position, true, "precise");
      if (liveRefreshRef.current !== null) window.clearInterval(liveRefreshRef.current);
      liveRefreshRef.current = window.setInterval(() => { if (lastPositionRef.current) void loadLiveContext(lastPositionRef.current, false); }, 60_000);
      locationWatchRef.current = navigator.geolocation.watchPosition((nextPosition) => { lastPositionRef.current = nextPosition; void loadLiveContext(nextPosition, false, "precise"); }, (error) => handleError(error, false), options);
    }, (error) => handleError(error, true), options);
  }

  function disableLiveContext() {
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
    if (networkRefreshRef.current !== null) window.clearInterval(networkRefreshRef.current);
    locationWatchRef.current = null;
    networkRefreshRef.current = null;
    if (liveRefreshRef.current !== null) window.clearInterval(liveRefreshRef.current);
    liveRefreshRef.current = null;
    lastPositionRef.current = null;
    setLiveContext(null);
    setContextStatus("idle");
    setLocationPrecision("precise");
    setLiveNews([]);
    speakResponse("Live location and weather access have been disabled. No position will be retained in this interface.");
  }

  async function loadObjectModel() {
    if (objectModelRef.current) return objectModelRef.current;
    if (objectModelLoadingRef.current) return objectModelLoadingRef.current;
    setObjectModelState("loading");
    objectModelLoadingRef.current = (async () => {
      const [cocoSsd, tf] = await Promise.all([import("@tensorflow-models/coco-ssd"), import("@tensorflow/tfjs")]);
      try { await tf.setBackend("webgl"); } catch { /* CPU fallback below */ }
      await tf.ready();
      const model = await cocoSsd.load({ base: "mobilenet_v2" });
      objectModelRef.current = model;
      setObjectModelState("ready");
      return model;
    })();
    try {
      return await objectModelLoadingRef.current;
    } catch (error) {
      setObjectModelState("error");
      throw error;
    } finally {
      objectModelLoadingRef.current = null;
    }
  }

  async function toggleCamera() {
    if (cameraState === "live" || cameraState === "analyzing" || cameraState === "requesting") {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraAutoScan(false);
      setCameraState("off");
      setMicrophoneReady(false);
      setThreatResult(null);
      speakResponse("Camera access disabled. The visual channel is offline.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      speakResponse("Camera access is not available in this browser. I can still use voice, location, and weather context.");
      return;
    }
    setCameraState("requesting");
    try {
      const videoConstraints = { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } };
      let stream: MediaStream;
      let hasMicrophone = false;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        hasMicrophone = stream.getAudioTracks().length > 0;
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      }
      stream.getAudioTracks().forEach((track) => track.stop());
      cameraStreamRef.current = new MediaStream(stream.getVideoTracks());
      setMicrophoneReady(hasMicrophone);
      setCameraAutoScan(true);
      handsFreeRef.current = true;
      setHandsFree(true);
      setCameraState("live");
      if (!hasMicrophone) {
        recordActivity("Camera online · microphone blocked", "Visual channel remains active; allow microphone for automatic speech replies", "amber");
      }
      recordActivity("Camera online", hasMicrophone ? "Visual channel online · microphone permission ready · voice channel armed" : "Visual channel online · voice channel waiting for microphone permission", hasMicrophone ? "cyan" : "amber");
      if (handsFreeRef.current && !recognitionRef.current) startListening();
      speakResponse(hasMicrophone ? "Camera is live and the microphone is ready for automatic background speech replies. Local object recognition is loading now." : "Camera is live, but microphone access needs to be enabled in the browser site settings. Use the Enable microphone control, then I’ll resume listening.");
      void loadObjectModel().then(() => setAssistantMessage("Local object recognition online. Automatic scene analysis is active."));
    } catch {
      setCameraState("off");
      recordActivity("Camera access denied", "Visual channel remains offline", "amber");
      speakResponse("Camera access was not granted. No visual data was captured.");
    }
  }

  async function analyzeCameraFrame(announce = true) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || cameraState !== "live" || video.videoWidth === 0) {
      if (cameraState === "live" && video && video.videoWidth === 0) {
        setAssistantMessage("Waiting for the camera sensor to deliver its first live frame…");
        window.setTimeout(() => { void analyzeCameraFrame(announce); }, 700);
      } else if (announce) speakResponse("The visual channel is not ready. Enable the camera and wait for a live frame first.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCameraState("analyzing");
    setAssistantMessage("Analyzing the live frame for recognizable objects and environmental cues…");
    try {
      const model = await loadObjectModel();
      const predictions = await model.detect(video, 20, 0.18);
      const objects = predictions
        .filter((prediction) => prediction.score >= 0.18)
        .sort((left, right) => right.score - left.score)
        .slice(0, 8)
        .map((prediction) => ({ label: prediction.class, confidence: prediction.score }));
      const objectSummary = objects.length > 0
        ? `Recognized ${objects.slice(0, 4).map((object) => `${object.label} at ${Math.round(object.confidence * 100)} percent`).join(", ")}.`
        : "No supported objects were confidently recognized in this frame.";
      const normalizedResult: ThreatResult = {
        level: objects.length > 0 ? "LOW" : "UNKNOWN",
        summary: objectSummary,
        observations: objects.map((object) => `${object.label} · ${Math.round(object.confidence * 100)}% confidence`),
        objects,
        action: objects.length > 0 ? "Object recognition is informational; verify anything important directly." : "Improve lighting or move the camera closer to the subject for a stronger match.",
        analyzedAt: formatTime(new Date()),
      };
      setThreatResult(normalizedResult);
      setCameraState("live");
      recordActivity(`Objects identified · ${objects.length}`, normalizedResult.summary, objects.length > 0 ? "cyan" : "amber");
      if (announce) speakResponse(objects.length > 0 ? `${normalizedResult.summary} ${normalizedResult.action}` : normalizedResult.action);
      else setAssistantMessage(`${objects.length} object${objects.length === 1 ? "" : "s"} identified. ${normalizedResult.summary}`);
    } catch {
      setCameraState("live");
      recordActivity("Vision analysis unavailable", "The frame was not retained", "amber");
      if (announce) speakResponse("The local object model is not ready yet. Keep the camera on for a moment and I’ll retry automatically.");
    }
  }

  async function requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      speakResponse("This browser does not provide microphone access.");
      return;
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      audioStream.getTracks().forEach((track) => track.stop());
      setMicrophoneReady(true);
      handsFreeRef.current = true;
      setHandsFree(true);
      recordActivity("Microphone online", "Noise suppression and echo cancellation enabled for voice chat", "cyan");
      setAssistantMessage("Microphone online. Voice chat is listening now.");
      startListening();
    } catch {
      setMicrophoneReady(false);
      recordActivity("Microphone permission blocked", "Open the browser site settings and set Microphone to Allow", "amber");
      speakResponse("Microphone access is still blocked by the browser. Open this site’s settings, set Microphone to Allow, then press Enable microphone again.");
    }
  }

  function toggleCameraAutoScan() {
    if (cameraState !== "live") {
      speakResponse("Enable the camera first, then I can analyze a new frame every eight seconds.");
      return;
    }
    const next = !cameraAutoScan;
    setCameraAutoScan(next);
    speakResponse(next ? "Continuous visual advisory enabled. I’ll analyze a new frame every eight seconds." : "Continuous visual advisory disabled. Analysis is now on demand.");
  }

  function liveContextSummary() {
    if (!liveContext) return "Live location is offline. Enable live context access for real-time coordinates, weather, and geographic features.";
    return `You are near ${liveContext.place}, ${liveContext.region}, ${liveContext.country}. Coordinates ${liveContext.latitude.toFixed(4)}, ${liveContext.longitude.toFixed(4)}, accuracy ${Math.round(liveContext.accuracy)} meters. It is ${Math.round(liveContext.temperature)} degrees, feels like ${Math.round(liveContext.apparentTemperature)}, ${liveContext.weatherLabel.toLowerCase()}, humidity ${liveContext.humidity} percent, wind ${Math.round(liveContext.windSpeed)} kilometers per hour, ${liveContext.cloudCover} percent cloud cover.`;
  }

  function speakResponse(text: string) {
    setAssistantMessage(text);
    setVoiceState("processing");

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setVoiceState("responded");
      if (handsFreeRef.current && !recognitionRef.current) setTimeout(startListening, 250);
      return;
    }

    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 0.88;
    utterance.volume = 0.94;
    const activeLanguage = speechLanguageRef.current;
    utterance.lang = activeLanguage === "auto" ? navigator.language : activeLanguage;
    const preferredVoice = activeLanguage !== "auto" && (window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase() === activeLanguage.toLowerCase())
      || window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith(activeLanguage.slice(0, 2).toLowerCase())));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setVoiceState("responded");
      if (handsFreeRef.current && !recognitionRef.current) window.setTimeout(startListening, 250);
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setVoiceState("responded");
      if (handsFreeRef.current && !recognitionRef.current) window.setTimeout(startListening, 250);
    };
    window.speechSynthesis.speak(utterance);
    if (handsFreeRef.current) window.setTimeout(() => { if (handsFreeRef.current && !recognitionRef.current) startListening(); }, 120);
  }

  async function askIntelligence(message: string, fallback: string, languageHint = detectedLanguageRef.current) {
    setVoiceState("processing");
    setAssistantMessage(`I heard you: “${message}” · thinking through the tactical core…`);
    const useCustomApi = customApiEnabled && customApiKey.trim().length > 0;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(useCustomApi ? "/api/custom-ai/respond" : "/api/ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useCustomApi ? { apiUrl: customApiUrl, apiKey: customApiKey, model: customApiModel, message, context: liveContextSummary(), language: languageHint } : { message, context: liveContextSummary(), language: languageHint }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("intelligence unavailable");
      const payload = await response.json() as { response?: string };
      const answer = payload.response?.trim();
      if (!answer) throw new Error("empty intelligence response");
      recordActivity("Neural response", answer, "cyan");
      setAssistantMessage(answer);
      speakResponse(answer);
    } catch {
      if (useCustomApi) {
        try {
          const managedResponse = await fetch("/api/ai/respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, context: liveContextSummary(), language: languageHint }),
            signal: controller.signal,
          });
          const managedPayload = await managedResponse.json() as { response?: string };
          const managedAnswer = managedPayload.response?.trim();
          if (managedResponse.ok && managedAnswer) {
            recordActivity("Managed fallback response", managedAnswer, "amber");
            speakResponse(managedAnswer);
            return;
          }
        } catch { /* The local response below remains the final fallback. */ }
      }
      recordActivity("Local fallback response", fallback, "amber");
      setAssistantMessage(fallback);
      speakResponse(fallback);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function scheduleVoiceRetry(delay = 700) {
    if (voiceRetryRef.current !== null) window.clearTimeout(voiceRetryRef.current);
    voiceRetryRef.current = window.setTimeout(() => {
      voiceRetryRef.current = null;
      if (handsFreeRef.current && !recognitionRef.current) startListening();
    }, delay);
  }

  async function importApiConfig(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        const config = JSON.parse(text) as { apiKey?: string; apiUrl?: string; baseUrl?: string; model?: string; OPENAI_API_KEY?: string; OPENAI_BASE_URL?: string };
        setCustomApiKey(config.apiKey || config.OPENAI_API_KEY || "");
        setCustomApiUrl(config.apiUrl || config.baseUrl || config.OPENAI_BASE_URL || customApiUrl);
        if (config.model) setCustomApiModel(config.model);
      } else {
        const readEnv = (name: string) => text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*["']?([^"'\\n]+)`, "mi"))?.[1]?.trim() || "";
        setCustomApiKey(readEnv("OPENAI_API_KEY") || readEnv("API_KEY"));
        setCustomApiUrl(readEnv("OPENAI_BASE_URL") || readEnv("API_URL") || customApiUrl);
        setCustomApiModel(readEnv("OPENAI_MODEL") || readEnv("MODEL") || customApiModel);
      }
      setCustomApiStatus(`Loaded ${file.name}. Review the fields, then test the connection.`);
    } catch {
      setCustomApiStatus("Could not read that file. Use a JSON or .env file with API key, base URL, and model fields.");
    } finally {
      event.target.value = "";
    }
  }

  async function testCustomApi() {
    if (!customApiKey.trim()) { setCustomApiStatus("Enter an API key or upload a configuration file first."); return; }
    setCustomApiStatus("Testing custom API connection…");
    try {
      const response = await fetch("/api/custom-ai/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiUrl: customApiUrl, apiKey: customApiKey, model: customApiModel, message: "Reply with exactly: Custom API connected.", language: "en-US" }) });
      const payload = await response.json() as { response?: string; error?: string };
      if (!response.ok || !payload.response) throw new Error(payload.error || "connection failed");
      setCustomApiEnabled(true);
      setCustomApiStatus("Connected. New Jarvis answers will use this custom API for this browser session.");
      speakResponse("Custom API connected successfully.");
    } catch (error) {
      setCustomApiStatus(`Custom API test failed: ${error instanceof Error ? error.message : "check the URL, key, and model"}`);
    }
  }

  async function startAutoTranscription() {
    if (autoRecorderRef.current || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      autoRecorderStreamRef.current = stream;
      autoRecorderRef.current = recorder;
      setVoiceState("listening");
      setTranscript("");
      setAssistantMessage("Listening in automatic language mode. Speak naturally in any supported language.");
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => {
        autoRecorderRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        setVoiceState("idle");
        setAssistantMessage("Automatic language capture was interrupted. I’ll retry the microphone.");
        scheduleVoiceRetry(700);
      };
      recorder.onstop = async () => {
        autoRecorderRef.current = null;
        autoRecorderStreamRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        if (!chunks.length) { scheduleVoiceRetry(350); return; }
        setVoiceState("processing");
        setAssistantMessage("Detecting language and transcribing your question…");
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
          const audio = btoa(binary);
          const response = await fetch("/api/speech/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio, mimeType }) });
          if (!response.ok) throw new Error("transcription unavailable");
          const payload = await response.json() as { text?: string; language?: string };
          const text = payload.text?.trim();
          if (!text) throw new Error("empty transcript");
          setTranscript(text);
          if (payload.language) {
            const languageKey = payload.language.toLowerCase().trim();
            const detectedLocale = detectedLanguageLocales[languageKey] || (languageKey.length === 2 ? detectedLanguageLocales[Object.keys(detectedLanguageLocales).find((key) => detectedLanguageLocales[key].startsWith(languageKey)) || ""] : undefined);
            const matching = voiceLanguages.find(([code]) => code === detectedLocale);
            detectedLanguageRef.current = detectedLocale || payload.language;
            if (matching) { speechLanguageRef.current = matching[0]; setSpeechLanguage(matching[0]); }
          }
          pendingCommandRef.current = false;
          executeCommand(text);
        } catch {
          setVoiceState("idle");
          setAssistantMessage("Automatic transcription was unavailable. Choose a voice language for browser recognition, or try again.");
          scheduleVoiceRetry(1000);
        }
      };
      recorder.start();
      autoRecorderTimerRef.current = window.setTimeout(() => {
        autoRecorderTimerRef.current = null;
        if (autoRecorderRef.current === recorder && recorder.state === "recording") recorder.stop();
      }, 6000);
    } catch {
      setVoiceState("idle");
      setAssistantMessage("Microphone access is required for automatic language detection.");
      scheduleVoiceRetry(1500);
    }
  }

  function startListening() {
    if (speechLanguageRef.current === "auto") {
      void startAutoTranscription();
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceSupported(false);
      speakResponse("Voice recognition is not available in this browser. You can still type commands into the console.");
      return;
    }
    if (recognitionRef.current) return;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = speechLanguageRef.current;
    recognition.onstart = () => {
      setTranscript("");
      setVoiceState("listening");
      setAssistantMessage("Listening. Ask your question naturally.");
    };
    recognition.onresult = (event) => {
      const index = typeof event.resultIndex === "number" ? event.resultIndex : event.results.length - 1;
      const result = event.results[index];
      if (!result) return;
      const spokenText = result[0].transcript.trim();
      if (isSpeakingRef.current && spokenText.length >= 2) {
        isSpeakingRef.current = false;
        window.speechSynthesis?.cancel();
        setAssistantMessage("I heard you. Response interrupted — listening now.");
        recordActivity("Barge-in detected", spokenText, "amber");
      }
      setTranscript(spokenText);
      if (!result.isFinal) return;
      const wake = wakeWordRef.current.toLowerCase();
      const wakeIndex = spokenText.toLowerCase().indexOf(wake);
      const commandText = wakeIndex >= 0 ? spokenText.slice(wakeIndex + wake.length).replace(/^[\s,.:;-]+/, "").trim() : spokenText;
      pendingCommandRef.current = true;
      setVoiceState("processing");
      setAssistantMessage(commandText ? `I heard: “${commandText}” · preparing your answer…` : "I heard you. Preparing a response…");
      recognition.stop();
      window.setTimeout(() => {
        pendingCommandRef.current = false;
        if (commandText) executeCommand(commandText);
        else speakResponse("I heard you. Please continue with your question.");
      }, 100);
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      if (event.error === "aborted" || event.error === "no-speech") {
        if (handsFreeRef.current && !pendingCommandRef.current) scheduleVoiceRetry(250);
        return;
      }
      handsFreeRef.current = true;
      setHandsFree(true);
      setVoiceState("idle");
      if (event.error === "aborted" && pendingCommandRef.current) return;
      const message = event.error === "not-allowed"
        ? "Microphone access is blocked. Allow microphone access to use the voice channel."
        : event.error === "audio-capture"
          ? "No microphone was detected. Connect a microphone and I’ll resume listening."
          : event.error === "network"
            ? "Speech recognition lost its network link. I’ll keep retrying the voice channel."
            : "Voice input is reconnecting. I’ll keep listening for your next question.";
      setAssistantMessage(message);
      recordActivity("Voice channel reconnecting", message, "amber");
      scheduleVoiceRetry(event.error === "not-allowed" || event.error === "service-not-allowed" ? 5000 : 1000);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (handsFreeRef.current && !pendingCommandRef.current) scheduleVoiceRetry(350);
      else if (voiceStateRef.current === "listening") setVoiceState("idle");
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceState("idle");
      setAssistantMessage("Reconnecting the voice channel…");
      scheduleVoiceRetry(500);
    }
  }

  function toggleVoice() {
    if (voiceState === "listening") {
      setAssistantMessage("Always-on voice is active. Say “Jarvis” followed by your command.");
      return;
    }
    if (voiceState === "processing") {
      window.speechSynthesis?.cancel();
      handsFreeRef.current = true;
      setHandsFree(true);
      setAssistantMessage("Response stopped. Always-on voice is still listening for “Jarvis”.");
      if (!recognitionRef.current) startListening();
      return;
    }
    handsFreeRef.current = true;
    setHandsFree(true);
    startListening();
  }

  function toggleHandsFree() {
    handsFreeRef.current = true;
    setHandsFree(true);
    if (voiceState === "idle" || !recognitionRef.current) startListening();
    else speakResponse("Always-on voice is already armed. Say Jarvis followed by your command.");
  }

  function executeCommand(rawCommand = command) {
    pendingCommandRef.current = false;
    const trimmed = rawCommand.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    const normalized = trimmed.toLowerCase();
    const isScan = normalized.includes("scan") || normalized.includes("diagnostic") || normalized.includes("check systems");
    const isStatus = normalized.includes("status") || normalized.includes("how are you") || normalized.includes("report");
    const isTelemetry = normalized.includes("telemetry") || normalized.includes("mission") || normalized.includes("objective");
    const isPower = normalized.includes("power") || normalized.includes("energy") || normalized.includes("battery");
    const isEnvironment = normalized.includes("environment") || normalized.includes("weather") || normalized.includes("temperature");
    const isLocation = normalized.includes("where am i") || normalized.includes("location") || normalized.includes("coordinate") || normalized.includes("geograph") || normalized.includes("nearby") || normalized.includes("map");
    const isMaps = normalized.includes("google maps") || normalized.includes("open map") || normalized.includes("directions");
    const isNews = normalized.includes("news") || normalized.includes("headlines") || normalized.includes("updates");
    const isCamera = normalized.includes("camera") || normalized.includes("visual") || normalized.includes("look through") || normalized.includes("analyze frame");
    const isThreat = normalized.includes("threat") || normalized.includes("hazard") || normalized.includes("danger") || normalized.includes("safe");
    const isCreator = normalized.includes("who created you") || normalized.includes("who made you") || normalized.includes("your creator") || normalized.includes("who built you");
    const isIdentity = normalized.includes("who are you") || normalized.includes("what can you do") || normalized.includes("hello") || normalized.includes("hi jarvis");
    const isStop = normalized.includes("stop talking") || normalized.includes("be quiet") || normalized === "silence";

    let response = `Acknowledged. I’ve routed “${trimmed}” through the tactical intelligence core.`;
    if (isScan) response = "Initiating a full systems diagnostic. I’ll report back when the scan is complete.";
    else if (isStatus) response = "All systems are operational. Suit integrity is 98.4 percent, power reserve is 76 percent, and the network link is stable at 48 milliseconds.";
    else if (isTelemetry) response = "Mission telemetry is nominal. The active objective is Protect the Future, with vital signs stable and the tactical uplink encrypted.";
    else if (isPower) response = "Power reserve is at 76 percent. The arc reactor is online with an estimated five point four hours of active capacity.";
    else if (isEnvironment) response = "The local environment is clear at 22 degrees. Air quality is good, humidity is 41 percent, and wind is eight kilometers per hour.";
    else if (isMaps) response = "I’ll open Google Maps at your current live position.";
    else if (isNews) response = liveNews[0] ? `${liveNews[0].source} reports: ${liveNews[0].title}` : "The live news feed is not ready yet. Enable live context so I can load location-aware headlines.";
    else if (isLocation) response = liveContextSummary();
    else if (isCamera || isThreat) response = cameraState === "live" ? "Visual channel online. I’m analyzing the newest frame for visible hazards and environmental cues." : "The camera is offline. Enable camera access before requesting a visual threat advisory.";
    else if (isCreator) response = "I was created by Vignesh P. Instagram: vignesh_pgd. Email: vigneshperingode352@gmail.com or cybrogofficial@gmail.com.";
    else if (isIdentity) response = "I am your tactical intelligence core. I was created by Vignesh P, and I can listen, speak, scan systems, interpret telemetry, monitor the environment, and route your next action.";

    recordActivity("Command executed", trimmed, isScan ? "amber" : "cyan");
    setTranscript(trimmed);
    setCommand("");
    if (isScan) {
      setScanProgress(0);
      setIsScanning(true);
    }
    if ((isCamera || isThreat) && cameraState === "live") {
      void analyzeCameraFrame();
      return;
    }
    if (isStop) {
      window.speechSynthesis?.cancel();
      setVoiceState("responded");
      setAssistantMessage("Voice output paused. I’m still listening for commands.");
      return;
    }
    if (isCreator) {
      speakResponse(response);
      return;
    }
    if (isMaps) {
      openGoogleMaps();
      return;
    }
    void askIntelligence(trimmed, response);
  }

  function startScan() {
    setScanProgress(0);
    setIsScanning(true);
    recordActivity("Diagnostic scan started", "Scanning suit telemetry, local mesh, and perimeter sensors", "amber");
    speakResponse("Scanning suit telemetry, local mesh, and perimeter sensors now.");
  }

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    const interval = window.setInterval(() => {
      setScanProgress((current) => {
        if (current >= 100) {
          window.clearInterval(interval);
          setIsScanning(false);
          recordActivity("System scan complete", "No critical anomalies detected", "cyan");
          speakResponse("Scan complete. No critical anomalies detected. All critical systems remain nominal.");
          return 100;
        }
        return Math.min(current + 4, 100);
      });
    }, 120);
    return () => window.clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    if (!videoRef.current || !cameraStreamRef.current) return;
    const video = videoRef.current;
    video.srcObject = cameraStreamRef.current;
    video.onloadedmetadata = () => { void video.play().catch(() => undefined); };
    void video.play().catch(() => undefined);
    return () => { video.onloadedmetadata = null; };
  }, [cameraState]);

  useEffect(() => {
    if (!liveContext) return;
    void refreshLiveNews(true);
    const interval = window.setInterval(() => { void refreshLiveNews(true); }, 10 * 60_000);
    return () => window.clearInterval(interval);
  }, [liveContext?.latitude, liveContext?.longitude]);

  useEffect(() => {
    if (!cameraAutoScan || cameraState !== "live") return;
    const firstFrame = window.setTimeout(() => { void analyzeCameraFrame(false); }, 1_000);
    const interval = window.setInterval(() => { void analyzeCameraFrame(false); }, 8_000);
    return () => { window.clearTimeout(firstFrame); window.clearInterval(interval); };
  }, [cameraAutoScan, cameraState]);

  useEffect(() => () => {
    if (locationWatchRef.current !== null) navigator.geolocation?.clearWatch(locationWatchRef.current);
    if (networkRefreshRef.current !== null) window.clearInterval(networkRefreshRef.current);
    if (liveRefreshRef.current !== null) window.clearInterval(liveRefreshRef.current);
    if (voiceRetryRef.current !== null) window.clearTimeout(voiceRetryRef.current);
    if (autoRecorderTimerRef.current !== null) window.clearTimeout(autoRecorderTimerRef.current);
    autoRecorderRef.current?.stop();
    autoRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const timeParts = useMemo(() => formatTime(now, liveContext?.timezone).split(":"), [now, liveContext?.timezone]);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: liveContext?.timezone }).format(now).toUpperCase(), [now, liveContext?.timezone]);
  const currentHour = Number(formatTime(now, liveContext?.timezone).slice(0, 2));
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="jarvis-shell">
      <div className="ambient-grid" />
      <div className="scanline-overlay" />
      <div className="vignette" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Hexagon size={24} strokeWidth={1.25} /><span>J</span></div>
          <div>
            <div className="brand-name">JARVIS</div>
            <div className="brand-subtitle">TACTICAL INTELLIGENCE CORE <span>◈</span> V.6.4.1</div>
          </div>
        </div>
        <div className="topbar-center"><span className="status-pip" /> SECURE LOCAL INSTANCE <span className="divider">//</span> ENCRYPTED <span className={`voice-link ${voiceSupported ? "" : "offline"}`}><BrainCircuit size={13} /> VOICE LINK · {voiceSupported ? "READY" : "TEXT ONLY"}</span></div>
        <div className="topbar-actions">
          <button className="icon-button" aria-label="Notifications" onClick={() => speakResponse("There are no priority alerts. Perimeter and communications channels are stable.")}><Bell size={16} /><i /></button>
          <button className="avatar-button" aria-label="Open creator profile" onClick={() => { setCreatorOpen((isOpen) => !isOpen); speakResponse("Creator profile online. Vignesh P is the mind behind this interface."); }}>VP</button>
          {creatorOpen && <div className="creator-card"><button className="creator-close" aria-label="Close creator profile" onClick={() => setCreatorOpen(false)}><X size={14} /></button><div className="creator-card-kicker"><span className="creator-pip" /> CREATOR IDENTITY</div><div className="creator-name">VIGNESH P</div><div className="creator-role">BUILDER · OPERATOR · CYBERGO OFFICIAL</div><div className="creator-divider" /><a href="https://instagram.com/vignesh_pgd" target="_blank" rel="noreferrer"><Instagram size={14} /> @vignesh_pgd</a><a href="mailto:vigneshperingode352@gmail.com"><Mail size={14} /> vigneshperingode352@gmail.com</a><a href="mailto:cybrogofficial@gmail.com"><Mail size={14} /> cybrogofficial@gmail.com</a></div>}
        </div>
      </header>

      {providerOpen && <div className="api-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProviderOpen(false); }}>
        <section className="api-modal" role="dialog" aria-modal="true" aria-labelledby="custom-api-title">
          <div className="api-modal-header"><div><div className="panel-kicker"><KeyRound size={13} /> PROVIDER OVERRIDE</div><h2 id="custom-api-title">Connect your own API</h2><p>Use any OpenAI-compatible endpoint for Jarvis responses. Credentials remain in memory for this session and are never written to disk or local storage.</p></div><button className="creator-close" aria-label="Close custom API panel" onClick={() => setProviderOpen(false)}><X size={14} /></button></div>
          <div className="api-form-grid">
            <label>BASE URL<input value={customApiUrl} onChange={(event) => setCustomApiUrl(event.target.value)} placeholder="https://api.openai.com/v1" /></label>
            <label>MODEL<input value={customApiModel} onChange={(event) => setCustomApiModel(event.target.value)} placeholder="gpt-4o-mini" /></label>
            <label className="api-key-field">API KEY<input type="password" value={customApiKey} onChange={(event) => { setCustomApiKey(event.target.value); setCustomApiEnabled(false); }} placeholder="sk-…" autoComplete="off" /></label>
            <label className="api-upload-field">IMPORT CONFIG<input type="file" accept=".env,.txt,.json,application/json,text/plain" onChange={importApiConfig} /><span>Upload .env or JSON</span></label>
          </div>
          <div className="api-modal-footer"><span className={`api-status ${customApiEnabled ? "online" : ""}`}><span className="status-pip" /> {customApiStatus}</span><div className="api-actions"><button className="ghost-button" onClick={() => { setCustomApiEnabled(false); setCustomApiKey(""); setCustomApiStatus("Custom API disconnected. Managed Jarvis AI is active."); }}>Disconnect</button><button className="primary-button" onClick={testCustomApi}><Zap size={14} /> Test &amp; use API</button></div></div>
        </section>
      </div>}

      <div className="hud-layout">
        <aside className="left-rail">
          <div className="rail-label">SYSTEMS</div>
          <nav className="rail-nav" aria-label="System navigation">
            <button className="rail-item active" onClick={() => speakResponse("Cognitive core is active. All primary systems are visible.")}><Aperture size={18} /><span>Core</span></button>
            <button className="rail-item" onClick={() => speakResponse("Perimeter view ready. No anomalies detected across the local grid.")}><Radar size={18} /><span>Perimeter</span></button>
            <button className="rail-item" onClick={() => speakResponse("Mission telemetry is nominal. Vital signs and objective tracking are stable.")}><Layers3 size={18} /><span>Telemetry</span></button>
            <button className="rail-item" onClick={() => speakResponse("Network link is encrypted and stable at 48 milliseconds.")}><Globe2 size={18} /><span>Network</span></button>
          </nav>
          <div className="rail-spacer" />
          <div className="rail-readout"><span>LAT</span><strong>{liveContext ? `${liveContext.latitude.toFixed(4)}°` : "34.0522° N"}</strong><span>LNG</span><strong>{liveContext ? `${liveContext.longitude.toFixed(4)}°` : "118.2437° W"}</strong></div>
          <button className="rail-item rail-settings" onClick={() => setProviderOpen(true)}><KeyRound size={18} /><span>Custom API</span></button>
        </aside>

        <section className="dashboard">
          <div className="dashboard-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> PERSONAL OPERATING SYSTEM</div>
              <h1>{greeting}, <em>sir.</em></h1>
              <p>{assistantMessage}</p>
            </div>
            <div className="clock-block"><div className="clock"><span>{timeParts[0]}</span><b>:</b><span>{timeParts[1]}</span><b>:</b><span>{timeParts[2]}</span></div><div className="date-line">{dateLabel} <span>//</span> {liveContext?.place?.toUpperCase() || "LOCATION OFFLINE"}</div></div>
          </div>

          <div className="top-metrics">
            <div className="metric-card"><div className="metric-icon"><ShieldCheck size={16} /></div><div><span>SUIT INTEGRITY</span><strong>98.4<small>%</small></strong></div><MiniBars values={[42, 55, 48, 71, 62, 79, 68, 84, 74]} /></div>
            <div className="metric-card"><div className="metric-icon amber"><Zap size={16} /></div><div><span>POWER RESERVE</span><strong>76<small>%</small></strong></div><MiniBars values={[82, 72, 68, 74, 58, 64, 53, 61, 56]} tone="amber" /></div>
            <div className="metric-card"><div className="metric-icon"><Wifi size={16} /></div><div><span>NETWORK LINK</span><strong>48<small>ms</small></strong></div><MiniBars values={[30, 43, 35, 50, 39, 61, 46, 53, 48]} /></div>
          </div>

          <div className="main-grid">
            <Panel label="Cognitive core" eyebrow="PRIMARY INTERFACE" className="core-panel">
              <div className={`orbital-stage ${voiceState} ${isScanning ? "scanning" : ""}`}>
                <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
                <div className="radar-sweep" />
                <div className="target crosshair-top"><span /><i /></div><div className="target crosshair-right"><span /><i /></div><div className="target crosshair-bottom"><span /><i /></div><div className="target crosshair-left"><span /><i /></div>
                <div className="orbital-core"><div className="core-halo" /><div className="core-ring ring-a" /><div className="core-ring ring-b" /><div className="core-ring ring-c" /><div className="core-glyph"><Sparkles size={32} strokeWidth={1} /></div></div>
                <div className="orb-label orb-label-top">NEURAL LINK <b>100%</b></div><div className="orb-label orb-label-right">SYNC RATE <b>0.42ms</b></div><div className="orb-label orb-label-bottom">COGNITIVE LOAD <b>24.8%</b></div><div className="orb-label orb-label-left">THREAT LEVEL <b className="safe">LOW</b></div>
              </div>
              <div className="core-status"><div><span className="live-dot" /> CORE ONLINE</div><strong>{voiceState === "listening" ? "LISTENING" : voiceState === "processing" ? "PROCESSING" : voiceState === "responded" ? "RESPONSE READY" : isScanning ? "DIAGNOSTIC SCAN" : "AWAITING INPUT"}</strong><span>◌</span></div>
              <div className="core-actions"><button className={`voice-button ${voiceState}`} onClick={toggleVoice} aria-pressed={handsFree}><span className="voice-orbit" />{voiceState === "processing" ? <Volume2 size={18} /> : <Mic size={18} />}<span>{voiceState === "processing" ? "Speaking · still listening" : "Ask anything · voice chat"}</span></button><button className="scan-button" onClick={startScan} disabled={isScanning}><ScanLine size={16} />{isScanning ? `Scanning ${scanProgress}%` : "Run system scan"}<ChevronRight size={14} /></button></div>
            </Panel>

            <div className="right-stack">
              <Panel label="Mission telemetry" eyebrow="OBJECTIVE STATUS" accent="amber" className="telemetry-panel">
                <div className="mission-head"><div className="mission-icon"><Crosshair size={20} /></div><div><span>ACTIVE OBJECTIVE</span><strong>Protect the future</strong></div><span className="mission-state">IN PROGRESS</span></div>
                <div className="telemetry-chart"><div className="chart-grid" /><svg viewBox="0 0 400 96" preserveAspectRatio="none" role="img" aria-label="Telemetry trend line"><path className="chart-fill" d="M0 79 C24 72 35 65 58 68 S88 50 113 58 S146 30 171 46 S204 58 225 42 S249 66 272 51 S309 23 336 34 S370 50 400 22 V96 H0 Z" /><path className="chart-line" d="M0 79 C24 72 35 65 58 68 S88 50 113 58 S146 30 171 46 S204 58 225 42 S249 66 272 51 S309 23 336 34 S370 50 400 22" /></svg><div className="chart-axis"><span>00:00</span><span>08:00</span><span>NOW</span></div></div>
                <div className="telemetry-footer"><span><i className="key-dot cyan" />VITALS STABLE</span><span><i className="key-dot amber" />MISSION TIME <strong>04:28:16</strong></span></div>
              </Panel>

              <div className="two-panels"><Panel label="Diagnostics" eyebrow="LIVE READOUT" className="diagnostics-panel"><div className="diagnostic-row"><span><Cpu size={14} /> NEURAL ENGINE</span><b>OPTIMAL</b><i className="diagnostic-bar"><u style={{ width: "91%" }} /></i></div><div className="diagnostic-row"><span><Gauge size={14} /> PROCESSOR TEMP</span><b className="amber-text">48.2°C</b><i className="diagnostic-bar amber"><u style={{ width: "54%" }} /></i></div><div className="diagnostic-row"><span><Radio size={14} /> COMMS ARRAY</span><b>SECURE</b><i className="diagnostic-bar"><u style={{ width: "78%" }} /></i></div></Panel><Panel label="Power grid" eyebrow="DISTRIBUTION"><div className="power-readout"><BatteryCharging size={18} /><div><strong>76.0%</strong><span>AVAILABLE CAPACITY</span></div></div><div className="power-bar"><i style={{ width: "76%" }} /></div><div className="power-footer"><span>ARC REACTOR <b>ONLINE</b></span><span>5.4h EST.</span></div></Panel></div>
            </div>
          </div>

          <div className="bottom-grid">
            <Panel label="Activity stream" eyebrow="RECENT INTELLIGENCE" className="activity-panel"><div className="activity-list">{activity.map((item, index) => <div className="activity-row" key={`${item.time}-${item.title}-${index}`}><span className={`activity-mark ${item.tone}`} /><span className="activity-time">{item.time}</span><div><strong>{item.title}</strong><span>{item.detail}</span></div><ArrowUpRight size={14} /></div>)}</div><button className="panel-link" onClick={() => speakResponse("Activity log expanded. I’m showing the five most recent intelligence events.")}>View full activity log <ArrowUpRight size={13} /></button></Panel>
            <Panel label="Environment" eyebrow="SENSOR FUSION" className="environment-panel" accent="amber"><div className="environment-top"><div className="weather-mark"><div className="sun-core" /><span className="sun-ray ray-1" /><span className="sun-ray ray-2" /><span className="sun-ray ray-3" /><span className="sun-ray ray-4" /></div><div><strong>{liveContext ? `${Math.round(liveContext.temperature)}°` : "22°"}</strong><span>{liveContext ? liveContext.weatherLabel : "Clear skies"}</span></div><div className="env-place"><Globe2 size={15} /><span>{liveContext ? liveContext.place.toUpperCase() : "LOS ANGELES"}<br /><b>{liveContext ? `${liveContext.latitude.toFixed(2)}° · ${liveContext.longitude.toFixed(2)}°` : "34.05° N · 118.24° W"}</b></span></div></div><div className="env-stats"><span>HUMIDITY <b>{liveContext ? `${liveContext.humidity}%` : "41%"}</b></span><span>WIND <b>{liveContext ? `${Math.round(liveContext.windSpeed)} km/h` : "8 km/h"}</b></span><span>CLOUD <b className="safe">{liveContext ? `${liveContext.cloudCover}%` : "GOOD"}</b></span></div></Panel>
          </div>

          <div className="live-context-grid">
            <Panel label="Live context" eyebrow="PERMISSION-BASED SENSOR FUSION" accent="amber" className="context-panel">
              <div className="context-header"><div className="context-identity"><div className={`context-icon ${contextStatus}`}><LocateFixed size={19} /></div><div><span>LOCATION ACCESS</span><strong>{contextStatus === "ready" ? (locationPrecision === "precise" ? "PRECISE GPS" : "APPROXIMATE") : contextStatus === "locating" ? "REQUESTING" : contextStatus === "denied" ? "BLOCKED" : "OFFLINE"}</strong></div></div><button className="context-access-button" onClick={contextStatus === "ready" && locationPrecision === "precise" ? () => speakResponse("Precise live GPS is active. Coordinates, timezone, and weather are updating automatically.") : enableLiveContext}>{contextStatus === "ready" && locationPrecision === "precise" ? <RefreshCw size={13} /> : <Navigation size={13} />}{contextStatus === "ready" && locationPrecision === "precise" ? "Live" : locationPrecision === "approximate" ? "Retry precise GPS" : "Grant access"}</button></div>
              {locationPermission === "denied" && <div className="permission-note">PRECISE GPS BLOCKED · Open the browser lock/site-settings menu and set Location to Allow, then retry.</div>}
              {liveContext ? <><div className="context-place"><MapPin size={15} /><div><strong>{liveContext.place}</strong><span>{liveContext.region} · {liveContext.country}</span></div><button className="context-map" onClick={openGoogleMaps}>Google Maps</button><button className="context-revoke" onClick={disableLiveContext}>Revoke</button></div><div className="context-weather"><CloudSun size={22} /><div><strong>{Math.round(liveContext.temperature)}°</strong><span>{liveContext.weatherLabel} · feels {Math.round(liveContext.apparentTemperature)}°</span></div><div className="context-weather-meta"><span>HUMIDITY <b>{liveContext.humidity}%</b></span><span>WIND <b>{Math.round(liveContext.windSpeed)} km/h</b></span><span>CLOUD <b>{liveContext.cloudCover}%</b></span></div></div><div className="context-coordinates"><span>LAT <b>{liveContext.latitude.toFixed(5)}</b></span><span>LNG <b>{liveContext.longitude.toFixed(5)}</b></span><span>ACCURACY <b>{Math.round(liveContext.accuracy)}m</b></span><span>ALT <b>{liveContext.elevation !== null ? `${Math.round(liveContext.elevation)}m` : "—"}</b></span></div><div className="context-updated">UPDATED {liveContext.updatedAt} <span>//</span> TIMEZONE {liveContext.timezone}</div>{liveNews.length > 0 && <div className="live-news"><div className="live-news-heading"><Globe2 size={13} /> LIVE SOURCES · GOOGLE NEWS</div>{liveNews.slice(0, 3).map((item) => <a key={item.link} href={item.link} target="_blank" rel="noreferrer"><strong>{item.title}</strong><span>{item.source} · {item.publishedAt}</span></a>)}</div>}</> : <div className="context-empty"><LocateFixed size={21} /><strong>Enable precise live context to unlock location intelligence</strong><span>Allow location for this site in the browser prompt. If GPS is unavailable, Jarvis will use approximate network coordinates and keep weather refreshing.</span></div>}
            </Panel>

            <Panel label="Vision perimeter" eyebrow="ADVISORY CAMERA ANALYSIS" className="camera-panel">
              <div className={`camera-frame ${cameraState}`}><video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" /><canvas ref={canvasRef} className="camera-canvas" />{cameraState === "off" && <div className="camera-empty"><CameraOff size={22} /><strong>Visual channel offline</strong><span>Camera and microphone access are opt-in; audio is used for hands-free speech only.</span></div>}{cameraState === "requesting" && <div className="camera-empty"><Camera size={22} /><strong>Awaiting camera and microphone permission</strong><span>Approve both browser prompts to bring the visual and voice channels online.</span></div>}{cameraState === "analyzing" && <div className="camera-analysis-overlay"><RefreshCw size={21} /><span>ANALYZING FRAME</span></div>}<i className="camera-corner top-left" /><i className="camera-corner top-right" /><i className="camera-corner bottom-left" /><i className="camera-corner bottom-right" /></div>
              <div className="camera-actions"><button className="context-access-button" onClick={toggleCamera}><Camera size={13} />{cameraState === "off" ? "Enable camera" : cameraState === "requesting" ? "Requesting" : "Disable camera"}</button>{cameraState === "live" && !microphoneReady && <button className="context-access-button" onClick={() => void requestMicrophone()}><Mic size={13} />Enable microphone</button>}<button className="camera-analyze-button" onClick={() => void analyzeCameraFrame(true)} disabled={cameraState !== "live"}><ScanLine size={13} />Analyze frame</button><button className={`camera-auto-button ${cameraAutoScan ? "active" : ""}`} onClick={toggleCameraAutoScan}><RefreshCw size={13} />{cameraAutoScan ? "Auto on" : "Auto scan"}</button></div>
              <div className={`object-model-status ${objectModelState}`}><span className="live-dot" /> OBJECT MODEL · {objectModelState === "ready" ? "READY" : objectModelState === "loading" ? "LOADING ACCURATE DETECTOR" : objectModelState === "error" ? "FAILED — RETRY CAMERA" : "STANDBY"}</div>{threatResult ? <div className={`threat-summary ${threatResult.level.toLowerCase()}`}><div className="threat-heading"><ShieldAlert size={15} /><strong>{threatResult.objects.length > 0 ? "OBJECTS IDENTIFIED" : `${threatResult.level} SCENE ADVISORY`}</strong><span>{threatResult.analyzedAt}</span></div><p>{threatResult.summary}</p><small>{threatResult.action}</small>{threatResult.observations.length > 0 && <div className="threat-observations">{threatResult.observations.map((observation) => <span key={observation}>· {observation}</span>)}</div>}</div> : <div className="threat-summary empty"><ShieldAlert size={15} /><span>Automatic local scans identify supported objects and scene cues. No face, identity, or emotion inference is performed.</span></div>}
            </Panel>
          </div>

          <form className="command-console" onSubmit={(event) => { event.preventDefault(); executeCommand(); }}><div className="console-prefix"><span className="prompt-dot" />JARVIS<span className="prompt-separator">›</span></div><input ref={inputRef} value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Tell me what you need..." aria-label="Command input" /><button type="submit" aria-label="Send command"><Send size={17} /></button><div className="console-hint">TRY <button type="button" onClick={() => executeCommand(quickCommands[0])}>RUN SYSTEM SCAN</button><span>//</span><button type="button" onClick={() => executeCommand(quickCommands[1])}>OPEN TELEMETRY</button></div></form>
          <div className={`voice-transcript-row ${voiceState}`}><div className="voice-channel-title"><BrainCircuit size={14} /><span>VOICE CHAT · MULTILINGUAL</span><i className={voiceSupported ? "online" : "offline"} /></div><div className="transcript-copy">{transcript || (voiceSupported ? (handsFree ? "Ask in your selected language — Jarvis will answer aloud." : "Voice chat is preparing — ask a question when ready.") : "Speech recognition unavailable — typed commands remain online.")}</div><label className="voice-language"><Globe2 size={13} /><select value={speechLanguage} onChange={(event) => { const nextLanguage = event.target.value; speechLanguageRef.current = nextLanguage; detectedLanguageRef.current = nextLanguage; setSpeechLanguage(nextLanguage); speakResponse(`Voice language changed to ${event.target.options[event.target.selectedIndex]?.text || nextLanguage}.`); }} aria-label="Voice language">{voiceLanguages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><button type="button" className={`handsfree-toggle ${handsFree ? "active" : ""}`} onClick={toggleHandsFree}><Volume2 size={14} />{handsFree ? "Voice chat on" : "Start voice chat"}</button></div>
          <footer className="dashboard-footer"><span><span className="footer-pip" /> ALL SYSTEMS OPERATIONAL</span><span>CREATOR <b>VIGNESH P</b> <i>//</i> JARVIS OS <b>6.4.1</b></span><span><TimerReset size={13} /> UPTIME <b>14:28:09</b></span></footer>
        </section>
      </div>
    </main>
  );
}
