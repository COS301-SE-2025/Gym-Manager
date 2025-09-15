import { Router } from 'express';
import { MemberController } from '../../controllers/member/memberController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class MemberRoutes {
  private router: Router;
  private memberController: MemberController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = Router();
    this.memberController = new MemberController();
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // All member routes require authentication
    this.router.use(this.authMiddleware.isAuthenticated);

    // Get member's credit balance
    this.router.get('/:userId/credits', this.memberController.getCredits);

    // Purchase credits (mock payment)
    this.router.post('/:userId/credits/purchase', this.memberController.purchaseCredits);

    // Get member profile
    this.router.get('/:userId/profile', this.memberController.getMemberProfile);
  }

  getRouter(): Router {
    return this.router;
  }
}
