import axios from 'axios';

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

export interface ScheduleTemplateWithItems extends ScheduleTemplate {
  scheduleItems: TemplateScheduleItem[];
}

export interface CreateScheduleTemplateRequest {
  name: string;
  description?: string;
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
}

export const scheduleTemplateService = {
  async getAllTemplates(): Promise<ScheduleTemplate[]> {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/schedule-templates`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch schedule templates:', error);
      throw error;
    }
  },

  async getTemplateById(templateId: number): Promise<ScheduleTemplateWithItems> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule-templates/${templateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch schedule template:', error);
      throw error;
    }
  },

  async createTemplate(request: CreateScheduleTemplateRequest): Promise<ScheduleTemplate> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule-templates`,
        request,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create schedule template:', error);
      throw error;
    }
  },

  async updateTemplate(templateId: number, request: UpdateScheduleTemplateRequest): Promise<ScheduleTemplate> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule-templates/${templateId}`,
        request,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update schedule template:', error);
      throw error;
    }
  },

  async deleteTemplate(templateId: number): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule-templates/${templateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to delete schedule template:', error);
      throw error;
    }
  },

  async generateScheduleFromTemplate(request: GenerateScheduleFromTemplateRequest): Promise<{ success: boolean; createdClassIds: number[]; classesCreated: number }> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule-templates/${request.templateId}/generate`,
        { startDate: request.startDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to generate schedule from template:', error);
      throw error;
    }
  },
};
