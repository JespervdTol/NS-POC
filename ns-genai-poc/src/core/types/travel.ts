export type TravelDisruption = "none" | "cancelled" | "delayed";

export type RouteOption = {
  id: string;
  summary: string;
  arrivalTime: string;
  changes: number;
};

export interface TravelDataProvider {
  name: string;
  getPlannedTrip(): Promise<{ from: string; to: string; plannedDeparture: string }>;
  getDisruption(): Promise<TravelDisruption>;
  getAlternatives(): Promise<RouteOption[]>;
}