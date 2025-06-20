import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { EventEmitter } from 'events';

// Define SLO targets
export const SLO_TARGETS = {
  availability: 0.9995, // 99.95%
  latency_p99: 100, // 100ms
  error_rate: 0.001, // 0.1%
  throughput: 1000 // 1000 req/s
};

// Custom metrics for ChittyChain
export class MetricsService extends EventEmitter {
  // HTTP metrics
  private httpRequestDuration: Histogram<string>;
  private httpRequestsTotal: Counter<string>;
  private httpRequestErrors: Counter<string>;
  private httpActiveRequests: Gauge<string>;

  // Business metrics
  private casesCreated: Counter<string>;
  private evidenceSubmitted: Counter<string>;
  private blockchainTransactions: Counter<string>;
  private apiUsage: Counter<string>;
  private storageUsed: Gauge<string>;

  // Security metrics
  private authenticationAttempts: Counter<string>;
  private authenticationFailures: Counter<string>;
  private suspiciousActivities: Counter<string>;
  private auditEvents: Counter<string>;

  // Performance metrics
  private databaseQueryDuration: Histogram<string>;
  private blockchainOperationDuration: Histogram<string>;
  private ipfsOperationDuration: Histogram<string>;
  private cacheHitRate: Gauge<string>;

  // SLO metrics
  private sloAvailability: Gauge<string>;
  private sloLatency: Gauge<string>;
  private sloErrorRate: Gauge<string>;
  private sloViolations: Counter<string>;

  // Revenue metrics
  private revenueTotal: Gauge<string>;
  private subscriptionsActive: Gauge<string>;
  private churnRate: Gauge<string>;
  private mrr: Gauge<string>;

  constructor() {
    super();
    this.initializeMetrics();
    this.setupSLOMonitoring();
  }

