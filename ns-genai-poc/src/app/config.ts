import { Platform } from "react-native";

export type CalendarProviderKind = "mock" | "expo";
export type TravelProviderKind = "mock" | "nsApi";
export type ReasoningProviderKind = "rules" | "llm";
export type NotificationProviderKind = "inapp" | "expoPush";

/**
 * DEMO / DEV CONFIG
 *
 * 👉 When demoing:
 * 1. Start backend (port 3001)
 * 2. Start ngrok: `ngrok http 3001`
 * 3. Copy the HTTPS forwarding URL from ngrok
 * 4. Paste it below into DEMO_PROXY_URL
 *
 * Example:
 * const DEMO_PROXY_URL = "https://zandra-unprophetical-vina.ngrok-free.dev";
 */
const DEMO_PROXY_URL = "https://zandra-unprophetical-vina.ngrok-free.dev";

/**
 * Resolve backend proxy URL in a safe, predictable way
 */
function getProxyBaseUrl() {
  // If ngrok URL is set, use it everywhere (web + iOS)
  if (DEMO_PROXY_URL) return DEMO_PROXY_URL;

  // Web can use localhost
  if (Platform.OS === "web") return "http://localhost:3001";

  // iOS device needs your PC LAN IP if no ngrok is used
  // (only change this line if you’re not using ngrok)
  return "http://192.168.1.50:3001";
}

export const appConfig = {
  // Providers
  calendar: (Platform.OS === "web" ? "mock" : "expo") as CalendarProviderKind,
  travel: "nsApi" as TravelProviderKind,
  reasoning: "llm" as ReasoningProviderKind,
  notifications: (Platform.OS === "web" ? "inapp" : "expoPush") as NotificationProviderKind,

  // Backend proxy (NS API + Ollama)
  nsProxyBaseUrl: getProxyBaseUrl(),
} as const;