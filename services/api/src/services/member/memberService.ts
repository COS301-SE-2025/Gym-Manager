import { MemberRepository } from '../../repositories/member/memberRepository';

export interface CreditPurchaseResult {
  newBalance: number;
  creditsAdded: number;
  transactionId: string;
}

export interface MemberProfile {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  creditsBalance: number;
  status: string;
  publicVisibility: boolean;
}

export class MemberService {
  private memberRepository: MemberRepository;

  constructor(memberRepository: MemberRepository) {
    this.memberRepository = memberRepository;
  }

  /**
   * Get member's current credit balance
   */
  async getCreditsBalance(userId: number): Promise<number> {
    return await this.memberRepository.getCreditsBalance(userId);
  }

  /**
   * Purchase credits with mock payment processing
   */
  async purchaseCredits(
    userId: number,
    credits: number,
    amount: number,
    paymentMethod: string,
    transactionId: string
  ): Promise<CreditPurchaseResult> {
    // Validate that the user exists and is a member
    const memberExists = await this.memberRepository.memberExists(userId);
    if (!memberExists) {
      throw new Error('User is not a member or does not exist');
    }

    // Get current balance
    const currentBalance = await this.memberRepository.getCreditsBalance(userId);

    // Add credits to the account
    const newBalance = await this.memberRepository.addCredits(userId, credits);

    // Log the transaction (in a real system, this would be stored in a transactions table)
    console.log(`Mock Payment Transaction:`, {
      userId,
      credits,
      amount,
      paymentMethod,
      transactionId,
      previousBalance: currentBalance,
      newBalance,
      timestamp: new Date().toISOString()
    });

    return {
      newBalance,
      creditsAdded: credits,
      transactionId
    };
  }

  /**
   * Get member profile information
   */
  async getMemberProfile(userId: number): Promise<MemberProfile> {
    return await this.memberRepository.getMemberProfile(userId);
  }

  /**
   * Deduct credits (used when booking classes)
   */
  async deductCredits(userId: number, credits: number): Promise<number> {
    const currentBalance = await this.memberRepository.getCreditsBalance(userId);
    
    if (currentBalance < credits) {
      throw new Error('Insufficient credits');
    }

    return await this.memberRepository.deductCredits(userId, credits);
  }

  /**
   * Add credits (used when canceling classes or purchasing)
   */
  async addCredits(userId: number, credits: number): Promise<number> {
    return await this.memberRepository.addCredits(userId, credits);
  }
}