  private initializeMetrics() {
    // HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'chittychain_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
    });

    this.httpRequestsTotal = new Counter({
      name: 'chittychain_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.httpRequestErrors = new Counter({
      name: 'chittychain_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type']
    });

    this.httpActiveRequests = new Gauge({
      name: 'chittychain_http_active_requests',
      help: 'Number of active HTTP requests',
      labelNames: ['method', 'route']
    });

    // Business metrics
    this.casesCreated = new Counter({
      name: 'chittychain_cases_created_total',
      help: 'Total number of cases created',
      labelNames: ['jurisdiction', 'case_type']
    });

    this.evidenceSubmitted = new Counter({
      name: 'chittychain_evidence_submitted_total',
      help: 'Total number of evidence items submitted',
      labelNames: ['case_id', 'evidence_type', 'size_category']
    });

    this.blockchainTransactions = new Counter({
      name: 'chittychain_blockchain_transactions_total',
      help: 'Total number of blockchain transactions',
      labelNames: ['transaction_type', 'status']
    });

    this.apiUsage = new Counter({
      name: 'chittychain_api_usage_total',
      help: 'Total API usage by endpoint and user tier',
      labelNames: ['endpoint', 'user_tier', 'user_id']
    });

    this.storageUsed = new Gauge({
      name: 'chittychain_storage_used_bytes',
      help: 'Total storage used in bytes',
      labelNames: ['storage_type', 'user_id']
    });

    // Security metrics
    this.authenticationAttempts = new Counter({
      name: 'chittychain_auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['method', 'result']
    });

    this.authenticationFailures = new Counter({
      name: 'chittychain_auth_failures_total',
      help: 'Total authentication failures',
      labelNames: ['method', 'reason']
    });

    this.suspiciousActivities = new Counter({
      name: 'chittychain_suspicious_activities_total',
      help: 'Total suspicious activities detected',
      labelNames: ['activity_type', 'severity']
    });

    this.auditEvents = new Counter({
      name: 'chittychain_audit_events_total',
      help: 'Total audit events logged',
      labelNames: ['event_type', 'resource_type', 'compliance_flag']
    });

    // Performance metrics
    this.databaseQueryDuration = new Histogram({
      name: 'chittychain_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    this.blockchainOperationDuration = new Histogram({
      name: 'chittychain_blockchain_operation_duration_seconds',
      help: 'Duration of blockchain operations in seconds',
      labelNames: ['operation_type'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60]
    });

    this.ipfsOperationDuration = new Histogram({
      name: 'chittychain_ipfs_operation_duration_seconds',
      help: 'Duration of IPFS operations in seconds',
      labelNames: ['operation_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    });

    this.cacheHitRate = new Gauge({
      name: 'chittychain_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type']
    });

    // SLO metrics
    this.sloAvailability = new Gauge({
      name: 'chittychain_slo_availability',
      help: 'Current availability percentage'
    });

    this.sloLatency = new Gauge({
      name: 'chittychain_slo_latency_p99',
      help: 'Current p99 latency in milliseconds'
    });

    this.sloErrorRate = new Gauge({
      name: 'chittychain_slo_error_rate',
      help: 'Current error rate percentage'
    });

    this.sloViolations = new Counter({
      name: 'chittychain_slo_violations_total',
      help: 'Total number of SLO violations',
      labelNames: ['slo_type']
    });

    // Revenue metrics
    this.revenueTotal = new Gauge({
      name: 'chittychain_revenue_total_usd',
      help: 'Total revenue in USD',
      labelNames: ['revenue_type']
    });

    this.subscriptionsActive = new Gauge({
      name: 'chittychain_subscriptions_active',
      help: 'Number of active subscriptions',
      labelNames: ['tier']
    });

    this.churnRate = new Gauge({
      name: 'chittychain_churn_rate',
      help: 'Monthly churn rate percentage'
    });

    this.mrr = new Gauge({
      name: 'chittychain_mrr_usd',
      help: 'Monthly recurring revenue in USD'
    });
  }

  // Record HTTP request
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    const labels = { method, route, status_code: statusCode.toString() };
    
    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
    this.httpRequestsTotal.inc(labels);
    
    if (statusCode >= 400) {
      this.httpRequestErrors.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error'
      });
    }

    // Update SLO metrics
    this.updateSLOMetrics();
  }

  // Track active requests
  incrementActiveRequests(method: string, route: string) {
    this.httpActiveRequests.inc({ method, route });
  }

  decrementActiveRequests(method: string, route: string) {
    this.httpActiveRequests.dec({ method, route });
  }

  // Business metrics
  recordCaseCreation(jurisdiction: string, caseType: string) {
    this.casesCreated.inc({ jurisdiction, case_type: caseType });
  }

  recordEvidenceSubmission(caseId: string, evidenceType: string, size: number) {
    const sizeCategory = this.categorizeSize(size);
    this.evidenceSubmitted.inc({ case_id: caseId, evidence_type: evidenceType, size_category: sizeCategory });
  }

  recordBlockchainTransaction(transactionType: string, status: 'success' | 'failure') {
    this.blockchainTransactions.inc({ transaction_type: transactionType, status });
  }

  recordApiUsage(endpoint: string, userTier: string, userId: string) {
    this.apiUsage.inc({ endpoint, user_tier: userTier, user_id: userId });
  }

  updateStorageUsage(storageType: string, userId: string, bytes: number) {
    this.storageUsed.set({ storage_type: storageType, user_id: userId }, bytes);
  }

  // Security metrics
  recordAuthenticationAttempt(method: string, success: boolean) {
    this.authenticationAttempts.inc({ method, result: success ? 'success' : 'failure' });
    
    if (!success) {
      this.authenticationFailures.inc({ method, reason: 'invalid_credentials' });
    }
  }

  recordSuspiciousActivity(activityType: string, severity: 'low' | 'medium' | 'high') {
    this.suspiciousActivities.inc({ activity_type: activityType, severity });
    
    if (severity === 'high') {
      this.emit('high_severity_alert', { activityType, timestamp: new Date() });
    }
  }

  recordAuditEvent(eventType: string, resourceType: string, complianceFlags: string[]) {
    complianceFlags.forEach(flag => {
      this.auditEvents.inc({ event_type: eventType, resource_type: resourceType, compliance_flag: flag });
    });
  }

  // Performance metrics
  recordDatabaseQuery(queryType: string, table: string, duration: number) {
    this.databaseQueryDuration.observe({ query_type: queryType, table }, duration / 1000);
  }

  recordBlockchainOperation(operationType: string, duration: number) {
    this.blockchainOperationDuration.observe({ operation_type: operationType }, duration / 1000);
  }

  recordIpfsOperation(operationType: string, duration: number) {
    this.ipfsOperationDuration.observe({ operation_type: operationType }, duration / 1000);
  }

  updateCacheHitRate(cacheType: string, hitRate: number) {
    this.cacheHitRate.set({ cache_type: cacheType }, hitRate);
  }

  // Revenue metrics
  updateRevenueMetrics(data: {
    totalRevenue: number;
    subscriptionRevenue: number;
    overageRevenue: number;
    activeSubscriptions: { [tier: string]: number };
    churnRate: number;
    mrr: number;
  }) {
    this.revenueTotal.set({ revenue_type: 'total' }, data.totalRevenue);
    this.revenueTotal.set({ revenue_type: 'subscription' }, data.subscriptionRevenue);
    this.revenueTotal.set({ revenue_type: 'overage' }, data.overageRevenue);
    
    Object.entries(data.activeSubscriptions).forEach(([tier, count]) => {
      this.subscriptionsActive.set({ tier }, count);
    });
    
    this.churnRate.set(data.churnRate);
    this.mrr.set(data.mrr);
  }

  // SLO monitoring
  private setupSLOMonitoring() {
    // Update SLO metrics every 10 seconds
    setInterval(() => {
      this.updateSLOMetrics();
    }, 10000);
  }

  private updateSLOMetrics() {
    // Calculate current SLO values
    // In production, these would query actual metrics
    const availability = 0.9998; // Mock value
    const latencyP99 = 85; // Mock value in ms
    const errorRate = 0.0008; // Mock value

    this.sloAvailability.set(availability);
    this.sloLatency.set(latencyP99);
    this.sloErrorRate.set(errorRate);

    // Check for violations
    if (availability < SLO_TARGETS.availability) {
      this.sloViolations.inc({ slo_type: 'availability' });
      this.emit('slo_violation', { type: 'availability', value: availability, target: SLO_TARGETS.availability });
    }

    if (latencyP99 > SLO_TARGETS.latency_p99) {
      this.sloViolations.inc({ slo_type: 'latency' });
      this.emit('slo_violation', { type: 'latency', value: latencyP99, target: SLO_TARGETS.latency_p99 });
    }

    if (errorRate > SLO_TARGETS.error_rate) {
      this.sloViolations.inc({ slo_type: 'error_rate' });
      this.emit('slo_violation', { type: 'error_rate', value: errorRate, target: SLO_TARGETS.error_rate });
    }
  }

  // Helper methods
  private categorizeSize(bytes: number): string {
    if (bytes < 1024 * 1024) return 'small'; // < 1MB
    if (bytes < 10 * 1024 * 1024) return 'medium'; // < 10MB
    if (bytes < 100 * 1024 * 1024) return 'large'; // < 100MB
    return 'xlarge'; // >= 100MB
  }

  // Export metrics for Prometheus
  getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Get current SLO status
  getSLOStatus() {
    return {
      availability: {
        current: this.sloAvailability.get(),
        target: SLO_TARGETS.availability,
        status: this.sloAvailability.get() >= SLO_TARGETS.availability ? 'healthy' : 'violated'
      },
      latency: {
        current: this.sloLatency.get(),
        target: SLO_TARGETS.latency_p99,
        status: this.sloLatency.get() <= SLO_TARGETS.latency_p99 ? 'healthy' : 'violated'
      },
      errorRate: {
        current: this.sloErrorRate.get(),
        target: SLO_TARGETS.error_rate,
        status: this.sloErrorRate.get() <= SLO_TARGETS.error_rate ? 'healthy' : 'violated'
      }
    };
  }
}

// Export singleton instance
export const metricsService = new MetricsService();