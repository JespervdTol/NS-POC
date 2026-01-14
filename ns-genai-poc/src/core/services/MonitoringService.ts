// src/core/services/MonitoringService.ts
import { CalendarProvider } from "../types/calendar";
import { AlternativesQuery, TravelDataProvider, RouteOption } from "../types/travel";
import { ReasoningProvider } from "../types/reasoning";
import { NotificationProvider } from "../types/notifications";
import { TravelAlert } from "../types/alerts";

function uid() {
  return Math.random().toString(36).slice(2);
}

function parseHHMM(s: string): number | null {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function formatHHMMFromMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatHHMMFromDate(d: Date): string {
  return formatHHMMFromMinutes(minutesSinceMidnight(d));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export class MonitoringService {
  private lastScheduleKey: string | null = null;

  private selectedOption: RouteOption | null = null;

  /**
   * Inferred from user's selection:
   * bufferMin = meetingStart - selectedArrival
   *
   * Important: This can be > 10 (e.g. user likes arriving 30 min early).
   */
  private selectedBufferMin: number | null = null;

  private travelQuery: AlternativesQuery = {
    from: "Eindhoven",
    to: "Utrecht Centraal",
    station: "EHV",
    departAfter: undefined,
  };

  constructor(
    private deps: {
      calendar: CalendarProvider;
      travel: TravelDataProvider;
      reasoning: ReasoningProvider;
      notifications: NotificationProvider;
    }
  ) {}

  setTravelQuery(query: AlternativesQuery) {
    this.travelQuery = { ...this.travelQuery, ...query };
    console.log("[MONITOR] setTravelQuery:", this.travelQuery);
  }

  /**
   * Called by UI when user selects a train.
   * We infer their "preferred buffer" based on:
   * buffer = meetingStart - selectedArrival
   *
   * If meeting is 18:00 and arrival 17:30 => buffer = 30.
   */
  async selectOption(option: RouteOption) {
    this.selectedOption = option;

    const now = new Date();
    const busyBlocks = await this.deps.calendar.getBusyBlocks({
      from: now,
      to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const nextEvent = busyBlocks
      .filter((b) => b.start.getTime() > now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

    const arrMins = parseHHMM(option.arrivalTime);

    // If we can't infer, choose a sensible demo default.
    if (!nextEvent || arrMins === null) {
      this.selectedBufferMin = 10;
      console.log("[MONITOR] selectOption: could not infer buffer -> using 10");
      return;
    }

    const eventStartMins = minutesSinceMidnight(nextEvent.start);
    const inferred = eventStartMins - arrMins;

    // If user somehow selected a train that arrives after the meeting start,
    // don't store negative buffer; fall back to default.
    if (!Number.isFinite(inferred) || inferred <= 0) {
      this.selectedBufferMin = 10;
      console.log("[MONITOR] selectOption: inferred<=0 -> using 10");
      return;
    }

    /**
     * Demo tuning:
     * - allow buffers like 30, 45, 60 (user preference)
     * - but cap extreme values so the demo doesn’t look weird.
     * Pick 5..90 as a robust range.
     */
    this.selectedBufferMin = clamp(Math.round(inferred), 5, 90);

    console.log("[MONITOR] selectOption inferred buffer:", {
      inferred,
      stored: this.selectedBufferMin,
      meetingStart: formatHHMMFromDate(nextEvent.start),
      selectedArrival: option.arrivalTime,
    });
  }

  clearSelection() {
    this.selectedOption = null;
    this.selectedBufferMin = null;
    console.log("[MONITOR] clearSelection");
  }

  private computeNextMeeting(now: Date, busyBlocks: { start: Date }[]) {
    return busyBlocks
      .filter((b) => b.start.getTime() > now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  }

  private computeArriveByMins(meetingStartMins: number, bufferMin: number) {
    const arriveBy = meetingStartMins - bufferMin;
    return arriveBy >= 0 ? arriveBy : 0;
  }

  private makeAlert(params: { body: string; recommendation: any }): TravelAlert {
    return {
      id: uid(),
      type: "disruption",
      title: "Travel update",
      body: params.body,
      createdAt: Date.now(),
      recommendation: params.recommendation,
    };
  }

  /**
   * ✅ FIX: Widen search ONLY up to "now" (never include already-departed trains)
   * We still widen "earlier than user's departAfter", but never earlier than current time.
   *
   * If you want 1–2 minutes grace, change minsNow to (minsNow - 2).
   */
  private computeWidenedDepartAfter(now: Date): string {
    const minsNow = minutesSinceMidnight(now);
    const widened = Math.max(0, minsNow);
    return formatHHMMFromMinutes(widened);
  }

  async onCalendarChanged(change?: { beforeKey?: string; afterKey?: string }) {
    const now = new Date();
    const afterKey = change?.afterKey;

    console.log("[MONITOR] onCalendarChanged", { afterKey });

    if (afterKey && this.lastScheduleKey === afterKey) {
      console.log("[MONITOR] same schedule key -> ignoring");
      return;
    }
    if (afterKey) this.lastScheduleKey = afterKey;

    const busyBlocks = await this.deps.calendar.getBusyBlocks({
      from: now,
      to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const nextMeeting = this.computeNextMeeting(now, busyBlocks);
    if (!nextMeeting) {
      console.log("[MONITOR] no nextMeeting -> return");
      return;
    }

    // ✅ Use inferred user-preference buffer if available
    const bufferMin = this.selectedBufferMin ?? 10;

    const meetingStartMins = minutesSinceMidnight(nextMeeting.start);
    const arriveByMins = this.computeArriveByMins(meetingStartMins, bufferMin);

    const meetingStartHHMM = formatHHMMFromMinutes(meetingStartMins);
    const arriveByHHMM = formatHHMMFromMinutes(arriveByMins);

    console.log("[MONITOR] timing", { meetingStartHHMM, arriveByHHMM, bufferMin });

    // Load alternatives with normal query, but widen if needed
    let usedWidenedSearch = false;
    let alternatives = await this.deps.travel.getAlternatives(this.travelQuery);

    const widenedDepartAfter = this.computeWidenedDepartAfter(now);

    const userAfter =
      typeof this.travelQuery.departAfter === "string" ? parseHHMM(this.travelQuery.departAfter) : null;

    const widenAfter = parseHHMM(widenedDepartAfter);

    if (widenAfter !== null && (userAfter === null || userAfter > widenAfter)) {
      const widenedQuery: AlternativesQuery = { ...this.travelQuery, departAfter: widenedDepartAfter };
      const widened = await this.deps.travel.getAlternatives(widenedQuery);
      if (widened.length > 0) {
        alternatives = widened;
        usedWidenedSearch = true;
      }
    }

    const departAfterEffective =
      usedWidenedSearch
        ? widenedDepartAfter
        : typeof this.travelQuery.departAfter === "string"
          ? this.travelQuery.departAfter
          : null;

    console.log("[MONITOR] alternatives", {
      count: alternatives.length,
      usedWidenedSearch,
      departAfterUsed: departAfterEffective,
    });

    if (alternatives.length === 0) {
      console.log("[MONITOR] no alternatives -> return");
      return;
    }

    // ✅ LLM decides; Monitoring provides context + guardrail inputs
    const rec = await this.deps.reasoning.recommend({
      busyBlocks,
      disruption: "none",
      alternatives,
      now,

      selectedOption: this.selectedOption,
      bufferMin,
      meetingStartHHMM,
      arriveByHHMM,
      travelQuery: {
        ...this.travelQuery,
        departAfter: departAfterEffective ?? undefined,
      },
      usedWidenedSearch,

      // extra context for your violation logging / guardrails
      currentTimeHHMM: formatHHMMFromDate(now),
      departAfterEffective: departAfterEffective,
    } as any);

    if (!rec) {
      console.log("[MONITOR] strict-mode: rec=null -> no notification");
      return;
    }

    rec.meta = { ...(rec.meta ?? {}), usedWidenedSearch };

    const body = this.selectedOption
      ? "Your calendar changed. Checking if your selected train still fits."
      : "Your calendar changed. Finding the best train based on your updated schedule.";

    console.log("[MONITOR] notifying with chosen:", rec.chosen?.id, rec.chosen?.summary);

    this.deps.notifications.notify(this.makeAlert({ body, recommendation: rec }));
  }
}