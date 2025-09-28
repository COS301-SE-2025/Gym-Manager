export type LogEntry = {
  id: number;
  gymId: number;
  userId: number | null;
  eventType: string;
  properties: unknown;
  source: string | null;
  createdAt: Date | null;
};

export type CreateLogEntry = {
  gymId: number;
  userId: number | null;
  eventType: string;
  properties?: unknown;
  source?: string | null;
};
