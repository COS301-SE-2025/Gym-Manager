import { MemberService } from '../../../services/member/memberService';

// Mock the PaymentPackagesService
jest.mock('../../../services/paymentPackages/paymentPackagesService', () => {
  return {
    PaymentPackagesService: jest.fn().mockImplementation(() => ({
      createTransaction: jest.fn(),
      updateTransactionStatus: jest.fn(),
      getActivePackages: jest.fn(),
    })),
  };
});

describe('MemberService', () => {
  let memberService: MemberService;
  let mockMemberRepository: any;
  let mockPaymentPackagesService: any;

  beforeEach(() => {
    mockMemberRepository = {
      getCreditsBalance: jest.fn(),
      memberExists: jest.fn(),
      addCredits: jest.fn(),
      getMemberProfile: jest.fn(),
      deductCredits: jest.fn(),
    };

    mockPaymentPackagesService = {
      createTransaction: jest.fn(),
      updateTransactionStatus: jest.fn(),
      getActivePackages: jest.fn(),
    };

    memberService = new MemberService(mockMemberRepository, mockPaymentPackagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCreditsBalance', () => {
    it('should return the current credits balance', async () => {
      const userId = 1;
      const expectedBalance = 50;
      mockMemberRepository.getCreditsBalance.mockResolvedValue(expectedBalance);

      const result = await memberService.getCreditsBalance(userId);

      expect(mockMemberRepository.getCreditsBalance).toHaveBeenCalledWith(userId);
      expect(result).toBe(expectedBalance);
    });
  });

  describe('purchaseCredits', () => {
    it('should successfully purchase credits', async () => {
      const userId = 1;
      const credits = 10;
      const amount = 1000;
      const paymentMethod = 'card';
      const transactionId = 'tx_123';
      const currentBalance = 20;
      const newBalance = 30;

      mockMemberRepository.memberExists.mockResolvedValue(true);
      mockMemberRepository.getCreditsBalance.mockResolvedValue(currentBalance);
      mockMemberRepository.addCredits.mockResolvedValue(newBalance);

      const result = await memberService.purchaseCredits(
        userId,
        credits,
        amount,
        paymentMethod,
        transactionId
      );

      expect(mockMemberRepository.memberExists).toHaveBeenCalledWith(userId);
      expect(mockMemberRepository.getCreditsBalance).toHaveBeenCalledWith(userId);
      expect(mockMemberRepository.addCredits).toHaveBeenCalledWith(userId, credits);
      expect(result).toEqual({
        newBalance,
        creditsAdded: credits,
        transactionId,
      });
    });

    it('should throw error if user is not a member', async () => {
      const userId = 1;
      mockMemberRepository.memberExists.mockResolvedValue(false);

      await expect(
        memberService.purchaseCredits(userId, 10, 1000, 'card', 'tx_123')
      ).rejects.toThrow('User is not a member or does not exist');
    });
  });

  describe('purchaseCreditsWithPackage', () => {
    it('should successfully purchase credits with package', async () => {
      const userId = 1;
      const packageId = 1;
      const currentBalance = 20;
      const newBalance = 30;
      const transactionId = 123;
      const packageData = {
        packageId: 1,
        name: 'Basic Package',
        creditsAmount: 10,
        priceCents: 1000,
      };

      mockMemberRepository.memberExists.mockResolvedValue(true);
      mockMemberRepository.getCreditsBalance.mockResolvedValue(currentBalance);
      mockMemberRepository.addCredits.mockResolvedValue(newBalance);
      mockPaymentPackagesService.createTransaction.mockResolvedValue(transactionId);
      mockPaymentPackagesService.getActivePackages.mockResolvedValue([packageData]);
      mockPaymentPackagesService.updateTransactionStatus.mockResolvedValue(undefined);

      const result = await memberService.purchaseCreditsWithPackage(
        userId,
        packageId,
        'card',
        'ext_tx_123'
      );

      expect(mockMemberRepository.memberExists).toHaveBeenCalledWith(userId);
      expect(mockPaymentPackagesService.createTransaction).toHaveBeenCalledWith({
        memberId: userId,
        packageId,
        paymentMethod: 'card',
        externalTransactionId: 'ext_tx_123',
      });
      expect(mockPaymentPackagesService.getActivePackages).toHaveBeenCalled();
      expect(mockPaymentPackagesService.updateTransactionStatus).toHaveBeenCalledWith(
        transactionId,
        'completed',
        'ext_tx_123'
      );
      expect(mockMemberRepository.addCredits).toHaveBeenCalledWith(userId, packageData.creditsAmount);
      expect(result).toEqual({
        newBalance,
        creditsAdded: packageData.creditsAmount,
        transactionId: transactionId.toString(),
      });
    });

    it('should throw error if user is not a member', async () => {
      const userId = 1;
      mockMemberRepository.memberExists.mockResolvedValue(false);

      await expect(
        memberService.purchaseCreditsWithPackage(userId, 1)
      ).rejects.toThrow('User is not a member or does not exist');
    });

    it('should throw error if package not found', async () => {
      const userId = 1;
      const packageId = 999;
      const transactionId = 123;

      mockMemberRepository.memberExists.mockResolvedValue(true);
      mockPaymentPackagesService.createTransaction.mockResolvedValue(transactionId);
      mockPaymentPackagesService.getActivePackages.mockResolvedValue([]);

      await expect(
        memberService.purchaseCreditsWithPackage(userId, packageId)
      ).rejects.toThrow('Payment package not found');
    });
  });

  describe('getMemberProfile', () => {
    it('should return member profile', async () => {
      const userId = 1;
      const expectedProfile = {
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        creditsBalance: 50,
        status: 'approved',
        publicVisibility: true,
      };

      mockMemberRepository.getMemberProfile.mockResolvedValue(expectedProfile);

      const result = await memberService.getMemberProfile(userId);

      expect(mockMemberRepository.getMemberProfile).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedProfile);
    });
  });

  describe('deductCredits', () => {
    it('should successfully deduct credits', async () => {
      const userId = 1;
      const credits = 5;
      const currentBalance = 20;
      const newBalance = 15;

      mockMemberRepository.getCreditsBalance.mockResolvedValue(currentBalance);
      mockMemberRepository.deductCredits.mockResolvedValue(newBalance);

      const result = await memberService.deductCredits(userId, credits);

      expect(mockMemberRepository.getCreditsBalance).toHaveBeenCalledWith(userId);
      expect(mockMemberRepository.deductCredits).toHaveBeenCalledWith(userId, credits, undefined);
      expect(result).toBe(newBalance);
    });

    it('should throw error if insufficient credits', async () => {
      const userId = 1;
      const credits = 25;
      const currentBalance = 20;

      mockMemberRepository.getCreditsBalance.mockResolvedValue(currentBalance);

      await expect(
        memberService.deductCredits(userId, credits)
      ).rejects.toThrow('Insufficient credits');
    });

    it('should pass transaction to repository when provided', async () => {
      const userId = 1;
      const credits = 5;
      const currentBalance = 20;
      const newBalance = 15;
      const mockTx = { id: 'tx_123' };

      mockMemberRepository.getCreditsBalance.mockResolvedValue(currentBalance);
      mockMemberRepository.deductCredits.mockResolvedValue(newBalance);

      const result = await memberService.deductCredits(userId, credits, mockTx);

      expect(mockMemberRepository.deductCredits).toHaveBeenCalledWith(userId, credits, mockTx);
      expect(result).toBe(newBalance);
    });
  });

  describe('addCredits', () => {
    it('should successfully add credits', async () => {
      const userId = 1;
      const credits = 10;
      const newBalance = 30;

      mockMemberRepository.addCredits.mockResolvedValue(newBalance);

      const result = await memberService.addCredits(userId, credits);

      expect(mockMemberRepository.addCredits).toHaveBeenCalledWith(userId, credits, undefined);
      expect(result).toBe(newBalance);
    });

    it('should pass transaction to repository when provided', async () => {
      const userId = 1;
      const credits = 10;
      const newBalance = 30;
      const mockTx = { id: 'tx_123' };

      mockMemberRepository.addCredits.mockResolvedValue(newBalance);

      const result = await memberService.addCredits(userId, credits, mockTx);

      expect(mockMemberRepository.addCredits).toHaveBeenCalledWith(userId, credits, mockTx);
      expect(result).toBe(newBalance);
    });
  });
});
