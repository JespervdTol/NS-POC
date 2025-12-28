import { PocControls } from "../../core/types/poc";
import { MonitoringService } from "../../core/services/MonitoringService";
import { TravelDataProvider } from "../../core/types/travel";
import { NotificationProvider } from "../../core/types/notifications";
import { ReasoningProvider } from "../../core/types/reasoning";
import { TravelAlert } from "../../core/types/alerts";
import { CalendarProvider } from "../../core/types/calendar";

function uid() {
  return Math.random().toString(36).slice(2);
}

// Optional capability: only available on mock travel provider, but UI never checks concrete types.
type SupportsSimulatedDisruption = TravelDataProvider & {
  setDisruption?: (d: any) => void;
};

export class MockPocControls implements PocControls {
  name = "MockPocControls";

  constructor(
    private deps: {
      travel: SupportsSimulatedDisruption;
      calendar: CalendarProvider;
      reasoning: ReasoningProvider;
      notifications: NotificationProvider;
      monitor: MonitoringService;
    }
  ) {}

  async simulateUnexpectedSituation(): Promise<void> {
    console.log("[POC] simulateUnexpectedSituation()");

    // If we're on mock travel provider, flip disruption to exercise "real" monitor path
    const current = await this.deps.travel.getDisruption();
    const next = current === "none" ? "cancelled" : current === "cancelled" ? "delayed" : "none";

    if (this.deps.travel.setDisruption) {
      console.log("[POC] Using mock disruption flip ->", next);
      this.deps.travel.setDisruption(next);
      await this.deps.monitor.checkOnce();
      return;
    }

    // Otherwise (real NS provider): emit a guaranteed DEMO alert
    console.log("[POC] Real provider detected (no setDisruption). Emitting demo alert.");

    const now = new Date();
    const busyBlocks = await this.deps.calendar.getBusyBlocks({
      from: now,
      to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    console.log("[POC] about to fetch alternatives...");
    const alternatives = await this.deps.travel.getAlternatives();
    console.log("[POC] alternatives fetched:", alternatives);

    const rec = await this.deps.reasoning.recommend({
      busyBlocks,
      disruption: "cancelled", // demo scenario label
      alternatives,
      now,
    });

    const alert: TravelAlert = {
      id: uid(),
      type: "disruption",
      title: "Travel update",
      body: "Demo: unexpected change detected. Tap to see the best alternative.",
      createdAt: Date.now(),
      recommendation: rec,
    };

    this.deps.notifications.notify(alert);
  }
}