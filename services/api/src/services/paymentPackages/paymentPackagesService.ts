import { db } from '../../db/client';
import { 
  paymentPackages, 
  paymentTransactions, 
  monthlyRevenue, 
  userFinancialMetrics,
  members,
  users
} from '../../db/schema';
import { eq, and, desc, sql, count, avg, sum } from 'drizzle-orm';

export interface PaymentPackage {
  packageId: number;
  name: string;
  description?: string;
  creditsAmount: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPackageRequest {
  name: string;
  description?: string;
  creditsAmount: number;
  priceCents: number;
  currency?: string;
}

export interface UpdatePaymentPackageRequest {
  name?: string;
  description?: string;
  creditsAmount?: number;
  priceCents?: number;
  currency?: string;
  isActive?: boolean;
}

export interface PaymentTransaction {
  transactionId: number;
  memberId: number;
  packageId: number;
  amountCents: number;
  creditsPurchased: number;
  paymentMethod?: string;
  paymentStatus: string;
  externalTransactionId?: string;
  processedAt?: string;
  createdAt: string;
}

export interface CreatePaymentTransactionRequest {
  memberId: number;
  packageId: number;
  paymentMethod?: string;
  externalTransactionId?: string;
}

export interface FinancialAnalytics {
  monthlyRecurringRevenue: {
    current: number;
    previous: number;
    growth: number;
  };
  averageRevenuePerUser: {
    current: number;
    previous: number;
    growth: number;
  };
  lifetimeValue: {
    average: number;
    median: number;
  };
  revenueTrends: Array<{
    year: number;
    month: number;
    revenue: number;
    growth: number;
  }>;
}

export class PaymentPackagesService {
  /**
   * Get all active payment packages
   */
  async getActivePackages(): Promise<PaymentPackage[]> {
    const packages = await db
      .select()
      .from(paymentPackages)
      .where(eq(paymentPackages.isActive, true))
      .orderBy(desc(paymentPackages.createdAt));

    return packages.map(pkg => ({
      packageId: pkg.packageId,
      name: pkg.name,
      description: pkg.description || undefined,
      creditsAmount: pkg.creditsAmount,
      priceCents: pkg.priceCents,
      currency: pkg.currency || 'USD',
      isActive: pkg.isActive,
      createdBy: pkg.createdBy || undefined,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    }));
  }

  /**
   * Get all payment packages (admin only)
   */
  async getAllPackages(): Promise<PaymentPackage[]> {
    const packages = await db
      .select()
      .from(paymentPackages)
      .orderBy(desc(paymentPackages.createdAt));

    return packages.map(pkg => ({
      packageId: pkg.packageId,
      name: pkg.name,
      description: pkg.description || undefined,
      creditsAmount: pkg.creditsAmount,
      priceCents: pkg.priceCents,
      currency: pkg.currency || 'USD',
      isActive: pkg.isActive,
      createdBy: pkg.createdBy || undefined,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    }));
  }

  /**
   * Create a new payment package (admin only)
   */
  async createPackage(adminId: number, packageData: CreatePaymentPackageRequest): Promise<number> {
    const [newPackage] = await db
      .insert(paymentPackages)
      .values({
        name: packageData.name,
        description: packageData.description,
        creditsAmount: packageData.creditsAmount,
        priceCents: packageData.priceCents,
        currency: packageData.currency || 'USD',
        createdBy: adminId,
      })
      .returning({ packageId: paymentPackages.packageId });

    return newPackage.packageId;
  }

  /**
   * Update a payment package (admin only)
   */
  async updatePackage(packageId: number, packageData: UpdatePaymentPackageRequest): Promise<void> {
    await db
      .update(paymentPackages)
      .set({
        ...packageData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentPackages.packageId, packageId));
  }

  /**
   * Delete a payment package (admin only)
   */
  async deletePackage(packageId: number): Promise<void> {
    await db
      .delete(paymentPackages)
      .where(eq(paymentPackages.packageId, packageId));
  }

  /**
   * Create a payment transaction
   */
  async createTransaction(transactionData: CreatePaymentTransactionRequest): Promise<number> {
    // Get package details
    const [packageData] = await db
      .select()
      .from(paymentPackages)
      .where(eq(paymentPackages.packageId, transactionData.packageId));

    if (!packageData) {
      throw new Error('Payment package not found');
    }

    const [newTransaction] = await db
      .insert(paymentTransactions)
      .values({
        memberId: transactionData.memberId,
        packageId: transactionData.packageId,
        amountCents: packageData.priceCents,
        creditsPurchased: packageData.creditsAmount,
        paymentMethod: transactionData.paymentMethod,
        externalTransactionId: transactionData.externalTransactionId,
      })
      .returning({ transactionId: paymentTransactions.transactionId });

    return newTransaction.transactionId;
  }

