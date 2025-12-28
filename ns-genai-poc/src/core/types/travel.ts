export type TravelDisruption = "none" | "cancelled" | "delayed";

export type RouteOption = {
  id: string;
  summary: string; // e.g. "14:28 via Utrecht"
  arrivalTime: string; // "HH:MM"
  changes: number;
};

export interface TravelDataProvider {
  name: string;
  getPlannedTrip(): Promise<{ from: string; to: string; plannedDeparture: string }>;
  getDisruption(): Promise<TravelDisruption>;
  getAlternatives(): Promise<RouteOption[]>;
}