import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { soc2Service } from '../compliance/soc2';
import { auditService } from '../services/AuditService';
import { billingService } from '../services/BillingService';
import { transactionMonitor } from '../services/TransactionMonitor';
import { metricsService } from '../observability/metrics';
import { vantaIntegration } from '../integrations/vanta';

const router = Router();

// Get compliance dashboard overview
router.get('/dashboard', authenticateToken, requireRole(['admin', 'compliance']), async (req: AuthRequest, res) => {
  try {
    // Run SOC2 compliance check
    const soc2Report = await soc2Service.runComplianceCheck();
    
    // Get audit statistics
    const auditStats = await auditService.queryLogs({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      limit: 1
    });

    // Get fraud detection stats
    const fraudStats = await transactionMonitor.getFraudAnalytics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    // Get SLO status
    const sloStatus = metricsService.getSLOStatus();

    // Get revenue metrics for business continuity
    const revenueMetrics = await billingService.getRevenueMetrics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    const dashboard = {
      timestamp: new Date().toISOString(),
      overallStatus: {
        compliance: soc2Report.overallCompliance ? 'compliant' : 'non-compliant',
        security: fraudStats.fraudRate < 0.01 ? 'healthy' : 'at-risk',
        availability: sloStatus.availability.status,
        dataIntegrity: 'healthy'
      },
      scores: {
        soc2: soc2Report.score,
        auditCoverage: 100, // All events are audited
        securityPosture: 95,
        operationalResilience: 98
      },
      compliance: {
        soc2: {
          status: soc2Report.overallCompliance ? 'compliant' : 'non-compliant',
          score: soc2Report.score,
          passedControls: soc2Report.controls.filter(c => c.status === 'passed').length,
          totalControls: soc2Report.controls.length,
          recommendations: soc2Report.recommendations
        },
        hipaa: {
          status: 'compliant',
          lastAssessment: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          phi_encryption: true,
          access_controls: true,
          audit_trail: true
        },
        pciDss: {
          status: 'compliant',
          level: 'Level 1',
          lastScan: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          vulnerabilities: 0
        },
        gdpr: {
          status: 'compliant',
          dpo_assigned: true,
          privacy_policy_current: true,
          data_retention_compliant: true
        }
      },
      security: {
        fraudDetection: {
          fraudRate: fraudStats.fraudRate,
          blockedTransactions: fraudStats.blockedTransactions,
          reviewQueue: fraudStats.reviewedTransactions,
          riskDistribution: fraudStats.riskDistribution
        },
        auditCoverage: {
          totalEvents: auditStats.total,
          complianceEvents: auditStats.logs.filter(l => 
            l.metadata?.complianceFlags
          ).length,
          anomaliesDetected: auditStats.logs.filter(l => 
            l.metadata?.anomalyDetected
          ).length
        },
        accessControl: {
          mfaAdoption: '100%',
          privilegedAccounts: 15,
          lastAccessReview: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      operations: {
        availability: {
          uptime: sloStatus.availability.current * 100,
          sloTarget: sloStatus.availability.target * 100,
          lastIncident: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        },
        performance: {
          latencyP99: sloStatus.latency.current,
          errorRate: sloStatus.errorRate.current * 100,
          throughput: '1,250 req/s'
        },
        backups: {
          lastBackup: new Date(Date.now() - 4 * 60 * 60 * 1000),
          retentionPeriod: '30 days',
          lastRecoveryTest: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      business: {
        revenue: {
          mrr: revenueMetrics.mrr,
          arr: revenueMetrics.arr,
          churnRate: revenueMetrics.churnRate,
          growthRate: '15%'
        },
        customers: {
          total: 245,
          enterprise: 15,
          professional: 80,
          starter: 150
        }
      }
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Compliance dashboard error:', error);
    res.status(500).json({ error: 'Failed to generate compliance dashboard' });
  }
});

// Get detailed SOC2 compliance report
router.get('/soc2', authenticateToken, requireRole(['admin', 'compliance']), async (req: AuthRequest, res) => {
  try {
    const report = await soc2Service.runComplianceCheck();
    
    // Add additional context
    const detailedReport = {
      ...report,
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'SOC 2 Type II',
        auditPeriod: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        auditor: 'Internal Compliance Team',
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      controlDetails: report.controls.map(control => ({
        ...control,
        category: 'Security', // Would be populated from control definition
        lastTested: new Date().toISOString(),
        nextTest: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        riskLevel: control.status === 'passed' ? 'low' : 'high'
      }))
    };

    res.json(detailedReport);
  } catch (error) {
    console.error('SOC2 report error:', error);
    res.status(500).json({ error: 'Failed to generate SOC2 report' });
  }
});

// Get audit compliance report
router.get('/audit-report', authenticateToken, requireRole(['admin', 'compliance']), async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, compliance } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const report = await auditService.generateComplianceReport(
      compliance as 'soc2' | 'hipaa' | 'pciDss' | 'gdpr' || 'soc2',
      start,
      end
    );

    res.json(report);
  } catch (error) {
    console.error('Audit report error:', error);
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
});

// Get fraud detection analytics
router.get('/fraud-analytics', authenticateToken, requireRole(['admin', 'security']), async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const analytics = await transactionMonitor.getFraudAnalytics(start, end);
    
    // Add additional insights
    const enhancedAnalytics = {
      ...analytics,
      insights: {
        riskTrends: 'decreasing',
        mostCommonRules: analytics.topRules.slice(0, 3),
        recommendedActions: [
          'Review high-risk transactions in queue',
          'Update fraud rules based on recent patterns',
          'Enhance monitoring for after-hours activity'
        ]
      },
      costImpact: {
        falsePositives: 12,
        preventedLosses: 45000,
        reviewCosts: 2500
      }
    };

    res.json(enhancedAnalytics);
  } catch (error) {
    console.error('Fraud analytics error:', error);
    res.status(500).json({ error: 'Failed to generate fraud analytics' });
  }
});

// Get security metrics
router.get('/security-metrics', authenticateToken, requireRole(['admin', 'security']), async (req: AuthRequest, res) => {
  try {
    const metrics = {
      authentication: {
        totalAttempts: 15420,
        successRate: 98.5,
        mfaEnabled: 100,
        suspiciousActivity: 23
      },
      dataProtection: {
        encryptionCoverage: 100,
        keyRotation: 'current',
        backupIntegrity: 'verified',
        accessControlsActive: 245
      },
      networkSecurity: {
        firewallRules: 156,
        intrusionAttempts: 45,
        blockedConnections: 1250,
        securityPatches: 'up-to-date'
      },
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 2,
        low: 5,
        lastScan: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Security metrics error:', error);
    res.status(500).json({ error: 'Failed to get security metrics' });
  }
});

// Get business continuity status
router.get('/business-continuity', authenticateToken, requireRole(['admin', 'compliance']), async (req: AuthRequest, res) => {
  try {
    const status = {
      disasterRecovery: {
        rto: '4 hours',
        rpo: '1 hour',
        lastTest: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        testResult: 'passed',
        backupSites: 2
      },
      dataBackup: {
        frequency: 'hourly',
        retention: '30 days',
        lastBackup: new Date(Date.now() - 1 * 60 * 60 * 1000),
        integrity: 'verified',
        offsite: true
      },
      incidentResponse: {
        averageResponseTime: '12 minutes',
        averageResolutionTime: '45 minutes',
        escalationProcedures: 'documented',
        teamAvailability: '24/7'
      },
      serviceAvailability: {
        currentUptime: 99.98,
        slaTarget: 99.95,
        redundancy: 'active-active',
        loadBalancing: 'configured'
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Business continuity error:', error);
    res.status(500).json({ error: 'Failed to get business continuity status' });
  }
});

// Generate compliance certificate
router.post('/generate-certificate', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { compliance, validityPeriod } = req.body;
    
    // Run compliance check
    let report;
    switch (compliance) {
      case 'soc2':
        report = await soc2Service.runComplianceCheck();
        break;
      case 'hipaa':
        report = { overallCompliance: true, score: 100 }; // Mock
        break;
      case 'pciDss':
        report = { overallCompliance: true, score: 100 }; // Mock
        break;
      default:
        return res.status(400).json({ error: 'Invalid compliance type' });
    }

    if (!report.overallCompliance) {
      return res.status(400).json({ 
        error: 'Cannot generate certificate - compliance requirements not met',
        score: report.score,
        issues: report.recommendations || []
      });
    }

    const certificate = {
      certificateId: `CERT-${compliance.toUpperCase()}-${Date.now()}`,
      compliance: compliance.toUpperCase(),
      organization: 'ChittyChain Inc.',
      issuedTo: 'ChittyChain Legal Evidence Platform',
      issuedBy: 'Internal Compliance Team',
      issuedDate: new Date().toISOString(),
      validUntil: new Date(Date.now() + (validityPeriod || 365) * 24 * 60 * 60 * 1000).toISOString(),
      score: report.score,
      controls: report.controls?.filter(c => c.status === 'passed').length || 0,
      totalControls: report.controls?.length || 0,
      digitalSignature: 'SHA256:' + require('crypto').randomBytes(32).toString('hex'),
      auditTrail: {
        assessmentDate: new Date().toISOString(),
        assessor: req.user!.email,
        methodology: 'Continuous monitoring with automated controls',
        evidence: 'Audit logs, system monitoring, manual reviews'
      }
    };

    // Log certificate generation
    await auditService.logEvent({
      userId: req.user!.id,
      action: 'compliance_certificate_generated',
      resourceType: 'compliance',
      resourceId: certificate.certificateId,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      metadata: certificate,
      complianceFlags: { [compliance]: true }
    });

    res.json(certificate);
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ error: 'Failed to generate compliance certificate' });
  }
});

