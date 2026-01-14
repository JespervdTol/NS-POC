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

function formatHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutesFromDate(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// Demo assumption: Eindhoven -> Utrecht travel time ~47 minutes (IC)
const DEMO_TRAVEL_MIN = 47;

// Demo assumption: no transfers
const DEMO_CHANGES = 0;

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
    const station = query?.station ?? "EHV"; // departures board station code

    const fromLabel = query?.from ?? "Eindhoven";
    const toLabel = query?.to ?? "Utrecht Centraal";

    // Determine threshold minutes-of-day for filtering
    const now = new Date();
    let thresholdMin = minutesFromDate(now);

    const departAfter = query?.departAfter;
    if (departAfter instanceof Date) {
      thresholdMin = minutesFromDate(departAfter);
    } else if (typeof departAfter === "string" && /^\d{1,2}:\d{2}$/.test(departAfter)) {
      const p = parseHHMM(departAfter);
      if (p !== null) thresholdMin = p;
    }

    try {
      console.log("[NS] departures station:", station, "departAfterMin:", thresholdMin);

      const data = await this.client.get<any>("departures", {
        station,
        v: 2,
      });

      const deps: any[] =
        data?.payload?.departures ??
        data?.payload?.payload?.departures ??
        data?.departures ??
        [];

      // Map to {depTimeMin, depTimeHHMM, product, direction, ...}
      const mapped = deps
        .map((d, idx) => {
          const dt = d.actualDateTime || d.plannedDateTime || "";
          const depHHMM = hhmmFromIso(dt);
          const depMin = parseHHMM(depHHMM);

          const product = String(d.product?.shortCategoryName || d.product?.categoryName || d.product || d.trainCategory || "");
          const direction = String(d.direction || d.destination || "");

          return { raw: d, idx, depHHMM, depMin, product, direction };
        })
        .filter((x) => x.depMin !== null);

      // Filter by chosen time
      let filtered = mapped.filter((x) => (x.depMin as number) >= thresholdMin);

      // Optional: filter to Intercity-ish to avoid “every minute” sprinters/buses/etc
      // Keep it forgiving: if nothing remains, we’ll relax this.
      const icOnly = filtered.filter((x) => x.product.toLowerCase().includes("ic") || x.product.toLowerCase().includes("intercity"));
      if (icOnly.length >= 2) filtered = icOnly;

      const options: RouteOption[] = filtered.slice(0, 6).map((x) => {
        const depMin = x.depMin as number;
        const arrMin = depMin + DEMO_TRAVEL_MIN;

        return {
          id: `ehv-ut-${x.idx}`,
          from: fromLabel,
          to: toLabel,
          departureTime: x.depHHMM,
          arrivalTime: formatHHMM(arrMin),
          changes: DEMO_CHANGES,
          summary: `${x.depHHMM}  ${fromLabel} → ${toLabel}`,
        };
      });

      if (options.length === 0) {
        return [
          {
            id: "fallback-empty",
            from: fromLabel,
            to: toLabel,
            summary: "No departures found after the selected time.",
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
          summary: `No live data — ${msg.slice(0, 80)}`,
          departureTime: "??:??",
          arrivalTime: "??:??",
          changes: 0,
        },
      ];
    }
  }
}