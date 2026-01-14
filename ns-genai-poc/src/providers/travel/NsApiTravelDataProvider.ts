import { AlternativesQuery, RouteOption, TravelDataProvider, TravelDisruption } from "../../core/types/travel";
import { NsReisinfoClient } from "./NsReisinfoClient";

function hhmmFromIso(dt: any): string {
  const s = String(dt || "");
  return typeof s === "string" && s.length >= 16 ? s.slice(11, 16) : "??:??";
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

function minutesFromDate(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function toLocalIsoWithOffset(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = "00";

  const offMin = -date.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);

  return `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${offH}:${offM}`;
}

function buildDateTimeFromHHMM(hhmm: string): string {
  const now = new Date();
  const p = parseHHMM(hhmm);
  const base = new Date(now);

  if (p !== null) {
    base.setHours(Math.floor(p / 60), p % 60, 0, 0);
  }

  return toLocalIsoWithOffset(base);
}

function safeStr(x: any) {
  return typeof x === "string" ? x : x == null ? "" : String(x);
}

function extractTripTimes(trip: any): { depIso: string; arrIso: string; changes: number } {
  const legs: any[] = Array.isArray(trip?.legs) ? trip.legs : [];

  const firstLeg = legs[0];
  const lastLeg = legs.length ? legs[legs.length - 1] : null;

  const depIso =
    safeStr(firstLeg?.origin?.actualDateTime) ||
    safeStr(firstLeg?.origin?.plannedDateTime) ||
    safeStr(trip?.actualDepartureDateTime) ||
    safeStr(trip?.plannedDepartureDateTime) ||
    "";

  const arrIso =
    safeStr(lastLeg?.destination?.actualDateTime) ||
    safeStr(lastLeg?.destination?.plannedDateTime) ||
    safeStr(trip?.actualArrivalDateTime) ||
    safeStr(trip?.plannedArrivalDateTime) ||
    "";

  const changes =
    Number.isFinite(trip?.transfers) ? Number(trip.transfers) :
    Number.isFinite(trip?.numberOfChanges) ? Number(trip.numberOfChanges) :
    Number.isFinite(trip?.transfersCount) ? Number(trip.transfersCount) :
    Math.max(0, legs.length - 1);

  return { depIso, arrIso, changes };
}

function notNull<T>(x: T | null): x is T {
  return x !== null;
}

export class NsApiTravelDataProvider implements TravelDataProvider {
  name = "NsApiTravelDataProvider";
  private client: NsReisinfoClient;

  constructor(private deps: { baseUrl: string }) {
    this.client = new NsReisinfoClient({ baseUrl: deps.baseUrl });
  }

  async getPlannedTrip() {
    return { from: "Eindhoven", to: "Utrecht Centraal", plannedDeparture: "—" };
  }

  async getDisruption(): Promise<TravelDisruption> {
    return "none";
  }

  async getAlternatives(query?: AlternativesQuery): Promise<RouteOption[]> {
    const fromStation = query?.station ?? "EHV";
    const toStation = "UT";

    const fromLabel = query?.from ?? "Eindhoven";
    const toLabel = query?.to ?? "Utrecht Centraal";

    const now = new Date();
    let thresholdMin = minutesFromDate(now);

    const departAfter = typeof query?.departAfter === "string" ? query.departAfter : null;

    if (departAfter && /^\d{1,2}:\d{2}$/.test(departAfter)) {
      const p = parseHHMM(departAfter);
      if (p !== null) thresholdMin = p;
    }

    thresholdMin = Math.max(thresholdMin, minutesFromDate(now));

    const fallbackHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const hhmmForQuery = departAfter && /^\d{1,2}:\d{2}$/.test(departAfter) ? departAfter : fallbackHHMM;

    const dateTime = buildDateTimeFromHHMM(hhmmForQuery);

    try {
      console.log("[NS] trips from:", fromStation, "to:", toStation, "dateTime:", dateTime, "thresholdMin:", thresholdMin);

      const data = await this.client.get<any>("trips", {
        fromStation,
        toStation,
        dateTime,
        searchForArrival: false,
        v: 3,
      });

      const trips: any[] =
        data?.payload?.trips ??
        data?.payload?.payload?.trips ??
        data?.trips ??
        [];

      const options: RouteOption[] = trips
        .map((t: any, idx: number): RouteOption | null => {
          const { depIso, arrIso, changes } = extractTripTimes(t);

          const depHHMM = hhmmFromIso(depIso);
          const arrHHMM = hhmmFromIso(arrIso);

          const depMin = parseHHMM(depHHMM);

          if (depMin !== null && depMin < thresholdMin) return null;

          const id = safeStr(t?.uid) || safeStr(t?.id) || `trip-${idx}`;

          return {
            id: `ehv-ut-${id}`,
            from: fromLabel,
            to: toLabel,
            departureTime: depHHMM,
            arrivalTime: arrHHMM,
            changes: Number.isFinite(changes) ? changes : 0,
            summary: `${depHHMM}  ${fromLabel} → ${toLabel}`,
          };
        })
        .filter(notNull)
        .slice(0, 8);

      if (options.length === 0) {
        return [
          {
            id: "fallback-empty",
            from: fromLabel,
            to: toLabel,
            summary: "No trip options found after the selected time.",
            departureTime: "—",
            arrivalTime: "—",
            changes: 0,
          },
        ];
      }

      return options;
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.log("[NS] getAlternatives ERROR:", msg);

      return [
        {
          id: "fallback-error",
          from: fromLabel,
          to: toLabel,
          summary: `No live trip data — ${msg.slice(0, 120)}`,
          departureTime: "??:??",
          arrivalTime: "??:??",
          changes: 0,
        },
      ];
    }
  }
}