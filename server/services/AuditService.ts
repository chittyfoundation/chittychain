import { db } from '../db';
import { audit_logs } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { getWebSocketService } from './websocket';
import { vantaIntegration } from '../integrations/vanta';

interface AuditEvent {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  requestId?: string;
  sessionId?: string;
  metadata?: any;
  dataBefore?: any;
  dataAfter?: any;
  complianceFlags?: {
    soc2?: boolean;
    hipaa?: boolean;
    pciDss?: boolean;
    gdpr?: boolean;
  };
  riskScore?: number;
  anomalyDetected?: boolean;
}

interface AuditQuery {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  complianceFilter?: string;
  limit?: number;
  offset?: number;
}

export class AuditService extends EventEmitter {
  private readonly HIGH_RISK_ACTIONS = [
    'user_delete',
    'case_delete',
    'evidence_delete',
    'permission_grant',
    'permission_revoke',
    'security_settings_change',
    'export_sensitive_data',
    'bulk_operation'
  ];

  private readonly COMPLIANCE_REQUIRED_ACTIONS = {
    soc2: [
      'login',
      'logout',
      'permission_change',
      'data_access',
      'data_modification',
      'security_event'
    ],
    hipaa: [
      'phi_access',
      'phi_modification',
      'phi_disclosure',
      'patient_record_access'
    ],
    pciDss: [
      'payment_data_access',
      'card_data_view',
      'payment_processing'
    ],
    gdpr: [
      'personal_data_access',
      'personal_data_export',
      'personal_data_delete',
      'consent_change'
    ]
  };

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.on('high_risk_event', async (event) => {
      await this.handleHighRiskEvent(event);
    });

