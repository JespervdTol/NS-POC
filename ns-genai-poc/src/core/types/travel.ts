export type TravelDisruption = "none" | "cancelled" | "delayed";

export type RouteOption = {
  id: string;
  summary: string;
  arrivalTime: string;
  changes: number;

  from?: string;
  to?: string;
  departureTime?: string;
};

export type AlternativesQuery = {
  from?: string; // display only
  to?: string;   // display only
  station?: string; // station code for departures board, e.g. "EHV"
  departAfter?: Date | string; // ISO or "HH:MM"
};

export interface TravelDataProvider {
  name: string;
  getPlannedTrip(): Promise<{ from: string; to: string; plannedDeparture: string }>;
  getDisruption(): Promise<TravelDisruption>;
  getAlternatives(query?: AlternativesQuery): Promise<RouteOption[]>;
}