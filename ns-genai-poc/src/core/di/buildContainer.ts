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

// POC controls
import { MockPocControls } from "../../providers/poc/MockPocControls";

// Later you’ll add these and switch via config:
// import { ExpoCalendarProvider } from "../../providers/calendar/ExpoCalendarProvider";
// import { NsApiTravelDataProvider } from "../../providers/travel/NsApiTravelDataProvider";
// import { ExpoPushNotificationProvider } from "../../providers/notifications/ExpoPushNotificationProvider";
// import { LlmReasoningProvider } from "../../providers/reasoning/LlmReasoningProvider";

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
    appConfig.travel === "mock"
      ? new MockTravelDataProvider()
      : new MockTravelDataProvider(); // later: NsApiTravelDataProvider({ baseUrl: appConfig.nsProxyBaseUrl })

  // 4) Reasoning
  const reasoning: ReasoningProvider =
    appConfig.reasoning === "rules"
      ? new RuleReasoningProvider()
      : new RuleReasoningProvider(); // later: LlmReasoningProvider

  // 5) MonitoringService (your “backend AI” runner)
  const monitor = new MonitoringService({ calendar, travel, reasoning, notifications });

  // 6) POC controls (simulate unexpected situations)
  const poc: PocControls = new MockPocControls({ travel: travel as any, monitor });

  return { calendar, travel, reasoning, notifications, monitor, poc };
}