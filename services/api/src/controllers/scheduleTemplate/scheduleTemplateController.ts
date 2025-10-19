import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { ScheduleTemplateService } from '../../services/scheduleTemplate/scheduleTemplateService';
import {
  CreateScheduleTemplateRequest,
  UpdateScheduleTemplateRequest,
  GenerateScheduleFromTemplateRequest,
} from '../../domain/entities/scheduleTemplate.entity';

export class ScheduleTemplateController {
  private scheduleTemplateService: ScheduleTemplateService;

  constructor(scheduleTemplateService?: ScheduleTemplateService) {
    this.scheduleTemplateService = scheduleTemplateService || new ScheduleTemplateService();
  }

  createTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, description, scheduleItems } = req.body;
      const createdBy = req.user?.userId;

      if (!createdBy) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!name || !scheduleItems || !Array.isArray(scheduleItems)) {
        return res.status(400).json({ error: 'Name and scheduleItems are required' });
      }

      const request: CreateScheduleTemplateRequest = {
        name,
        description,
        createdBy,
        scheduleItems,
      };

      const template = await this.scheduleTemplateService.createTemplate(request);
      return res.status(201).json(template);
    } catch (error: any) {
      console.error('createTemplate error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create template' });
    }
  };

  getTemplateById = async (req: Request, res: Response) => {
    try {
      const templateId = Number(req.params.templateId);
      if (!Number.isFinite(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const template = await this.scheduleTemplateService.getTemplateById(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      return res.json(template);
    } catch (error: any) {
      console.error('getTemplateById error:', error);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }
  };

  getAllTemplates = async (_req: Request, res: Response) => {
    try {
      const templates = await this.scheduleTemplateService.getAllTemplates();
      return res.json(templates);
    } catch (error: any) {
      console.error('getAllTemplates error:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
  };

  updateTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templateId = Number(req.params.templateId);
      if (!Number.isFinite(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const { name, description, isActive, scheduleItems } = req.body;
      const request: UpdateScheduleTemplateRequest = {};

      if (name !== undefined) request.name = name;
      if (description !== undefined) request.description = description;
      if (isActive !== undefined) request.isActive = isActive;
      if (scheduleItems !== undefined) request.scheduleItems = scheduleItems;

      const updatedTemplate = await this.scheduleTemplateService.updateTemplate(templateId, request);
      return res.json(updatedTemplate);
    } catch (error: any) {
      console.error('updateTemplate error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update template' });
    }
  };

  deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templateId = Number(req.params.templateId);
      if (!Number.isFinite(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const deleted = await this.scheduleTemplateService.deleteTemplate(templateId);
      if (!deleted) {
        return res.status(404).json({ error: 'Template not found' });
      }

      return res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error: any) {
      console.error('deleteTemplate error:', error);
      return res.status(500).json({ error: 'Failed to delete template' });
    }
  };

  generateScheduleFromTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templateId = Number(req.params.templateId);
      const { startDate } = req.body;
      const createdBy = req.user?.userId;

      if (!createdBy) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!Number.isFinite(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      if (!startDate) {
        return res.status(400).json({ error: 'Start date is required' });
      }

      const request: GenerateScheduleFromTemplateRequest = {
        templateId,
        startDate,
        createdBy,
      };

      const createdClassIds = await this.scheduleTemplateService.generateScheduleFromTemplate(request);
      return res.status(201).json({ 
        success: true, 
        message: 'Schedule generated successfully',
        createdClassIds,
        classesCreated: createdClassIds.length
      });
    } catch (error: any) {
      console.error('generateScheduleFromTemplate error:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate schedule' });
    }
  };
}
