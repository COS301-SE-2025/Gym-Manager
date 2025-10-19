import { MemberRepository } from '../../repositories/member/memberRepository';
import { PaymentPackagesService } from '../paymentPackages/paymentPackagesService';

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

export interface AttendedClass {
  classId: number;
  workoutId: number | null;
  workoutName: string | null;
  workoutType: string | null;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  coachFirstName: string | null;
  coachLastName: string | null;
  attendedAt: string | null;
  score?: number | null;
  scaling: string;
}

export class MemberService {
  private memberRepository: MemberRepository;
  private paymentPackagesService: PaymentPackagesService;

  constructor(memberRepository: MemberRepository, paymentPackagesService?: PaymentPackagesService) {
    this.memberRepository = memberRepository;
    this.paymentPackagesService = paymentPackagesService || new PaymentPackagesService();
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
    transactionId: string,
  ): Promise<CreditPurchaseResult> {
    // Validate that the user exists and is a member
    const memberExists = await this.memberRepository.memberExists(userId);
    if (!memberExists) {
      throw new Error('User is not a member or does not exist');
    }

    // Get current balance
    const currentBalance = await this.memberRepository.getCreditsBalance(userId);

    // Add credits to the account (no transaction needed for purchase as it's a single operation)
    const newBalance = await this.memberRepository.addCredits(userId, credits);

    // Log the transaction (in a real system, this would be stored in a transactions table)
    // console.log(`Mock Payment Transaction:`, {
    //   userId,
    //   credits,
    //   amount,
    //   paymentMethod,
    //   transactionId,
    //   previousBalance: currentBalance,
    //   newBalance,
    //   timestamp: new Date().toISOString()
    // });

    return {
      newBalance,
      creditsAdded: credits,
      transactionId,
    };
  }

  /**
   * Purchase credits using payment packages (new system)
   */
  async purchaseCreditsWithPackage(
    userId: number,
    packageId: number,
    paymentMethod?: string,
    externalTransactionId?: string,
  ): Promise<CreditPurchaseResult> {
    // Validate that the user exists and is a member
    const memberExists = await this.memberRepository.memberExists(userId);
    if (!memberExists) {
      throw new Error('User is not a member or does not exist');
    }

    // Create payment transaction
    const transactionId = await this.paymentPackagesService.createTransaction({
      memberId: userId,
      packageId,
      paymentMethod,
      externalTransactionId,
    });

    // Get current balance
    const currentBalance = await this.memberRepository.getCreditsBalance(userId);

    // Get package details to add credits
    const packages = await this.paymentPackagesService.getActivePackages();
    const selectedPackage = packages.find((pkg) => pkg.packageId === packageId);

    if (!selectedPackage) {
      throw new Error('Payment package not found');
    }

    // Update transaction status to completed first
    await this.paymentPackagesService.updateTransactionStatus(
      transactionId,
      'completed',
      externalTransactionId,
    );

    // Add credits to the user's balance
    const newBalance = await this.memberRepository.addCredits(
      userId,
      selectedPackage.creditsAmount,
    );

    return {
      newBalance,
      creditsAdded: selectedPackage.creditsAmount,
      transactionId: transactionId.toString(),
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
  async deductCredits(userId: number, credits: number, tx?: any): Promise<number> {
    const currentBalance = await this.memberRepository.getCreditsBalance(userId);

    if (currentBalance < credits) {
      throw new Error('Insufficient credits');
    }

    return await this.memberRepository.deductCredits(userId, credits, tx);
  }

  /**
   * Add credits (used when canceling classes or purchasing)
   */
  async addCredits(userId: number, credits: number, tx?: any): Promise<number> {
    return await this.memberRepository.addCredits(userId, credits, tx);
  }

  /**
   * Get member's attended classes with details
   */
  async getAttendedClasses(userId: number): Promise<AttendedClass[]> {
    return await this.memberRepository.getAttendedClasses(userId);
  }
}
