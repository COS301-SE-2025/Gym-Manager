import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { scheduleTemplates, templateScheduleItems, classes } from '../../db/schema';
import {
  IScheduleTemplateRepository,
  ScheduleTemplate,
  TemplateScheduleItem,
  CreateScheduleTemplateRequest,
  UpdateScheduleTemplateRequest,
  GenerateScheduleFromTemplateRequest,
  ScheduleTemplateWithItems,
} from '../../domain/interfaces/scheduleTemplate.interface';

export class ScheduleTemplateRepository implements IScheduleTemplateRepository {
  async createTemplate(request: CreateScheduleTemplateRequest): Promise<ScheduleTemplate> {
    const [template] = await db
      .insert(scheduleTemplates)
      .values({
        name: request.name,
        description: request.description,
        createdBy: request.createdBy,
      })
      .returning();

    // Insert schedule items
    if (request.scheduleItems.length > 0) {
      const itemsToInsert = request.scheduleItems.map(item => ({
        templateId: template.templateId,
        dayOfWeek: item.dayOfWeek,
        scheduledTime: item.scheduledTime,
        durationMinutes: item.durationMinutes,
        capacity: item.capacity,
        coachId: item.coachId,
        workoutId: item.workoutId,
        classTitle: item.classTitle,
      }));

      await db.insert(templateScheduleItems).values(itemsToInsert);
    }

    return template;
  }

  async getTemplateById(templateId: number): Promise<ScheduleTemplateWithItems | null> {
    const template = await db
      .select()
      .from(scheduleTemplates)
      .where(eq(scheduleTemplates.templateId, templateId))
      .limit(1);

    if (template.length === 0) {
      return null;
    }

    const items = await db
      .select()
      .from(templateScheduleItems)
      .where(eq(templateScheduleItems.templateId, templateId))
      .orderBy(templateScheduleItems.dayOfWeek, templateScheduleItems.scheduledTime);

    return {
      ...template[0],
      scheduleItems: items,
    };
  }

  async getAllTemplates(): Promise<ScheduleTemplate[]> {
    return await db
      .select()
      .from(scheduleTemplates)
      .orderBy(scheduleTemplates.createdAt);
  }

  async updateTemplate(templateId: number, request: UpdateScheduleTemplateRequest): Promise<ScheduleTemplate> {
    const updateData: any = {};
    if (request.name !== undefined) updateData.name = request.name;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.isActive !== undefined) updateData.isActive = request.isActive;
    updateData.updatedAt = new Date().toISOString();

    const [updatedTemplate] = await db
      .update(scheduleTemplates)
      .set(updateData)
      .where(eq(scheduleTemplates.templateId, templateId))
      .returning();

    // Update schedule items if provided
    if (request.scheduleItems !== undefined) {
      // Delete existing items
      await db
        .delete(templateScheduleItems)
        .where(eq(templateScheduleItems.templateId, templateId));

      // Insert new items
      if (request.scheduleItems.length > 0) {
        const itemsToInsert = request.scheduleItems.map(item => ({
          templateId: templateId,
          dayOfWeek: item.dayOfWeek,
          scheduledTime: item.scheduledTime,
          durationMinutes: item.durationMinutes,
          capacity: item.capacity,
          coachId: item.coachId,
          workoutId: item.workoutId,
          classTitle: item.classTitle,
        }));

        await db.insert(templateScheduleItems).values(itemsToInsert);
      }
    }

    return updatedTemplate;
  }

  async deleteTemplate(templateId: number): Promise<boolean> {
    // Delete schedule items first (due to foreign key constraint)
    await db
      .delete(templateScheduleItems)
      .where(eq(templateScheduleItems.templateId, templateId));

    // Delete template
    const result = await db
      .delete(scheduleTemplates)
      .where(eq(scheduleTemplates.templateId, templateId));

    return result.rowCount > 0;
  }

  async generateScheduleFromTemplate(request: GenerateScheduleFromTemplateRequest): Promise<number[]> {
    // Get template with items
    const template = await this.getTemplateById(request.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const startDate = new Date(request.startDate);
    const createdClassIds: number[] = [];

    // Generate classes for each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Find schedule items for this day
      const dayItems = template.scheduleItems.filter(item => item.dayOfWeek === dayOfWeek);

      // Create classes for each schedule item
      for (const item of dayItems) {
        const [createdClass] = await db
          .insert(classes)
          .values({
            capacity: item.capacity,
            scheduledDate: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
            scheduledTime: item.scheduledTime,
            durationMinutes: item.durationMinutes,
            coachId: item.coachId,
            workoutId: item.workoutId,
            createdBy: request.createdBy,
          })
          .returning({ classId: classes.classId });

        createdClassIds.push(createdClass.classId);
      }
    }

    return createdClassIds;
  }
}
