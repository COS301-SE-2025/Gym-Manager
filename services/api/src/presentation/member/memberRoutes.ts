import { Router } from 'express';
import { MemberController } from '../../controllers/member/memberController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class MemberRoutes {
  private router: Router;
  private memberController: MemberController;
  private authMiddleware: AuthMiddleware;

  constructor(memberController: MemberController) {
    this.router = Router();
    this.memberController = memberController;
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    console.log('Setting up member routes...');
    
    // Test route to verify member routes are working
    this.router.get('/test', (req, res) => {
      console.log('GET /test route hit');
      res.json({ message: 'Member routes are working!' });
    });
    
    // Get member's credit balance
    this.router.get('/:userId/credits', this.authMiddleware.isAuthenticated, (req, res) => {
      console.log('GET /:userId/credits route hit');
      this.memberController.getCredits(req, res);
    });

    // Purchase credits (mock payment)
    this.router.post('/:userId/credits/purchase', this.authMiddleware.isAuthenticated, (req, res) => {
      console.log('POST /:userId/credits/purchase route hit');
      this.memberController.purchaseCredits(req, res);
    });

    // Get member profile
    this.router.get('/:userId/profile', this.authMiddleware.isAuthenticated, (req, res) => {
      console.log('GET /:userId/profile route hit');
      this.memberController.getMemberProfile(req, res);
    });
    
    console.log('Member routes setup complete');
  }

  getRouter(): Router {
    return this.router;
  }
}
