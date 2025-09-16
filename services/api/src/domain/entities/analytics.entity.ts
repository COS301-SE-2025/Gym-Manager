export type LogEntry = {
  gymId: number;
  userId?: number;
  eventType: string;
  properties?: Record<string, unknown>;
  source?: string;
};
