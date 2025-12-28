export type CalendarPermissionStatus = "granted" | "denied" | "undetermined" | "unsupported";

export type CalendarPermission = {
  status: CalendarPermissionStatus;
  canAskAgain: boolean;
  granted: boolean;
};

export type BusyBlock = {
  id: string;
  title?: string;
  start: Date;
  end: Date;
  location?: string;
};

export type CalendarProvider = {
  name: string;

  requestPermission: () => Promise<CalendarPermission>;

  getBusyBlocks: (params: { from: Date; to: Date }) => Promise<BusyBlock[]>;
};