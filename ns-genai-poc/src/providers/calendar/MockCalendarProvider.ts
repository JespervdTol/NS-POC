import { BusyBlock, CalendarPermission, CalendarProvider } from "../../core/types/calendar";

export class MockCalendarProvider implements CalendarProvider {
  name = "MockCalendarProvider";

  async requestPermission(): Promise<CalendarPermission> {
    return { status: "granted", canAskAgain: true, granted: true };
  }

  async getBusyBlocks(_: { from: Date; to: Date }): Promise<BusyBlock[]> {
    // Mock = no busy blocks by default
    return [];
  }
}