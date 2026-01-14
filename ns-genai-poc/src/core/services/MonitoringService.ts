import { CalendarProvider } from "../types/calendar";
import { AlternativesQuery, TravelDataProvider, RouteOption, TravelDisruption } from "../types/travel";
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
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatHHMMFromDate(d: Date): string {
  return formatHHMMFromMinutes(minutesSinceMidnight(d));
}

export class MonitoringService {
  private lastDisruption: string | null = null;
  private lastScheduleKey: string | null = null;

  private selectedOption: RouteOption | null = null;
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

  getTravelQuery() {
    return this.travelQuery;
  }

  async selectOption(option: RouteOption) {
    this.selectedOption = option;

    // infer buffer from selected arrival vs next meeting start
    const now = new Date();
    const busyBlocks = await this.deps.calendar.getBusyBlocks({
      from: now,
      to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const nextEvent = busyBlocks
      .filter((b) => b.start.getTime() > now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

    const arrMins = parseHHMM(option.arrivalTime);

    if (!nextEvent || arrMins === null) {
      this.selectedBufferMin = 10;
      console.log("[MONITOR] selectOption: could not infer buffer -> using 10");
      return;
    }

    const eventStartMins = minutesSinceMidnight(nextEvent.start);
    const inferred = eventStartMins - arrMins;

    this.selectedBufferMin = Math.max(5, Math.min(30, inferred));
    console.log("[MONITOR] selectOption inferred buffer:", this.selectedBufferMin);
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

  private computeArriveBy(now: Date, busyBlocks: { start: Date }[], bufferMin: number): number | null {
    const next = this.computeNextMeeting(now, busyBlocks);
    if (!next) return null;

    const eventStartMins = minutesSinceMidnight(next.start);
    const arriveBy = eventStartMins - bufferMin;
    return arriveBy >= 0 ? arriveBy : 0;
  }

  private pickBestThatFits(alternatives: RouteOption[], arriveByMins: number): RouteOption | null {
    const fits = (opt: RouteOption) => {
      const t = parseHHMM(opt.arrivalTime);
      return t !== null && t <= arriveByMins;
    };

    const fitting = alternatives.filter(fits);
    if (fitting.length === 0) return null;

    return fitting
      .map((opt) => ({ opt, mins: parseHHMM(opt.arrivalTime) ?? 10_000 }))
      .sort((a, b) => b.mins - a.mins)[0].opt;
  }

  private makeAlert(params: {
    body: string;
    chosen: RouteOption;
    reason: string;
    confidence: number;
    meta?: any;
  }): TravelAlert {
    return {
      id: uid(),
      type: "disruption",
      title: "Travel update",
      body: params.body,
      createdAt: Date.now(),
      recommendation: {
        chosen: params.chosen,
        reason: params.reason,
        confidence: params.confidence,
        meta: params.meta,
      } as any,
    };
  }

  /**
   * Demo helper: widen the search for departures earlier than the UI "departAfter"
   * so the assistant can actually find a better option when the meeting moves earlier.
   *
   * Strategy:
   * - If UI departAfter is e.g. "16:00" but we now need to arrive by 16:23,
   *   we should look at departures before 16:00 too.
   *
   * We set departAfter to (now - 90 minutes), clamped to 00:00.
   */
  private computeWidenedDepartAfter(now: Date): string {
    const minsNow = minutesSinceMidnight(now);
    const widened = Math.max(0, minsNow - 90);
    return formatHHMMFromMinutes(widened);
  }

  async onCalendarChanged(change?: { beforeKey?: string; afterKey?: string }) {
    const now = new Date();
    const afterKey = change?.afterKey;

    console.log("[MONITOR] onCalendarChanged afterKey:", afterKey);

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
    const nextMeetingStart = nextMeeting ? formatHHMMFromDate(nextMeeting.start) : undefined;

    const bufferMin = this.selectedBufferMin ?? 10;
    const arriveByMins = this.computeArriveBy(now, busyBlocks, bufferMin);

    const selectedArr = this.selectedOption?.arrivalTime;
    const selectedArrMins = this.selectedOption ? parseHHMM(this.selectedOption.arrivalTime) : null;
    const selectedFits = arriveByMins !== null && selectedArrMins !== null ? selectedArrMins <= arriveByMins : false;

    console.log("[MONITOR] context:", {
      nextMeetingStart,
      arriveBy: arriveByMins !== null ? formatHHMMFromMinutes(arriveByMins) : null,
      bufferMin,
      selectedArr,
      selectedFits,
      travelQuery: this.travelQuery,
    });

    // Fetch with the user's chosen time window first
    let alternatives = await this.deps.travel.getAlternatives(this.travelQuery);

    const fallback: RouteOption =
      alternatives[0] ?? {
        id: "fallback-none",
        summary: "No alternatives available",
        arrivalTime: "??:??",
        changes: 0,
      };

    // If no meeting, still show something
    if (arriveByMins === null) {
      const chosen = this.selectedOption ?? fallback;
      const alert = this.makeAlert({
        body: "Your calendar changed. Here’s the best train option based on your context.",
        chosen,
        reason: this.selectedOption
          ? "No upcoming meeting detected. Keeping your selected train."
          : "No upcoming meeting detected. Showing the best available option.",
        confidence: this.selectedOption ? 0.75 : 0.6,
        meta: { selected: this.selectedOption ?? undefined, bufferMin, meetingStart: nextMeetingStart },
      });
      this.deps.notifications.notify(alert);
      return;
    }

    // If selected still fits, still send a “good news” update for demo
    if (this.selectedOption && selectedFits) {
      const alert = this.makeAlert({
        body: "Your calendar changed. Good news: your selected train still fits.",
        chosen: this.selectedOption,
        reason: `You need to arrive before ${formatHHMMFromMinutes(arriveByMins)} (keeps ~${bufferMin} min buffer). Your selected train still arrives on time.`,
        confidence: 0.9,
        meta: {
          selected: this.selectedOption,
          arriveBy: formatHHMMFromMinutes(arriveByMins),
          bufferMin,
          meetingStart: nextMeetingStart,
        },
      });
      this.deps.notifications.notify(alert);
      return;
    }

    // Selected is missing OR no longer fits:
    // Try to find an option that fits in the current time window
    let bestThatFits = this.pickBestThatFits(alternatives, arriveByMins);

    // ✅ DEMO IMPROVEMENT: if nothing fits, widen the search window automatically
    if (!bestThatFits) {
      const widenedDepartAfter = this.computeWidenedDepartAfter(now);

      const widenedQuery: AlternativesQuery = {
        ...this.travelQuery,
        departAfter: widenedDepartAfter,
      };

      console.log("[MONITOR] widening search window:", {
        fromDepartAfter: this.travelQuery.departAfter,
        toDepartAfter: widenedDepartAfter,
      });

      const widenedAlternatives = await this.deps.travel.getAlternatives(widenedQuery);

      // Keep the alternatives list for UI/card reasoning (optional)
      if (widenedAlternatives.length > 0) {
        alternatives = widenedAlternatives;
        bestThatFits = this.pickBestThatFits(alternatives, arriveByMins);
      }
    }

    const selectedStr = this.selectedOption
      ? ` Your selected train (arr ${this.selectedOption.arrivalTime}) no longer fits.`
      : "";

    // If still nothing fits, be honest (best demo UX)
    if (!bestThatFits) {
      const alert = this.makeAlert({
        body: "Your calendar changed. There is no train that gets you there on time anymore.",
        chosen: fallback,
        reason: `You need to arrive before ${formatHHMMFromMinutes(arriveByMins)} (keeps ~${bufferMin} min buffer), but none of the available departures arrive before that.${selectedStr}`,
        confidence: 0.45,
        meta: {
          selected: this.selectedOption ?? undefined,
          arriveBy: formatHHMMFromMinutes(arriveByMins),
          bufferMin,
          meetingStart: nextMeetingStart,
          noOptionOnTime: true,
        },
      });
      this.deps.notifications.notify(alert);
      return;
    }

    // Otherwise recommend the better one
    const alert = this.makeAlert({
      body: this.selectedOption
        ? "Your calendar changed. Your selected train no longer fits — here’s a better option."
        : "Your calendar changed — here’s the best train option based on your updated schedule.",
      chosen: bestThatFits,
      reason: `Meeting moved earlier. You need to arrive before ${formatHHMMFromMinutes(arriveByMins)} (keeps ~${bufferMin} min buffer).${selectedStr}`,
      confidence: 0.85,
      meta: {
        selected: this.selectedOption ?? undefined,
        arriveBy: formatHHMMFromMinutes(arriveByMins),
        bufferMin,
        meetingStart: nextMeetingStart,
        noOptionOnTime: false,
      },
    });

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

    const bufferMin = this.selectedBufferMin ?? 10;
    const arriveByMins = this.computeArriveBy(now, busyBlocks, bufferMin);

    const alternatives = await this.deps.travel.getAlternatives(this.travelQuery);

    const fallback: RouteOption =
      alternatives[0] ?? {
        id: "fallback-none",
        summary: "No alternatives available",
        arrivalTime: "??:??",
        changes: 0,
      };

    const best =
      arriveByMins !== null ? this.pickBestThatFits(alternatives, arriveByMins) ?? fallback : fallback;

    const alert = this.makeAlert({
      body:
        disruption === "cancelled"
          ? "Your planned train was cancelled. Tap to see the best alternative."
          : "Your trip changed. Tap to see the best alternative.",
      chosen: best,
      reason: arriveByMins !== null
        ? `Best option that still arrives before ${formatHHMMFromMinutes(arriveByMins)}.`
        : "No upcoming meeting detected; showing best available option.",
      confidence: 0.8,
      meta: {
        selected: this.selectedOption ?? undefined,
        arriveBy: arriveByMins !== null ? formatHHMMFromMinutes(arriveByMins) : undefined,
        bufferMin,
      },
    });

    this.deps.notifications.notify(alert);
  }
}