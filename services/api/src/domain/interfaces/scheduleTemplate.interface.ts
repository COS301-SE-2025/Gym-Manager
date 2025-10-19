import {
  ScheduleTemplate,
  TemplateScheduleItem,
  CreateScheduleTemplateRequest,
  UpdateScheduleTemplateRequest,
  GenerateScheduleFromTemplateRequest,
  ScheduleTemplateWithItems,
} from '../entities/scheduleTemplate.entity';

// Re-export types from entity for convenience
export type {
  ScheduleTemplate,
  TemplateScheduleItem,
  CreateScheduleTemplateRequest,
  UpdateScheduleTemplateRequest,
  GenerateScheduleFromTemplateRequest,
  ScheduleTemplateWithItems,
};

export interface IScheduleTemplateRepository {
  createTemplate(request: CreateScheduleTemplateRequest): Promise<ScheduleTemplate>;
  getTemplateById(templateId: number): Promise<ScheduleTemplateWithItems | null>;
  getAllTemplates(): Promise<ScheduleTemplate[]>;
  updateTemplate(templateId: number, request: UpdateScheduleTemplateRequest): Promise<ScheduleTemplate>;
  deleteTemplate(templateId: number): Promise<boolean>;
  generateScheduleFromTemplate(request: GenerateScheduleFromTemplateRequest): Promise<number[]>; // Returns created class IDs
}
