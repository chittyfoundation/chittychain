import { EventEmitter } from 'events';
import { db } from '../db';
import { transactions, users, audit_logs } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getWebSocketService } from './websocket';
import { auditService } from './AuditService';

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount?: number;
  fromAddress?: string;
  toAddress?: string;
  caseId?: string;
  evidenceId?: string;
  metadata: any;
  timestamp: Date;
}

interface FraudRule {
  id: string;
  name: string;
  description: string;
  condition: (tx: Transaction, context: TransactionContext) => Promise<boolean>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'flag' | 'review' | 'block';
}

interface TransactionContext {
  userHistory: Transaction[];
  recentTransactions: Transaction[];
  userProfile: any;
  ipAddress: string;
  deviceFingerprint?: string;
}

interface RiskScore {
  score: number; // 0-100
  factors: {
    factor: string;
    weight: number;
    contribution: number;
  }[];
  recommendation: 'approve' | 'review' | 'block';
}

export class TransactionMonitor extends EventEmitter {
  private fraudRules: Map<string, FraudRule> = new Map();
  private transactionQueue: Transaction[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly RISK_THRESHOLDS = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90
  };

  constructor() {
    super();
    this.initializeFraudRules();
    this.startProcessing();
  }

  private initializeFraudRules() {
    // Rule 1: Rapid successive transactions
    this.fraudRules.set('rapid_transactions', {
      id: 'rapid_transactions',
      name: 'Rapid Transaction Detection',
      description: 'Detects unusually rapid transaction sequences',
      condition: async (tx, context) => {
        const recentCount = context.recentTransactions.filter(
          t => new Date(t.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
        ).length;
        return recentCount > 10;
      },
      severity: 'medium',
      action: 'review'
    });

    // Rule 2: Unusual transaction amount
    this.fraudRules.set('unusual_amount', {
      id: 'unusual_amount',
      name: 'Unusual Amount Detection',
      description: 'Detects transactions with unusual amounts',
      condition: async (tx, context) => {
        if (!tx.amount) return false;
        
        const amounts = context.userHistory
          .filter(t => t.amount)
          .map(t => t.amount!);
        
        if (amounts.length < 5) return false;
        
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const stdDev = Math.sqrt(
          amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length
        );
        
        return Math.abs(tx.amount - avg) > 3 * stdDev;
      },
      severity: 'high',
      action: 'review'
    });

    // Rule 3: New device/location
    this.fraudRules.set('new_device', {
      id: 'new_device',
      name: 'New Device Detection',
      description: 'Detects transactions from new devices or locations',
      condition: async (tx, context) => {
        const knownDevices = context.userHistory
          .map(t => t.metadata?.deviceFingerprint)
          .filter(Boolean);
        
        return context.deviceFingerprint 
          ? !knownDevices.includes(context.deviceFingerprint)
          : false;
      },
      severity: 'medium',
      action: 'flag'
    });

    // Rule 4: After-hours activity
    this.fraudRules.set('after_hours', {
      id: 'after_hours',
      name: 'After Hours Activity',
      description: 'Detects transactions outside normal hours',
      condition: async (tx, context) => {
        const hour = new Date(tx.timestamp).getHours();
        const userTimezone = context.userProfile?.timezone || 'America/Chicago';
        
        // Adjust for timezone
        const localHour = hour; // Simplified - would use proper timezone conversion
        
        return localHour < 6 || localHour > 22;
      },
      severity: 'low',
      action: 'flag'
    });

    // Rule 5: Multiple failed attempts
    this.fraudRules.set('failed_attempts', {
      id: 'failed_attempts',
      name: 'Multiple Failed Attempts',
      description: 'Detects multiple failed transaction attempts',
      condition: async (tx, context) => {
        const failedRecent = context.recentTransactions.filter(
          t => t.metadata?.status === 'failed' &&
          new Date(t.timestamp) > new Date(Date.now() - 15 * 60 * 1000)
        ).length;
        
        return failedRecent >= 3;
      },
      severity: 'critical',
      action: 'block'
    });

    // Rule 6: Suspicious pattern matching
    this.fraudRules.set('pattern_matching', {
      id: 'pattern_matching',
      name: 'Suspicious Pattern Detection',
      description: 'Detects known fraud patterns',
      condition: async (tx, context) => {
        // Check for specific patterns
        const patterns = [
          // Rapid case creation and evidence submission
          context.recentTransactions.filter(t => t.type === 'case_create').length > 5,
          // Bulk evidence deletion
          context.recentTransactions.filter(t => t.type === 'evidence_delete').length > 3,
          // Unusual access patterns
          context.recentTransactions.filter(t => t.type === 'data_export').length > 10
        ];
        
        return patterns.some(p => p);
      },
      severity: 'high',
      action: 'block'
    });
  }

  // Monitor transaction in real-time
  async monitorTransaction(transaction: Transaction, context: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
  }): Promise<{
    allowed: boolean;
    riskScore: RiskScore;
    triggeredRules: string[];
    requiresReview: boolean;
  }> {
    try {
      // Get transaction context
      const txContext = await this.buildTransactionContext(transaction, context);
      
      // Calculate risk score
      const riskScore = await this.calculateRiskScore(transaction, txContext);
      
      // Check fraud rules
      const triggeredRules: string[] = [];
      let shouldBlock = false;
      let requiresReview = false;

      for (const [ruleId, rule] of this.fraudRules) {
        try {
          const triggered = await rule.condition(transaction, txContext);
          
          if (triggered) {
            triggeredRules.push(ruleId);
            
            if (rule.action === 'block') {
              shouldBlock = true;
            } else if (rule.action === 'review') {
              requiresReview = true;
            }
            
            // Log rule trigger
            await this.logRuleTrigger(transaction, rule, txContext);
          }
        } catch (error) {
          console.error(`Error evaluating rule ${ruleId}:`, error);
        }
      }

      // Make final decision
      const allowed = !shouldBlock && riskScore.recommendation !== 'block';
      
      // Store transaction with risk assessment
      await this.storeTransaction(transaction, {
        riskScore: riskScore.score,
        triggeredRules,
        allowed,
        requiresReview,
        context: txContext
      });

      // Emit events for monitoring
      if (!allowed || requiresReview) {
        this.emit('suspicious_transaction', {
          transaction,
          riskScore,
          triggeredRules,
          action: allowed ? 'review' : 'blocked'
        });
        
        // Send real-time alert
        const wsService = getWebSocketService();
        if (wsService) {
          wsService.emitToUser('security-team', 'fraud_alert', {
            transactionId: transaction.id,
            userId: transaction.userId,
            riskScore: riskScore.score,
            severity: this.getSeverityFromScore(riskScore.score),
            triggeredRules,
            timestamp: new Date().toISOString()
          });
        }
      }

      return {
        allowed,
        riskScore,
        triggeredRules,
        requiresReview
      };
    } catch (error) {
      console.error('Transaction monitoring error:', error);
      // Fail open - allow transaction but flag for review
      return {
        allowed: true,
        riskScore: { score: 0, factors: [], recommendation: 'review' },
        triggeredRules: [],
        requiresReview: true
      };
    }
  }