    this.on('anomaly_detected', async (event) => {
      await this.notifySecurityTeam(event);
    });
  }

  // Log audit event with immutability
  async logEvent(event: AuditEvent): Promise<string> {
    try {
      // Generate unique audit ID
      const auditId = this.generateAuditId();
      
      // Calculate event hash for immutability
      const eventHash = this.calculateEventHash(event);
      
      // Detect anomalies
      const anomalyScore = await this.detectAnomalies(event);
      event.anomalyDetected = anomalyScore > 0.7;
      event.riskScore = anomalyScore;

      // Determine compliance flags
      event.complianceFlags = this.determineComplianceFlags(event.action);

      // Check if high-risk action
      const isHighRisk = this.HIGH_RISK_ACTIONS.includes(event.action);

      // Store in database with additional security metadata
      await db.insert(audit_logs).values({
        id: auditId,
        user_id: event.userId,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        request_id: event.requestId,
        session_id: event.sessionId,
        metadata: {
          ...event.metadata,
          eventHash,
          riskScore: event.riskScore,
          anomalyDetected: event.anomalyDetected,
          complianceFlags: event.complianceFlags,
          isHighRisk
        },
        data_before: event.dataBefore,
        data_after: event.dataAfter,
        created_at: new Date()
      });

      // Emit events for real-time monitoring
      if (isHighRisk) {
        this.emit('high_risk_event', { ...event, auditId });
      }

      if (event.anomalyDetected) {
        this.emit('anomaly_detected', { ...event, auditId });
      }

      // Send to real-time monitoring
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.emitToUser('security-team', 'audit_event', {
          auditId,
          action: event.action,
          userId: event.userId,
          riskScore: event.riskScore,
          timestamp: new Date().toISOString()
        });
      }

      // Send to Vanta for SOC2 compliance
      await vantaIntegration.logEvent({
        userId: event.userId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        metadata: event.metadata
      });

      return auditId;
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Audit logging should never fail silently
      this.emit('audit_failure', { event, error });
      throw error;
    }
  }

  // Query audit logs with compliance filtering
  async queryLogs(query: AuditQuery): Promise<{
    logs: any[];
    total: number;
    aggregations: any;
  }> {
    try {
      let dbQuery = db.select().from(audit_logs);

      // Apply filters
      const conditions = [];
      
      if (query.userId) {
        conditions.push(eq(audit_logs.user_id, query.userId));
      }
      
      if (query.action) {
        conditions.push(eq(audit_logs.action, query.action));
      }
      
      if (query.resourceType) {
        conditions.push(eq(audit_logs.resource_type, query.resourceType));
      }
      
      if (query.resourceId) {
        conditions.push(eq(audit_logs.resource_id, query.resourceId));
      }
      
      if (query.startDate) {
        conditions.push(gte(audit_logs.created_at, query.startDate));
      }
      
      if (query.endDate) {
        conditions.push(lte(audit_logs.created_at, query.endDate));
      }

      if (conditions.length > 0) {
        dbQuery = dbQuery.where(and(...conditions));
      }

      // Apply pagination
      const logs = await dbQuery
        .orderBy(desc(audit_logs.created_at))
        .limit(query.limit || 100)
        .offset(query.offset || 0);

      // Get total count
      const countResult = await db
        .select({ count: db.count() })
        .from(audit_logs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count || 0;

      // Calculate aggregations
      const aggregations = await this.calculateAggregations(logs);

      return {
        logs: logs.map(log => ({
          ...log,
          metadata: JSON.parse(log.metadata || '{}'),
          isImmutable: true,
          verificationHash: this.calculateEventHash({
            userId: log.user_id,
            action: log.action,
            resourceType: log.resource_type,
            resourceId: log.resource_id,
            ipAddress: log.ip_address,
            userAgent: log.user_agent
          })
        })),
        total,
        aggregations
      };
    } catch (error) {
      console.error('Audit query failed:', error);
      throw error;
    }
  }

  // Generate compliance reports
  async generateComplianceReport(
    compliance: 'soc2' | 'hipaa' | 'pciDss' | 'gdpr',
    startDate: Date,
    endDate: Date
  ): Promise<{
    compliance: string;
    period: { start: string; end: string };
    summary: any;
    violations: any[];
    recommendations: string[];
  }> {
    try {
      const requiredActions = this.COMPLIANCE_REQUIRED_ACTIONS[compliance];
      
      // Get all relevant logs
      const logs = await this.queryLogs({
        startDate,
        endDate,
        complianceFilter: compliance
      });

      // Analyze for violations
      const violations = await this.detectComplianceViolations(logs.logs, compliance);

      // Generate summary statistics
      const summary = {
        totalEvents: logs.total,
        coveredActions: requiredActions.length,
        violationCount: violations.length,
        riskScore: this.calculateOverallRiskScore(logs.logs),
        anomaliesDetected: logs.logs.filter(l => l.metadata?.anomalyDetected).length
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(violations, compliance);

      return {
        compliance,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary,
        violations,
        recommendations
      };
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw error;
    }
  }

  // Real-time anomaly detection
  private async detectAnomalies(event: AuditEvent): Promise<number> {
    try {
      // Get user's recent activity
      const recentActivity = await db
        .select()
        .from(audit_logs)
        .where(eq(audit_logs.user_id, event.userId))
        .orderBy(desc(audit_logs.created_at))
        .limit(100);

      let anomalyScore = 0;

      // Check for unusual time patterns
      const currentHour = new Date().getHours();
      const userActivityHours = recentActivity.map(a => 
        new Date(a.created_at).getHours()
      );
      const avgHour = userActivityHours.reduce((a, b) => a + b, 0) / userActivityHours.length;
      
      if (Math.abs(currentHour - avgHour) > 6) {
        anomalyScore += 0.3;
      }

      // Check for unusual IP address
      const userIPs = [...new Set(recentActivity.map(a => a.ip_address))];
      if (!userIPs.includes(event.ipAddress)) {
        anomalyScore += 0.4;
      }

      // Check for rapid action sequences
      const recentActions = recentActivity
        .filter(a => new Date(a.created_at) > new Date(Date.now() - 5 * 60 * 1000))
        .length;
      
      if (recentActions > 50) {
        anomalyScore += 0.3;
      }

      // Check for sensitive operations
      if (this.HIGH_RISK_ACTIONS.includes(event.action)) {
        anomalyScore += 0.2;
      }

      return Math.min(anomalyScore, 1.0);
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return 0;
    }
  }

  // Security team notification
  private async notifySecurityTeam(event: any): Promise<void> {
    try {
      // Send immediate alert
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.emitToUser('security-team', 'security_alert', {
          severity: 'high',
          event: event,
          timestamp: new Date().toISOString(),
          recommendedActions: [
            'Review user activity',
            'Verify with user',
            'Consider temporary suspension if needed'
          ]
        });
      }

      // Log security event
      await this.logEvent({
        userId: 'system',
        action: 'security_alert_generated',
        resourceType: 'security',
        resourceId: event.auditId,
        ipAddress: '0.0.0.0',
        userAgent: 'system',
        metadata: {
          originalEvent: event,
          alertSent: true
        }
      });
    } catch (error) {
      console.error('Security notification failed:', error);
    }
  }

  // Helper methods
  private generateAuditId(): string {
    return `AUDIT-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private calculateEventHash(event: Partial<AuditEvent>): string {
    const data = JSON.stringify({
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      timestamp: Date.now()
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private determineComplianceFlags(action: string): AuditEvent['complianceFlags'] {
    const flags: AuditEvent['complianceFlags'] = {};

    Object.entries(this.COMPLIANCE_REQUIRED_ACTIONS).forEach(([compliance, actions]) => {
      if (actions.includes(action)) {
        flags[compliance as keyof AuditEvent['complianceFlags']] = true;
      }
    });

    return flags;
  }

  private async calculateAggregations(logs: any[]): Promise<any> {
    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    const resourceTypeCounts: Record<string, number> = {};

    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      resourceTypeCounts[log.resource_type] = (resourceTypeCounts[log.resource_type] || 0) + 1;
    });

    return {
      byAction: actionCounts,
      byUser: userCounts,
      byResourceType: resourceTypeCounts,
      riskMetrics: {
        highRiskActions: logs.filter(l => l.metadata?.isHighRisk).length,
        anomalies: logs.filter(l => l.metadata?.anomalyDetected).length,
        averageRiskScore: logs.reduce((sum, l) => sum + (l.metadata?.riskScore || 0), 0) / logs.length
      }
    };
  }

  private async detectComplianceViolations(logs: any[], compliance: string): Promise<any[]> {
    const violations = [];
    const requiredActions = this.COMPLIANCE_REQUIRED_ACTIONS[compliance as keyof typeof this.COMPLIANCE_REQUIRED_ACTIONS];

    // Check for missing required logging
    const loggedActions = [...new Set(logs.map(l => l.action))];
    const missingActions = requiredActions.filter(a => !loggedActions.includes(a));

    if (missingActions.length > 0) {
      violations.push({
        type: 'missing_required_logging',
        severity: 'high',
        details: `Missing logs for required actions: ${missingActions.join(', ')}`
      });
    }

    // Check for suspicious patterns
    const suspiciousPatterns = logs.filter(l => l.metadata?.anomalyDetected);
    if (suspiciousPatterns.length > logs.length * 0.05) { // More than 5% anomalies
      violations.push({
        type: 'high_anomaly_rate',
        severity: 'medium',
        details: `${suspiciousPatterns.length} anomalies detected (${(suspiciousPatterns.length / logs.length * 100).toFixed(1)}%)`
      });
    }

    return violations;
  }

  private calculateOverallRiskScore(logs: any[]): number {
    if (logs.length === 0) return 0;
    
    const totalRisk = logs.reduce((sum, log) => sum + (log.metadata?.riskScore || 0), 0);
    return totalRisk / logs.length;
  }

  private generateRecommendations(violations: any[], compliance: string): string[] {
    const recommendations = [];

    if (violations.some(v => v.type === 'missing_required_logging')) {
      recommendations.push('Implement comprehensive logging for all required actions');
      recommendations.push('Set up automated alerts for missing log events');
    }

    if (violations.some(v => v.type === 'high_anomaly_rate')) {
      recommendations.push('Review and update anomaly detection thresholds');
      recommendations.push('Implement additional user verification for high-risk actions');
      recommendations.push('Consider implementing behavioral analytics');
    }

    // Compliance-specific recommendations
    if (compliance === 'soc2') {
      recommendations.push('Ensure all access controls are properly logged');
      recommendations.push('Implement regular access reviews');
    } else if (compliance === 'hipaa') {
      recommendations.push('Ensure all PHI access is logged with purpose');
      recommendations.push('Implement break-glass procedures for emergency access');
    } else if (compliance === 'pciDss') {
      recommendations.push('Ensure all payment data access is logged');
      recommendations.push('Implement data masking for sensitive fields');
    } else if (compliance === 'gdpr') {
      recommendations.push('Implement consent tracking for all data processing');
      recommendations.push('Ensure right to erasure requests are logged');
    }

    return recommendations;
  }

  private async handleHighRiskEvent(event: any): Promise<void> {
    // Implement additional security measures for high-risk events
    console.log('High-risk event detected:', event);
    
    // Could trigger additional verification, temporary account locks, etc.
  }
}

// Export singleton instance
export const auditService = new AuditService();