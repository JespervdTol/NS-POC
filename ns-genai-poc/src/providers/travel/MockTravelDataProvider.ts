import { RouteOption, TravelDataProvider, TravelDisruption } from "../../core/types/travel";

export class MockTravelDataProvider implements TravelDataProvider {
  name = "MockTravelDataProvider";

  private disruption: TravelDisruption = "none";

  async getPlannedTrip() {
    return { from: "Amsterdam", to: "Rotterdam", plannedDeparture: "14:32" };
  }

  async getDisruption(): Promise<TravelDisruption> {
    return this.disruption;
  }

  // POC convenience: let UI toggle disruption
  setDisruption(d: TravelDisruption) {
    this.disruption = d;
  }

  async getAlternatives(): Promise<RouteOption[]> {
    return [
      { id: "a", summary: "14:28 via Utrecht", arrivalTime: "15:42", changes: 1 },
      { id: "b", summary: "14:46 direct", arrivalTime: "16:05", changes: 0 },
      { id: "c", summary: "14:22 via Den Haag", arrivalTime: "15:55", changes: 1 },
    ];
  }
}