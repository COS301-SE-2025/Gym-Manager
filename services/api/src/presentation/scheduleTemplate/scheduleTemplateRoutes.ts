import { Router } from 'express';
import { ScheduleTemplateController } from '../../controllers/scheduleTemplate/scheduleTemplateController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class ScheduleTemplateRoutes {
  private router: Router;
  private scheduleTemplateController: ScheduleTemplateController;
  private authMiddleware: AuthMiddleware;

  constructor(scheduleTemplateController: ScheduleTemplateController) {
    this.router = Router();
    this.scheduleTemplateController = scheduleTemplateController;
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Create template (admin only)
    this.router.post('/', this.authMiddleware.isAuthenticated, this.scheduleTemplateController.createTemplate);

    // Get all templates
    this.router.get('/', this.scheduleTemplateController.getAllTemplates);

    // Get template by ID
    this.router.get('/:templateId', this.scheduleTemplateController.getTemplateById);

    // Update template (admin only)
    this.router.put('/:templateId', this.authMiddleware.isAuthenticated, this.scheduleTemplateController.updateTemplate);

    // Delete template (admin only)
    this.router.delete('/:templateId', this.authMiddleware.isAuthenticated, this.scheduleTemplateController.deleteTemplate);

    // Generate schedule from template (admin only)
    this.router.post('/:templateId/generate', this.authMiddleware.isAuthenticated, this.scheduleTemplateController.generateScheduleFromTemplate);
  }

  public getRouter(): Router {
    return this.router;
  }
}
