import { CalendarProvider } from "../types/calendar";
import { TravelDataProvider } from "../types/travel";
import { ReasoningProvider } from "../types/reasoning";
import { NotificationProvider } from "../types/notifications";
import { TravelAlert } from "../types/alerts";

function uid() {
  return Math.random().toString(36).slice(2);
}

export class MonitoringService {
  private lastDisruption: string | null = null;

  private lastScheduleKey: string | null = null;

  constructor(
    private deps: {
      calendar: CalendarProvider;
      travel: TravelDataProvider;
      reasoning: ReasoningProvider;
      notifications: NotificationProvider;
    }
  ) {}

  async onCalendarChanged(change?: { beforeKey?: string; afterKey?: string }) {
    const now = new Date();

    const afterKey = change?.afterKey;
    if (afterKey && this.lastScheduleKey === afterKey) return;
    if (afterKey) this.lastScheduleKey = afterKey;

    const busyBlocks = await this.deps.calendar.getBusyBlocks({
      from: now,
      to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const alternatives = await this.deps.travel.getAlternatives();

    const rec = await this.deps.reasoning.recommend({
      busyBlocks,
      disruption: "none",
      alternatives,
      now,
    });

    const alert: TravelAlert = {
      id: uid(),
      type: "disruption",
      title: "Travel update",
      body: "Your calendar changed. Tap to see the best train option based on your updated schedule.",
      createdAt: Date.now(),
      recommendation: rec,
    };

    this.deps.notifications.notify(alert);
  }

  async checkOnce() {
    const now = new Date();

    const disruption = await this.deps.travel.getDisruption();

    const isUnexpected = disruption !== "none";

    if (!isUnexpected || this.lastDisruption === disruption) return;

    this.lastDisruption = disruption;

    const busyBlocks = await this.deps.calendar.getBusyBlocks({
      from: now,
      to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    await this.deps.travel.getPlannedTrip();
    const alternatives = await this.deps.travel.getAlternatives();

    const rec = await this.deps.reasoning.recommend({
      busyBlocks,
      disruption,
      alternatives,
      now,
    });

    const alert: TravelAlert = {
      id: uid(),
      type: "disruption",
      title: "Travel update",
      body:
        disruption === "cancelled"
          ? "Your planned train was cancelled. Tap to see the best alternative."
          : "Your trip changed. Tap to see the best alternative.",
      createdAt: Date.now(),
      recommendation: rec,
    };

    this.deps.notifications.notify(alert);
  }
}