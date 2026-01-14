export type TravelDisruption = "none" | "cancelled" | "delayed";

export type AlternativesQuery = {
  from?: string;
  to?: string;
  station?: string;
  departAfter?: string;
};

export type RouteOption = {
  id: string;
  from?: string;
  to?: string;
  departureTime?: string;

  arrivalTime: string;
  changes: number;
  summary: string;
};

export interface TravelDataProvider {
  name: string;

  getPlannedTrip(): Promise<{ from: string; to: string; plannedDeparture: string }>;
  getDisruption(): Promise<TravelDisruption>;

  getAlternatives(query?: AlternativesQuery): Promise<RouteOption[]>;
}