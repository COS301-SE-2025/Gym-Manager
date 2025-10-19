import { IScheduleTemplateRepository } from '../../domain/interfaces/scheduleTemplate.interface';
import { ScheduleTemplateRepository } from '../../infrastructure/repositories/scheduleTemplateRepository';
import {
  CreateScheduleTemplateRequest,
  UpdateScheduleTemplateRequest,
  GenerateScheduleFromTemplateRequest,
  ScheduleTemplateWithItems,
} from '../../domain/entities/scheduleTemplate.entity';

export class ScheduleTemplateService {
  private scheduleTemplateRepository: IScheduleTemplateRepository;

  constructor(scheduleTemplateRepository?: IScheduleTemplateRepository) {
    this.scheduleTemplateRepository = scheduleTemplateRepository || new ScheduleTemplateRepository();
  }

  async createTemplate(request: CreateScheduleTemplateRequest) {
    // Validate schedule items
    if (request.scheduleItems.length === 0) {
      throw new Error('Template must have at least one schedule item');
    }

    // Validate day of week values (0-6)
    for (const item of request.scheduleItems) {
      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
      }
    }

    return await this.scheduleTemplateRepository.createTemplate(request);
  }

  async getTemplateById(templateId: number): Promise<ScheduleTemplateWithItems | null> {
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new Error('Invalid template ID');
    }

    return await this.scheduleTemplateRepository.getTemplateById(templateId);
  }

  async getAllTemplates() {
    return await this.scheduleTemplateRepository.getAllTemplates();
  }

  async updateTemplate(templateId: number, request: UpdateScheduleTemplateRequest) {
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new Error('Invalid template ID');
    }

    // Validate schedule items if provided
    if (request.scheduleItems !== undefined) {
      for (const item of request.scheduleItems) {
        if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
          throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
        }
      }
    }

    return await this.scheduleTemplateRepository.updateTemplate(templateId, request);
  }

  async deleteTemplate(templateId: number) {
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new Error('Invalid template ID');
    }

    return await this.scheduleTemplateRepository.deleteTemplate(templateId);
  }

  async generateScheduleFromTemplate(request: GenerateScheduleFromTemplateRequest) {
    // Validate start date
    const startDate = new Date(request.startDate);
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date format');
    }

    // Validate template exists
    const template = await this.scheduleTemplateRepository.getTemplateById(request.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.isActive) {
      throw new Error('Cannot generate schedule from inactive template');
    }

    return await this.scheduleTemplateRepository.generateScheduleFromTemplate(request);
  }
}
