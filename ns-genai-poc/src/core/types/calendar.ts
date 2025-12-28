export type BusyBlock = {
  start: Date;
  end: Date;
};

export type CalendarPermission = "granted" | "denied" | "undetermined";

export interface CalendarProvider {
  name: string;
  requestPermission(): Promise<CalendarPermission>;
  getBusyBlocks(params: { from: Date; to: Date }): Promise<BusyBlock[]>;
}