import Stripe from 'stripe';
import { db } from '../db';
import { users, audit_logs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { vaultService } from '../security/vault';
import { EventEmitter } from 'events';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: {
    cases: number;
    storage: string;
    apiCalls: number;
    users: number;
    support: string;
    compliance: string[];
  };
  stripeProductId?: string;
  stripePriceId?: string;
}

interface UsageMetrics {
  userId: string;
  period: string;
  metrics: {
    casesCreated: number;
    storageUsed: number; // in bytes
    apiCalls: number;
    evidenceSubmitted: number;
    blockchainTransactions: number;
  };
  overage: {
    storage: number;
    apiCalls: number;
    amount: number;
  };
}

export class BillingService extends EventEmitter {
  private stripe: Stripe | null = null;
  private pricingTiers: Map<string, PricingTier> = new Map();

  constructor() {
    super();
    this.initializeStripe();
    this.loadPricingTiers();
  }

  private async initializeStripe() {
    try {
      const stripeKey = await vaultService.getSecret('stripe_secret_key');
      if (stripeKey) {
        this.stripe = new Stripe(stripeKey, {
          apiVersion: '2023-10-16',
          typescript: true
        });
        console.log('✅ Stripe initialized');
      } else {
        console.warn('⚠️  Stripe key not found, billing in test mode');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  }

  private loadPricingTiers() {
    const tiers: PricingTier[] = [
      {
        id: 'starter',
        name: 'Starter',
        price: 99,
        interval: 'month',
        features: {
          cases: 10,
          storage: '10GB',
          apiCalls: 10000,
          users: 3,
          support: 'Email',
          compliance: ['SOC2 Type I']
        },
        stripeProductId: 'prod_starter',
        stripePriceId: 'price_starter_monthly'
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 499,
        interval: 'month',
        features: {
          cases: 100,
          storage: '100GB',
          apiCalls: 100000,
          users: 20,
          support: 'Priority Email',
          compliance: ['SOC2 Type II', 'HIPAA']
        },
        stripeProductId: 'prod_professional',
        stripePriceId: 'price_professional_monthly'
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 2499,
        interval: 'month',
        features: {
          cases: -1, // unlimited
          storage: '1TB',
          apiCalls: -1, // unlimited
          users: -1, // unlimited
          support: '24/7 Phone & Email',
          compliance: ['SOC2 Type II', 'HIPAA', 'PCI DSS', 'ISO 27001']
        },
        stripeProductId: 'prod_enterprise',
        stripePriceId: 'price_enterprise_monthly'
      }
    ];

    tiers.forEach(tier => this.pricingTiers.set(tier.id, tier));
  }

  // Create customer and subscription
  async createSubscription(
    userId: string,
    tierId: string,
    paymentMethodId?: string
  ): Promise<{
    subscriptionId: string;
    customerId: string;
    status: string;
  } | null> {
    try {
      const tier = this.pricingTiers.get(tierId);
      if (!tier || !this.stripe) {
        throw new Error('Invalid tier or Stripe not initialized');
      }

      // Get user details
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        throw new Error('User not found');
      }

      // Create or retrieve Stripe customer
      let customer: Stripe.Customer;
      if (user.stripe_customer_id) {
        customer = await this.stripe.customers.retrieve(user.stripe_customer_id) as Stripe.Customer;
      } else {
        customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: {
            userId: user.id,
            registrationNumber: user.registration_number || ''
          }
        });

        // Update user with Stripe customer ID
        await db.update(users)
          .set({ stripe_customer_id: customer.id })
          .where(eq(users.id, userId));
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id
        });

