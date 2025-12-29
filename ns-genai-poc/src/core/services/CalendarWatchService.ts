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
      await this.checkOnce();
    };

    this.checkOnce().catch(() => {});

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

    const next = blocks.find((b) => b.end.getTime() > now.getTime());
    if (!next) return;

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
      return;
    }

    if (this.last.key !== after.key) {
      const before = this.last;
      this.last = after;
      this.deps.onChange({ before, after });
    }
  }
}