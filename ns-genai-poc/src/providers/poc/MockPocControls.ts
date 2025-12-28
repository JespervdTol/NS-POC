import { PocControls } from "../../core/types/poc";
import { MonitoringService } from "../../core/services/MonitoringService";
import { TravelDataProvider } from "../../core/types/travel";

// Optional capability: only available on mock travel provider, but UI never checks concrete types.
type SupportsSimulatedDisruption = TravelDataProvider & {
  setDisruption?: (d: any) => void;
};

export class MockPocControls implements PocControls {
  name = "MockPocControls";

  constructor(private deps: { travel: SupportsSimulatedDisruption; monitor: MonitoringService }) {}

  async simulateUnexpectedSituation(): Promise<void> {
    // POC: flip disruption and trigger monitoring
    const current = await this.deps.travel.getDisruption();
    const next = current === "none" ? "cancelled" : current === "cancelled" ? "delayed" : "none";

    if (this.deps.travel.setDisruption) {
      this.deps.travel.setDisruption(next);
    }

    await this.deps.monitor.checkOnce();
  }
}