export interface ScheduleTemplate {
  templateId: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateScheduleItem {
  itemId: number;
  templateId: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  scheduledTime: string;
  durationMinutes: number;
  capacity: number;
  coachId?: number;
  workoutId?: number;
  classTitle?: string;
}

export interface CreateScheduleTemplateRequest {
  name: string;
  description?: string;
  createdBy: number;
  scheduleItems: Omit<TemplateScheduleItem, 'itemId' | 'templateId'>[];
}

export interface UpdateScheduleTemplateRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  scheduleItems?: Omit<TemplateScheduleItem, 'itemId' | 'templateId'>[];
}

export interface GenerateScheduleFromTemplateRequest {
  templateId: number;
  startDate: string; // YYYY-MM-DD format
  createdBy: number;
}

export interface ScheduleTemplateWithItems extends ScheduleTemplate {
  scheduleItems: TemplateScheduleItem[];
}