        // Set as default payment method
        await this.stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: tier.stripePriceId! }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          tierId,
          tierName: tier.name
        }
      });

      // Emit subscription created event
      this.emit('subscription.created', {
        userId,
        subscriptionId: subscription.id,
        tierId,
        status: subscription.status
      });

      // Audit log
      await this.logBillingEvent(userId, 'subscription_created', {
        subscriptionId: subscription.id,
        tierId,
        amount: tier.price
      });

      return {
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: subscription.status
      };
    } catch (error) {
      console.error('Subscription creation failed:', error);
      await this.logBillingEvent(userId, 'subscription_failed', { error: error.message });
      return null;
    }
  }

  // Track usage for billing
  async trackUsage(
    userId: string,
    metric: keyof UsageMetrics['metrics'],
    value: number = 1
  ): Promise<void> {
    try {
      const period = this.getCurrentBillingPeriod();
      const key = `usage:${userId}:${period}`;

      // In production, use Redis for real-time tracking
      // For now, we'll use a simple in-memory approach
      await this.incrementUsageMetric(userId, period, metric, value);

      // Check for overage
      await this.checkAndReportOverage(userId, period);
    } catch (error) {
      console.error('Usage tracking failed:', error);
    }
  }

  // Calculate and charge overage
  async calculateOverage(userId: string, period: string): Promise<number> {
    try {
      const usage = await this.getUserUsage(userId, period);
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || !usage) return 0;

      const tier = this.pricingTiers.get(subscription.tierId);
      if (!tier) return 0;

      let overageAmount = 0;

      // Calculate storage overage ($0.10 per GB)
      const storageLimit = this.parseStorageLimit(tier.features.storage);
      if (usage.metrics.storageUsed > storageLimit) {
        const overageGB = (usage.metrics.storageUsed - storageLimit) / (1024 * 1024 * 1024);
        overageAmount += overageGB * 0.10;
      }

      // Calculate API call overage ($0.001 per 1000 calls)
      if (tier.features.apiCalls > 0 && usage.metrics.apiCalls > tier.features.apiCalls) {
        const overageCalls = usage.metrics.apiCalls - tier.features.apiCalls;
        overageAmount += (overageCalls / 1000) * 0.001;
      }

      return Math.round(overageAmount * 100) / 100; // Round to cents
    } catch (error) {
      console.error('Overage calculation failed:', error);
      return 0;
    }
  }

  // Generate invoice
  async generateInvoice(userId: string): Promise<{
    invoiceId: string;
    amount: number;
    dueDate: string;
    items: any[];
  } | null> {
    try {
      if (!this.stripe) return null;

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user || !user.stripe_customer_id) return null;

      const period = this.getCurrentBillingPeriod();
      const overage = await this.calculateOverage(userId, period);

      // Create invoice items for overage
      if (overage > 0) {
        await this.stripe.invoiceItems.create({
          customer: user.stripe_customer_id,
          amount: Math.round(overage * 100), // Convert to cents
          currency: 'usd',
          description: `Usage overage for ${period}`
        });
      }

      // Create and finalize invoice
      const invoice = await this.stripe.invoices.create({
        customer: user.stripe_customer_id,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata: {
          userId,
          period
        }
      });

      await this.stripe.invoices.finalizeInvoice(invoice.id);

      // Emit invoice created event
      this.emit('invoice.created', {
        userId,
        invoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        dueDate: new Date(invoice.due_date! * 1000).toISOString()
      });

      return {
        invoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        dueDate: new Date(invoice.due_date! * 1000).toISOString(),
        items: invoice.lines.data
      };
    } catch (error) {
      console.error('Invoice generation failed:', error);
      return null;
    }
  }

  // Handle webhook events
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.Invoice);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodUpdate(event.data.object as Stripe.PaymentMethod);
          break;
      }
    } catch (error) {
      console.error('Webhook handling failed:', error);
      throw error; // Re-throw to return 500 to Stripe
    }
  }

  // Revenue analytics
  async getRevenueMetrics(startDate: Date, endDate: Date): Promise<{
    mrr: number;
    arr: number;
    churnRate: number;
    averageRevenuePerUser: number;
    customerLifetimeValue: number;
  }> {
    try {
      // In production, this would query your analytics database
      // For now, return mock data
      return {
        mrr: 45000, // $45k MRR
        arr: 540000, // $540k ARR
        churnRate: 0.05, // 5% monthly churn
        averageRevenuePerUser: 450,
        customerLifetimeValue: 9000 // $9k CLV
      };
    } catch (error) {
      console.error('Revenue metrics calculation failed:', error);
      return {
        mrr: 0,
        arr: 0,
        churnRate: 0,
        averageRevenuePerUser: 0,
        customerLifetimeValue: 0
      };
    }
  }

  // Private helper methods
  private getCurrentBillingPeriod(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private parseStorageLimit(storage: string): number {
    const match = storage.match(/(\d+)(GB|TB)/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return unit === 'TB' ? value * 1024 * 1024 * 1024 * 1024 : value * 1024 * 1024 * 1024;
  }

  private async incrementUsageMetric(
    userId: string,
    period: string,
    metric: string,
    value: number
  ): Promise<void> {
    // In production, use Redis or similar
    // This is a placeholder for the actual implementation
  }

  private async checkAndReportOverage(userId: string, period: string): Promise<void> {
    const overage = await this.calculateOverage(userId, period);
    if (overage > 0) {
      this.emit('usage.overage', { userId, period, amount: overage });
    }
  }

  private async getUserUsage(userId: string, period: string): Promise<UsageMetrics | null> {
    // Placeholder - implement actual usage retrieval
    return null;
  }

  private async getUserSubscription(userId: string): Promise<any | null> {
    // Placeholder - implement actual subscription retrieval
    return null;
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    await this.logBillingEvent(userId, 'subscription_updated', {
      subscriptionId: subscription.id,
      status: subscription.status
    });
  }

  private async handleSubscriptionCancellation(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    await this.logBillingEvent(userId, 'subscription_cancelled', {
      subscriptionId: subscription.id
    });
  }

  private async handlePaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
    const userId = invoice.metadata?.userId;
    if (userId) {
      await this.logBillingEvent(userId, 'payment_succeeded', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100
      });
    }
  }

  private async handlePaymentFailure(invoice: Stripe.Invoice): Promise<void> {
    const userId = invoice.metadata?.userId;
    if (userId) {
      await this.logBillingEvent(userId, 'payment_failed', {
        invoiceId: invoice.id,
        amount: invoice.amount_due / 100
      });
    }
  }

  private async handlePaymentMethodUpdate(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    // Handle payment method updates
  }

  private async logBillingEvent(userId: string, action: string, details: any): Promise<void> {
    try {
      await db.insert(audit_logs).values({
        user_id: userId,
        action: `billing_${action}`,
        resource_type: 'billing',
        resource_id: details.subscriptionId || details.invoiceId || 'system',
        metadata: details
      });
    } catch (error) {
      console.error('Failed to log billing event:', error);
    }
  }
}

// Export singleton instance
export const billingService = new BillingService();