export interface PocControls {
  name: string;
  simulateUnexpectedSituation(): Promise<void>;
}