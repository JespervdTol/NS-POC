import { Platform } from "react-native";

export type CalendarProviderKind = "mock" | "expo";
export type TravelProviderKind = "mock" | "nsApi";
export type ReasoningProviderKind = "rules" | "llm";
export type NotificationProviderKind = "inapp" | "expoPush";

export const appConfig = {
  // Web can’t use device calendar, so default to mock on web
  calendar: (Platform.OS === "web" ? "mock" : "mock") as CalendarProviderKind,
  travel: "mock" as TravelProviderKind,
  reasoning: "rules" as ReasoningProviderKind,
  notifications: "inapp" as NotificationProviderKind,

  // For later: your backend proxy URL that calls NS API safely
  nsProxyBaseUrl: "http://localhost:3001",
} as const;