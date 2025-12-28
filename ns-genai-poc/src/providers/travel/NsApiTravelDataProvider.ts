import { RouteOption, TravelDataProvider, TravelDisruption } from "../../core/types/travel";
import { NsReisinfoClient } from "./NsReisinfoClient";

export class NsApiTravelDataProvider implements TravelDataProvider {
  name = "NsApiTravelDataProvider";
  private client: NsReisinfoClient;

  // Demo station (Utrecht Centraal)
  private station = "UT";

  constructor(private deps: { baseUrl: string }) {
    this.client = new NsReisinfoClient({ baseUrl: deps.baseUrl });
  }

  async getPlannedTrip() {
    // POC: static planned trip; later from user’s journey/planner
    return { from: "Amsterdam", to: "Rotterdam", plannedDeparture: "14:32" };
  }

  async getDisruption(): Promise<TravelDisruption> {
    // POC: disruptions not interpreted yet
    return "none";
  }

  async getAlternatives(): Promise<RouteOption[]> {
    try {
      console.log("[NS] baseUrl (provider):", this.deps.baseUrl);
      console.log("[NS] station:", this.station);

      const data = await this.client.get<any>("arrivals", {
        station: this.station,
        v: 2,
      });

      const arrivals: any[] =
        data?.payload?.arrivals ??
        data?.payload?.payload?.arrivals ??
        data?.arrivals ??
        [];

      console.log("[NS] arrivals length:", arrivals.length);

      const options: RouteOption[] = arrivals.slice(0, 3).map((a, idx) => {
        const dt = a.actualDateTime || a.plannedDateTime || "";
        const time = typeof dt === "string" && dt.length >= 16 ? dt.slice(11, 16) : "??:??";

        const name = a.name || "Train";
        const origin = a.origin || a.direction || "Unknown";

        return {
          id: `ns-${idx}`,
          summary: `${time} ${name} from ${origin}`,
          arrivalTime: time,
          changes: 0,
        };
      });

      if (options.length === 0) {
        return [
          {
            id: "fallback-empty",
            summary: "Live data reachable but no arrivals returned",
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
          summary: `No live data — ${msg.slice(0, 60)}`,
          arrivalTime: "??:??",
          changes: 0,
        },
      ];
    }
  }
}