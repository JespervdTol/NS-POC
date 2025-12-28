import { Platform } from "react-native";
import * as Calendar from "expo-calendar";
import { BusyBlock, CalendarPermission, CalendarProvider } from "../../core/types/calendar";

export class ExpoCalendarProvider implements CalendarProvider {
  name = "ExpoCalendarProvider";

  async requestPermission(): Promise<CalendarPermission> {
    if (Platform.OS === "web") {
      return { status: "unsupported", canAskAgain: false, granted: false };
    }

    const current = await Calendar.getCalendarPermissionsAsync();

    if (current.status === "granted") {
      return { status: "granted", canAskAgain: current.canAskAgain, granted: true };
    }

    const req = await Calendar.requestCalendarPermissionsAsync();
    return {
      status: req.status as any,
      canAskAgain: req.canAskAgain,
      granted: req.status === "granted",
    };
  }

  async getBusyBlocks(params: { from: Date; to: Date }): Promise<BusyBlock[]> {
    if (Platform.OS === "web") return [];

    const perm = await this.requestPermission();
    if (!perm.granted) {
      console.log("[CAL] permission not granted:", perm.status);
      return [];
    }

    const { from, to } = params;

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    const preferredIds = calendars
      .filter((c) => c.allowsModifications || c.accessLevel === Calendar.CalendarAccessLevel.OWNER)
      .map((c) => c.id);

    const idsToUse = preferredIds.length > 0 ? preferredIds : calendars.map((c) => c.id);

    const events = await Calendar.getEventsAsync(idsToUse, from, to);

    const blocks: BusyBlock[] = events
      .filter((e) => !!e.startDate && !!e.endDate)
      .map((e) => ({
        id: e.id,
        title: e.title ?? "Calendar event",
        start: new Date(e.startDate),
        end: new Date(e.endDate),
        location: e.location ?? undefined,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    console.log("[CAL] busy blocks:", blocks.length);
    return blocks;
  }
}