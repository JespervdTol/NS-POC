import { appConfig } from "../../app/config";

import { CalendarProvider } from "../types/calendar";
import { TravelDataProvider } from "../types/travel";
import { ReasoningProvider } from "../types/reasoning";
import { NotificationProvider } from "../types/notifications";
import { PocControls } from "../types/poc";

import { MonitoringService } from "../services/MonitoringService";

// Providers you already have
import { MockCalendarProvider } from "../../providers/calendar/MockCalendarProvider";
import { MockTravelDataProvider } from "../../providers/travel/MockTravelDataProvider";
import { RuleReasoningProvider } from "../../providers/reasoning/RuleReasoningProvider";
import { InAppNotificationProvider } from "../../providers/notifications/InAppNotificationProvider";

// New real providers (now available / next steps)
import { NsApiTravelDataProvider } from "../../providers/travel/NsApiTravelDataProvider";
import { OllamaReasoningProvider } from "../../providers/reasoning/OllamaReasoningProvider";

// POC controls
import { MockPocControls } from "../../providers/poc/MockPocControls";

// Later you’ll add these and switch via config:
// import { ExpoCalendarProvider } from "../../providers/calendar/ExpoCalendarProvider";
// import { ExpoPushNotificationProvider } from "../../providers/notifications/ExpoPushNotificationProvider";

export type Container = {
  calendar: CalendarProvider;
  travel: TravelDataProvider;
  reasoning: ReasoningProvider;
  notifications: NotificationProvider;

  // “backend AI”
  monitor: MonitoringService;

  // POC-only (safe to remove later)
  poc: PocControls;
};

export function buildContainer(): Container {
  // 1) Notifications
  const notifications: NotificationProvider =
    appConfig.notifications === "inapp"
      ? new InAppNotificationProvider()
      : new InAppNotificationProvider(); // later: ExpoPushNotificationProvider

  // 2) Calendar
  const calendar: CalendarProvider =
    appConfig.calendar === "mock"
      ? new MockCalendarProvider()
      : new MockCalendarProvider(); // later: ExpoCalendarProvider

  // 3) Travel API provider
  const travel: TravelDataProvider =
    appConfig.travel === "nsApi"
      ? new NsApiTravelDataProvider({ baseUrl: appConfig.nsProxyBaseUrl })
      : new MockTravelDataProvider();

  // 4) Reasoning
  const reasoning: ReasoningProvider =
    appConfig.reasoning === "llm"
      ? new OllamaReasoningProvider({ baseUrl: appConfig.nsProxyBaseUrl })
      : new RuleReasoningProvider();

  // 5) MonitoringService (your “backend AI” runner)
  const monitor = new MonitoringService({ calendar, travel, reasoning, notifications });

  // 6) POC controls (simulate unexpected situations)
  const poc: PocControls = new MockPocControls({
    travel: travel as any,
    calendar,
    reasoning,
    notifications,
    monitor,
  });

  return { calendar, travel, reasoning, notifications, monitor, poc };
}