  // Calculate comprehensive risk score
  private async calculateRiskScore(
    transaction: Transaction,
    context: TransactionContext
  ): Promise<RiskScore> {
    const factors: RiskScore['factors'] = [];
    let totalScore = 0;

    // Factor 1: Transaction velocity (20% weight)
    const velocityScore = this.calculateVelocityScore(context.recentTransactions);
    factors.push({
      factor: 'transaction_velocity',
      weight: 0.2,
      contribution: velocityScore * 0.2
    });
    totalScore += velocityScore * 0.2;

    // Factor 2: Amount anomaly (25% weight)
    const amountScore = this.calculateAmountAnomalyScore(transaction, context.userHistory);
    factors.push({
      factor: 'amount_anomaly',
      weight: 0.25,
      contribution: amountScore * 0.25
    });
    totalScore += amountScore * 0.25;

    // Factor 3: Time anomaly (15% weight)
    const timeScore = this.calculateTimeAnomalyScore(transaction, context.userHistory);
    factors.push({
      factor: 'time_anomaly',
      weight: 0.15,
      contribution: timeScore * 0.15
    });
    totalScore += timeScore * 0.15;

    // Factor 4: Device/location change (20% weight)
    const deviceScore = this.calculateDeviceScore(context);
    factors.push({
      factor: 'device_change',
      weight: 0.2,
      contribution: deviceScore * 0.2
    });
    totalScore += deviceScore * 0.2;

    // Factor 5: User behavior pattern (20% weight)
    const behaviorScore = await this.calculateBehaviorScore(transaction, context);
    factors.push({
      factor: 'behavior_pattern',
      weight: 0.2,
      contribution: behaviorScore * 0.2
    });
    totalScore += behaviorScore * 0.2;

    // Determine recommendation
    let recommendation: RiskScore['recommendation'] = 'approve';
    if (totalScore >= this.RISK_THRESHOLDS.critical) {
      recommendation = 'block';
    } else if (totalScore >= this.RISK_THRESHOLDS.medium) {
      recommendation = 'review';
    }

    return {
      score: Math.min(Math.round(totalScore), 100),
      factors,
      recommendation
    };
  }

