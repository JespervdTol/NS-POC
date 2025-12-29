import { appConfig } from "../../app/config";

import { CalendarProvider } from "../types/calendar";
import { TravelDataProvider } from "../types/travel";
import { ReasoningProvider } from "../types/reasoning";
import { NotificationProvider } from "../types/notifications";
import { PocControls } from "../types/poc";

import { MonitoringService } from "../services/MonitoringService";

// Mock Providers
import { MockCalendarProvider } from "../../providers/calendar/MockCalendarProvider";
import { MockTravelDataProvider } from "../../providers/travel/MockTravelDataProvider";
import { RuleReasoningProvider } from "../../providers/reasoning/RuleReasoningProvider";
import { InAppNotificationProvider } from "../../providers/notifications/InAppNotificationProvider";

// Real Providers (+ Expo)
import { NsApiTravelDataProvider } from "../../providers/travel/NsApiTravelDataProvider";
import { OllamaReasoningProvider } from "../../providers/reasoning/OllamaReasoningProvider";
import { ExpoPushNotificationProvider } from "../../providers/notifications/ExpoPushNotificationProvider";
import { ExpoCalendarProvider } from "../../providers/calendar/ExpoCalendarProvider";

import { MockPocControls } from "../../providers/poc/MockPocControls";

export type Container = {
  calendar: CalendarProvider;
  travel: TravelDataProvider;
  reasoning: ReasoningProvider;
  notifications: NotificationProvider;

  monitor: MonitoringService;

  poc: PocControls;
};

export function buildContainer(): Container {
  // 1) Notifications
  const notifications: NotificationProvider =
    appConfig.notifications === "expoPush"
      ? new ExpoPushNotificationProvider()
      : new InAppNotificationProvider();

  // 2) Calendar
  const calendar: CalendarProvider =
    appConfig.calendar === "expo"
      ? new ExpoCalendarProvider()
      : new MockCalendarProvider();

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

  // 5) Services
  const monitor = new MonitoringService({ calendar, travel, reasoning, notifications });

  // 6) POC controls
  const poc: PocControls = new MockPocControls({
    travel: travel as any,
    calendar,
    reasoning,
    notifications,
    monitor,
  });

  return { calendar, travel, reasoning, notifications, monitor, poc};
}