import { Request, Response } from 'express';
import { MemberService } from '../../services/member/memberService';

export class MemberController {
  private memberService: MemberService;

  constructor(memberService: MemberService) {
    this.memberService = memberService;
  }

  /**
   * Get member's current credit balance
   */
  getCredits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId, 10);

      if (isNaN(userIdNum)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const credits = await this.memberService.getCreditsBalance(userIdNum);
      res.json({ creditsBalance: credits });
    } catch (error: any) {
      console.error('Error getting credits:', error);
      if (error.message === 'Member not found') {
        res.status(404).json({ error: 'Member not found' });
      } else {
        res.status(500).json({ error: 'Failed to get credits balance' });
      }
    }
  };

  /**
   * Purchase credits (mock payment system)
   */
  purchaseCredits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { credits, amount, paymentMethod, transactionId } = req.body;

      const userIdNum = parseInt(userId, 10);

      if (isNaN(userIdNum)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (!credits || !amount || !paymentMethod || !transactionId) {
        res.status(400).json({ 
          error: 'Missing required fields: credits, amount, paymentMethod, transactionId' 
        });
        return;
      }

      if (credits <= 0 || amount <= 0) {
        res.status(400).json({ 
          error: 'Credits and amount must be positive numbers' 
        });
        return;
      }

      // Process the mock payment
      const result = await this.memberService.purchaseCredits(
        userIdNum,
        credits,
        amount,
        paymentMethod,
        transactionId
      );

      res.json({
        success: true,
        newBalance: result.newBalance,
        creditsAdded: result.creditsAdded,
        transactionId: result.transactionId,
        message: `Successfully added ${credits} credits to your account`
      });
    } catch (error) {
      console.error('Error purchasing credits:', error);
      res.status(500).json({ error: 'Failed to purchase credits' });
    }
  };

  /**
   * Get member profile information
   */
  getMemberProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId, 10);

      if (isNaN(userIdNum)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const profile = await this.memberService.getMemberProfile(userIdNum);
      res.json(profile);
    } catch (error) {
      console.error('Error getting member profile:', error);
      res.status(500).json({ error: 'Failed to get member profile' });
    }
  };
}