  // Build transaction context
  private async buildTransactionContext(
    transaction: Transaction,
    context: { ipAddress: string; userAgent: string; deviceFingerprint?: string }
  ): Promise<TransactionContext> {
    // Get user history
    const userHistory = await db
      .select()
      .from(transactions)
      .where(eq(transactions.user_id, transaction.userId))
      .orderBy(transactions.created_at)
      .limit(100);

    // Get recent transactions (last hour)
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, transaction.userId),
          gte(transactions.created_at, new Date(Date.now() - 60 * 60 * 1000))
        )
      );

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, transaction.userId))
      .limit(1);

    return {
      userHistory: userHistory.map(this.mapDbTransaction),
      recentTransactions: recentTransactions.map(this.mapDbTransaction),
      userProfile,
      ipAddress: context.ipAddress,
      deviceFingerprint: context.deviceFingerprint
    };
  }

  // Score calculation methods
  private calculateVelocityScore(recentTransactions: Transaction[]): number {
    const count = recentTransactions.length;
    if (count <= 5) return 0;
    if (count <= 10) return 20;
    if (count <= 20) return 50;
    if (count <= 50) return 80;
    return 100;
  }

  private calculateAmountAnomalyScore(transaction: Transaction, history: Transaction[]): number {
    if (!transaction.amount) return 0;
    
    const amounts = history.filter(t => t.amount).map(t => t.amount!);
    if (amounts.length < 5) return 0;
    
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const zScore = Math.abs((transaction.amount - mean) / stdDev);
    
    if (zScore <= 1) return 0;
    if (zScore <= 2) return 25;
    if (zScore <= 3) return 50;
    return Math.min(zScore * 20, 100);
  }

  private calculateTimeAnomalyScore(transaction: Transaction, history: Transaction[]): number {
    const hour = new Date(transaction.timestamp).getHours();
    const dayOfWeek = new Date(transaction.timestamp).getDay();
    
    // Weekend + late night = higher score
    let score = 0;
    
    if (dayOfWeek === 0 || dayOfWeek === 6) score += 20; // Weekend
    if (hour < 6 || hour > 22) score += 40; // After hours
    if (hour >= 0 && hour < 4) score += 20; // Deep night
    
    // Check against user's normal patterns
    const historicalHours = history.map(t => new Date(t.timestamp).getHours());
    const avgHour = historicalHours.reduce((a, b) => a + b, 0) / historicalHours.length;
    
    if (Math.abs(hour - avgHour) > 6) score += 20;
    
    return Math.min(score, 100);
  }

  private calculateDeviceScore(context: TransactionContext): number {
    if (!context.deviceFingerprint) return 30; // No fingerprint = suspicious
    
    const knownDevices = context.userHistory
      .map(t => t.metadata?.deviceFingerprint)
      .filter(Boolean);
    
    if (knownDevices.length === 0) return 0; // New user
    
    if (!knownDevices.includes(context.deviceFingerprint)) {
      return 60; // New device
    }
    
    return 0; // Known device
  }

  private async calculateBehaviorScore(
    transaction: Transaction,
    context: TransactionContext
  ): Promise<number> {
    let score = 0;
    
    // Check for unusual transaction types
    const typeCounts = context.userHistory.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (!typeCounts[transaction.type] || typeCounts[transaction.type] < 2) {
      score += 30; // Rare transaction type for this user
    }
    
    // Check for bulk operations
    const sameTxTypes = context.recentTransactions.filter(t => t.type === transaction.type).length;
    if (sameTxTypes > 5) score += 40;
    
    // Check for data exfiltration patterns
    const exportOps = context.recentTransactions.filter(
      t => ['data_export', 'bulk_download', 'api_dump'].includes(t.type)
    ).length;
    if (exportOps > 3) score += 30;
    
    return Math.min(score, 100);
  }

  // Store transaction with risk assessment
  private async storeTransaction(transaction: Transaction, assessment: any): Promise<void> {
    try {
      await db.insert(transactions).values({
        id: transaction.id,
        user_id: transaction.userId,
        type: transaction.type,
        from_address: transaction.fromAddress,
        to_address: transaction.toAddress,
        value: transaction.amount?.toString() || '0',
        gas_price: '0',
        gas_used: '0',
        status: assessment.allowed ? 'confirmed' : 'failed',
        block_number: 0,
        metadata: {
          ...transaction.metadata,
          riskAssessment: assessment
        }
      });
    } catch (error) {
      console.error('Failed to store transaction:', error);
    }
  }

  // Log rule trigger for audit
  private async logRuleTrigger(
    transaction: Transaction,
    rule: FraudRule,
    context: TransactionContext
  ): Promise<void> {
    await auditService.logEvent({
      userId: transaction.userId,
      action: 'fraud_rule_triggered',
      resourceType: 'transaction',
      resourceId: transaction.id,
      ipAddress: context.ipAddress,
      userAgent: context.userProfile?.lastUserAgent || 'unknown',
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        action: rule.action,
        transactionType: transaction.type
      }
    });
  }

  // Process transaction queue
  private startProcessing() {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Process every second
  }

  private async processQueue() {
    if (this.transactionQueue.length === 0) return;
    
    const batch = this.transactionQueue.splice(0, 100); // Process up to 100 at a time
    
    await Promise.all(
      batch.map(tx => this.processTransaction(tx))
    );
  }

  private async processTransaction(transaction: Transaction) {
    // Additional async processing like ML model inference
    // Pattern analysis, etc.
  }

  // Helper methods
  private mapDbTransaction(dbTx: any): Transaction {
    return {
      id: dbTx.id,
      userId: dbTx.user_id,
      type: dbTx.type,
      amount: dbTx.value ? parseFloat(dbTx.value) : undefined,
      fromAddress: dbTx.from_address,
      toAddress: dbTx.to_address,
      metadata: dbTx.metadata || {},
      timestamp: dbTx.created_at
    };
  }

  private getSeverityFromScore(score: number): string {
    if (score >= this.RISK_THRESHOLDS.critical) return 'critical';
    if (score >= this.RISK_THRESHOLDS.high) return 'high';
    if (score >= this.RISK_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  // Get fraud analytics
  async getFraudAnalytics(startDate: Date, endDate: Date): Promise<{
    totalTransactions: number;
    blockedTransactions: number;
    reviewedTransactions: number;
    fraudRate: number;
    topRules: { ruleId: string; count: number }[];
    riskDistribution: { range: string; count: number }[];
  }> {
    // This would query the analytics database
    // Returning mock data for now
    return {
      totalTransactions: 10000,
      blockedTransactions: 23,
      reviewedTransactions: 145,
      fraudRate: 0.23,
      topRules: [
        { ruleId: 'rapid_transactions', count: 45 },
        { ruleId: 'unusual_amount', count: 38 },
        { ruleId: 'new_device', count: 29 }
      ],
      riskDistribution: [
        { range: '0-25', count: 8500 },
        { range: '26-50', count: 1200 },
        { range: '51-75', count: 250 },
        { range: '76-100', count: 50 }
      ]
    };
  }

  // Manual review queue
  async getReviewQueue(): Promise<any[]> {
    const pending = await db
      .select()
      .from(transactions)
      .where(
        sql`metadata->>'requiresReview' = 'true' AND metadata->>'reviewed' IS NULL`
      )
      .orderBy(transactions.created_at)
      .limit(50);
    
    return pending;
  }

  async reviewTransaction(transactionId: string, decision: 'approve' | 'reject', reviewerId: string): Promise<void> {
    await db.update(transactions)
      .set({
        metadata: sql`
          jsonb_set(
            jsonb_set(metadata, '{reviewed}', 'true'),
            '{reviewDecision}', '"${decision}"'
          )
        `
      })
      .where(eq(transactions.id, transactionId));
    
    await auditService.logEvent({
      userId: reviewerId,
      action: 'transaction_reviewed',
      resourceType: 'transaction',
      resourceId: transactionId,
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: { decision }
    });
  }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor();