import { BusyBlock, CalendarPermission, CalendarProvider } from "../../core/types/calendar";

export class MockCalendarProvider implements CalendarProvider {
  name = "MockCalendarProvider";

  async requestPermission(): Promise<CalendarPermission> {
    return "granted";
  }

  async getBusyBlocks(params: { from: Date; to: Date }): Promise<BusyBlock[]> {
    // Simulate one meeting 3 hours from now, lasting 30 minutes
    const start = new Date(params.from);
    start.setHours(start.getHours() + 3);
    start.setMinutes(0, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    return [{ start, end }];
  }
}