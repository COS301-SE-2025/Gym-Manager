import { Router } from 'express';
import { MemberController } from '../../controllers/member/memberController';
import { authenticateToken } from '../../middleware/auth';

export class MemberRoutes {
  private router: Router;
  private memberController: MemberController;

  constructor() {
    this.router = Router();
    this.memberController = new MemberController();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // All member routes require authentication
    this.router.use(authenticateToken);

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