  /**
   * Update payment transaction status
   */
  async updateTransactionStatus(
    transactionId: number, 
    status: string, 
    externalTransactionId?: string
  ): Promise<void> {
    const updateData: any = {
      paymentStatus: status,
    };

    if (status === 'completed') {
      updateData.processedAt = new Date().toISOString();
    }

    if (externalTransactionId) {
      updateData.externalTransactionId = externalTransactionId;
    }

    await db
      .update(paymentTransactions)
      .set(updateData)
      .where(eq(paymentTransactions.transactionId, transactionId));
  }

  /**
   * Get financial analytics
   */
  async getFinancialAnalytics(): Promise<FinancialAnalytics> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Get current month revenue
    const [currentRevenue] = await db
      .select({
        totalRevenue: sum(monthlyRevenue.totalRevenueCents),
      })
      .from(monthlyRevenue)
      .where(
        and(
          eq(monthlyRevenue.year, currentYear),
          eq(monthlyRevenue.month, currentMonth)
        )
      );

    // Get previous month revenue
    const [previousRevenue] = await db
      .select({
        totalRevenue: sum(monthlyRevenue.totalRevenueCents),
      })
      .from(monthlyRevenue)
      .where(
        and(
          eq(monthlyRevenue.year, previousYear),
          eq(monthlyRevenue.month, previousMonth)
        )
      );

    // Get total active members
    const [memberCount] = await db
      .select({
        count: count(members.userId),
      })
      .from(members)
      .where(eq(members.status, 'approved'));

    // Calculate MRR (using current month as proxy)
    const currentMRR = currentRevenue?.totalRevenue || 0;
    const previousMRR = previousRevenue?.totalRevenue || 0;
    const mrrGrowth = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;

    // Calculate ARPU
    const currentARPU = memberCount.count > 0 ? currentMRR / memberCount.count : 0;
    const previousARPU = memberCount.count > 0 ? previousMRR / memberCount.count : 0;
    const arpuGrowth = previousARPU > 0 ? ((currentARPU - previousARPU) / previousARPU) * 100 : 0;

    // Get lifetime value metrics
    const [ltvData] = await db
      .select({
        averageLTV: avg(userFinancialMetrics.lifetimeValueCents),
        medianLTV: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${userFinancialMetrics.lifetimeValueCents})`,
      })
      .from(userFinancialMetrics);

    // Get revenue trends (last 12 months)
    const revenueTrends = await db
      .select({
        year: monthlyRevenue.year,
        month: monthlyRevenue.month,
        revenue: monthlyRevenue.totalRevenueCents,
      })
      .from(monthlyRevenue)
      .orderBy(monthlyRevenue.year, monthlyRevenue.month)
      .limit(12);

    // Calculate growth for each month
    const trendsWithGrowth = revenueTrends.map((trend, index) => {
      const previousTrend = index > 0 ? revenueTrends[index - 1] : null;
      const growth = previousTrend && previousTrend.revenue > 0 
        ? ((trend.revenue - previousTrend.revenue) / previousTrend.revenue) * 100 
        : 0;

      return {
        year: trend.year,
        month: trend.month,
        revenue: trend.revenue || 0,
        growth: Math.round(growth * 100) / 100,
      };
    });

    return {
      monthlyRecurringRevenue: {
        current: currentMRR,
        previous: previousMRR,
        growth: Math.round(mrrGrowth * 100) / 100,
      },
      averageRevenuePerUser: {
        current: Math.round(currentARPU),
        previous: Math.round(previousARPU),
        growth: Math.round(arpuGrowth * 100) / 100,
      },
      lifetimeValue: {
        average: Math.round(ltvData?.averageLTV || 0),
        median: Math.round(ltvData?.medianLTV || 0),
      },
      revenueTrends: trendsWithGrowth,
    };
  }

  /**
   * Get member's transaction history
   */
  async getMemberTransactions(memberId: number): Promise<PaymentTransaction[]> {
    const transactions = await db
      .select({
        transactionId: paymentTransactions.transactionId,
        memberId: paymentTransactions.memberId,
        packageId: paymentTransactions.packageId,
        amountCents: paymentTransactions.amountCents,
        creditsPurchased: paymentTransactions.creditsPurchased,
        paymentMethod: paymentTransactions.paymentMethod,
        paymentStatus: paymentTransactions.paymentStatus,
        externalTransactionId: paymentTransactions.externalTransactionId,
        processedAt: paymentTransactions.processedAt,
        createdAt: paymentTransactions.createdAt,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.memberId, memberId))
      .orderBy(desc(paymentTransactions.createdAt));

    return transactions.map(tx => ({
      transactionId: tx.transactionId,
      memberId: tx.memberId,
      packageId: tx.packageId,
      amountCents: tx.amountCents,
      creditsPurchased: tx.creditsPurchased,
      paymentMethod: tx.paymentMethod || undefined,
      paymentStatus: tx.paymentStatus,
      externalTransactionId: tx.externalTransactionId || undefined,
      processedAt: tx.processedAt || undefined,
      createdAt: tx.createdAt,
    }));
  }
}