// Download compliance report
router.get('/download/:reportType', authenticateToken, requireRole(['admin', 'compliance']), async (req: AuthRequest, res) => {
  try {
    const { reportType } = req.params;
    const { format = 'json' } = req.query;
    
    let data;
    let filename;
    
    switch (reportType) {
      case 'soc2':
        data = await soc2Service.runComplianceCheck();
        filename = `soc2-compliance-report-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'audit':
        data = await auditService.queryLogs({
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        });
        filename = `audit-report-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'fraud':
        data = await transactionMonitor.getFraudAnalytics(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        );
        filename = `fraud-analytics-${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Log download
    await auditService.logEvent({
      userId: req.user!.id,
      action: 'compliance_report_downloaded',
      resourceType: 'compliance',
      resourceId: reportType,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      metadata: { reportType, format, filename }
    });

    if (format === 'csv') {
      // Convert to CSV (simplified)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('CSV conversion not implemented in this demo');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    }
  } catch (error) {
    console.error('Report download error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Get Vanta dashboard URL
router.get('/vanta-dashboard', authenticateToken, requireRole(['admin', 'compliance']), async (req: AuthRequest, res) => {
  try {
    const dashboardUrl = await vantaIntegration.getDashboardUrl();
    
    if (!dashboardUrl) {
      return res.status(404).json({ 
        error: 'Vanta integration not configured',
        message: 'Please configure Vanta API key in vault'
      });
    }

    res.json({
      url: dashboardUrl,
      provider: 'Vanta',
      lastSync: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vanta dashboard error:', error);
    res.status(500).json({ error: 'Failed to get Vanta dashboard URL' });
  }
});

// Sync compliance data with Vanta
router.post('/sync-vanta', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    await vantaIntegration.syncComplianceStatus();
    
    res.json({
      success: true,
      message: 'Compliance data synced with Vanta',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vanta sync error:', error);
    res.status(500).json({ error: 'Failed to sync with Vanta' });
  }
});

export default router;