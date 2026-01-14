import { AppState, AppStateStatus, Platform } from "react-native";
import { CalendarProvider } from "../types/calendar";

type EventSnapshot = {
  key: string;
  title?: string;
  startIso: string;
  endIso: string;
  location?: string;
};

function toIso(d: Date) {
  return d.toISOString();
}

function snapshotKey(s: EventSnapshot) {
  // Key includes start/end time so time edits definitely change the key
  return `${s.title ?? ""}|${s.startIso}|${s.endIso}|${s.location ?? ""}`;
}

export class CalendarWatchService {
  private last: EventSnapshot | null = null;
  private sub: any = null;

  constructor(
    private deps: {
      calendar: CalendarProvider;
      onChange: (change: { before: EventSnapshot | null; after: EventSnapshot }) => void;
    }
  ) {}

  start() {
    if (Platform.OS === "web") return () => {};

    const handler = async (state: AppStateStatus) => {
      if (state !== "active") return;
      console.log("[CAL WATCH] app active -> checking calendar…");
      await this.checkOnce();
    };

    this.checkOnce().catch((e) => console.log("[CAL WATCH] initial check failed:", String(e?.message || e)));

    this.sub = AppState.addEventListener("change", handler);
    return () => {
      this.sub?.remove?.();
      this.sub = null;
    };
  }

  async checkOnce() {
    const now = new Date();
    const to = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const blocks = await this.deps.calendar.getBusyBlocks({ from: now, to });

    // ✅ Demo reliability:
    // Always pick the next event that hasn't started yet (by start time).
    const next = blocks
      .filter((b) => b.start.getTime() > now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

    if (!next) {
      console.log("[CAL WATCH] no upcoming events found");
      return;
    }

    const after: EventSnapshot = {
      key: "",
      title: next.title,
      startIso: toIso(next.start),
      endIso: toIso(next.end),
      location: next.location,
    };
    after.key = snapshotKey(after);

    if (!this.last) {
      this.last = after;
      console.log("[CAL WATCH] snapshot set:", after.key);
      return;
    }

    if (this.last.key !== after.key) {
      const before = this.last;
      this.last = after;

      console.log("[CAL WATCH] calendar changed!");
      console.log("[CAL WATCH] before:", before.key);
      console.log("[CAL WATCH] after :", after.key);

      this.deps.onChange({ before, after });
    } else {
      console.log("[CAL WATCH] no change (same key)");
    }
  }
}