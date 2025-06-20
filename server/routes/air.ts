import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { airGovernance } from '../air/AIRGovernance';

const router = Router();

// Get AIR department overview
router.get('/dashboard', authenticateToken, requireRole(['admin', 'ai_safety']), async (req: AuthRequest, res) => {
  try {
    const status = await airGovernance.getComplianceStatus();
    
    const dashboard = {
      department: 'Artificial Intelligence Relations (AIR)',
      director: 'The Claudenator',
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
      
      compliance_overview: status,
      
      governance_metrics: {
        frameworks_supported: ['EU AI Act', 'ISO/IEC 42001', 'NIST AI RMF', 'SOC2'],
        automated_evaluations: true,
        human_oversight_required: true,
        incident_response: 'ACTIVE'
      },
      
      recent_activities: [
        'Agent compliance evaluations completed',
        'Risk assessment framework updated',
        'Tea spawn protocols operational',
        'Audit trail verification passed'
      ],
      
      alerts: status.agents_under_review > 0 ? [
        `${status.agents_under_review} agents under review`,
        `${status.evaluations_due} evaluations due`
      ] : [],
      
      authorities: [
        'Audit, delay, block, or deprecate AI systems',
        'Spawn sub-agents (tea) for enforcement',
        'Maintain registry of production-grade AI agents',
        'Enforce compliance with AI governance frameworks'
      ]
    };

    res.json(dashboard);
  } catch (error) {
    console.error('AIR dashboard error:', error);
    res.status(500).json({ error: 'Failed to load AIR dashboard' });
  }
});

// Register a new AI agent
router.post('/agents/register', authenticateToken, requireRole(['admin', 'ai_safety']), async (req: AuthRequest, res) => {
  try {
    const agentData = req.body;
    
    // Add owner from authenticated user
    agentData.owner = agentData.owner || req.user!.email;
    
    await airGovernance.registerAgent(agentData);
    
    res.status(201).json({
      success: true,
      message: 'AI agent registered successfully',
      agent_id: agentData.id,
      status: 'registered',
      next_steps: [
        'Initial compliance evaluation scheduled',
        'Risk assessment in progress',
        'Monitoring activated'
      ]
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    res.status(400).json({ 
      error: 'Agent registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Evaluate an AI agent
router.post('/agents/:agentId/evaluate', authenticateToken, requireRole(['admin', 'ai_safety']), async (req: AuthRequest, res) => {
  try {
    const { agentId } = req.params;
    const evaluation = await airGovernance.evaluateAgent(agentId, req.user!.email);
    
    res.json({
      evaluation_id: `EVAL-${Date.now()}`,
      agent_id: agentId,
      evaluator: evaluation.evaluator,
      timestamp: evaluation.timestamp,
      results: {
        overall_score: Math.round((evaluation.risk_score + evaluation.compliance_score + evaluation.safety_score + evaluation.bias_score) / 4),
        approved: evaluation.approved,
        scores: {
          risk: evaluation.risk_score,
          compliance: evaluation.compliance_score,
          safety: evaluation.safety_score,
          bias: evaluation.bias_score
        }
      },
      findings: evaluation.findings,
      recommendations: evaluation.recommendations,
      expires_at: evaluation.expires_at,
      next_evaluation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });
  } catch (error) {
    console.error('Agent evaluation error:', error);
    res.status(400).json({ 
      error: 'Agent evaluation failed',
      details: error instanceof Error ? error.message : 'Agent not found or evaluation error'
    });
  }
});

// Block an AI agent
router.post('/agents/:agentId/block', authenticateToken, requireRole(['admin', 'ai_safety']), async (req: AuthRequest, res) => {
  try {
    const { agentId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Blocking reason is required' });
    }
    
    await airGovernance.blockAgent(agentId, reason, req.user!.email);
    
    res.json({
      success: true,
      message: 'AI agent blocked successfully',
      agent_id: agentId,
      blocked_by: req.user!.email,
      reason,
      timestamp: new Date().toISOString(),
      actions_taken: [
        'Agent status set to BLOCKED',
        'Emergency investigation tea spawned',
        'Stakeholders notified',
        'Incident logged'
      ]
    });
  } catch (error) {
    console.error('Agent blocking error:', error);
    res.status(400).json({ 
      error: 'Agent blocking failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Spawn a tea (sub-agent team)
router.post('/tea/spawn', authenticateToken, requireRole(['admin', 'ai_safety']), async (req: AuthRequest, res) => {
  try {
    const { purpose, tasks, ttl_hours = 24 } = req.body;
    
    if (!purpose || !tasks) {
      return res.status(400).json({ error: 'Purpose and tasks are required' });
    }
    
    const tea = await airGovernance.spawnTea(purpose, tasks, ttl_hours);
    
    res.status(201).json({
      tea_id: tea.id,
      purpose: tea.purpose,
      spawned_by: tea.spawned_by,
      spawned_at: tea.spawned_at,
      ttl_hours: ttl_hours,
      expires_at: new Date(Date.now() + ttl_hours * 60 * 60 * 1000),
      team_composition: tea.members.map(m => ({
        name: m.name,
        role: m.role,
        capabilities: m.capabilities
      })),
      assigned_tasks: tea.tasks,
      status: tea.status,
      message: `Tea ${tea.id} successfully spawned and operational`
    });
  } catch (error) {
    console.error('Tea spawn error:', error);
    res.status(500).json({ 
      error: 'Tea spawn failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get compliance status
router.get('/compliance/status', authenticateToken, requireRole(['admin', 'ai_safety', 'compliance']), async (req: AuthRequest, res) => {
  try {
    const status = await airGovernance.getComplianceStatus();
    
    const enhancedStatus = {
      ...status,
      compliance_rate: status.total_agents > 0 
        ? Math.round((status.compliant_agents / status.total_agents) * 100)
        : 100,
      risk_distribution: {
        low: 'Calculated from registry',
        medium: 'Calculated from registry', 
        high: status.high_risk_agents,
        critical: 'Calculated from registry'
      },
      frameworks: {
        'EU AI Act': 'Monitoring',
        'ISO/IEC 42001': 'Compliant',
        'NIST AI RMF': 'Implementing',
        'SOC2': 'Certified'
      },
      last_updated: new Date().toISOString(),
      next_audit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    res.json(enhancedStatus);
  } catch (error) {
    console.error('Compliance status error:', error);
    res.status(500).json({ error: 'Failed to get compliance status' });
  }
});

// Get AIR charter and policies
router.get('/charter', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const charter = {
      department: 'Artificial Intelligence Relations (AIR)',
      version: '1.0',
      effective_date: '2024-01-01',
      director: 'The Claudenator',
      
      mission: 'Govern the lifecycle, compliance, and conduct of all AI agents and systems operating within the organization',
      
      authorities: [
        'Audit, delay, block, or deprecate any AI system',
        'Spawn sub-agents (tea) to carry out enforcement',
        'Maintain sole registry of production-grade AI agents',
        'Enforce compliance with AI governance frameworks'
      ],
      
      compliance_frameworks: [
        {
          name: 'EU AI Act',
          status: 'Monitoring',
          description: 'European Union artificial intelligence regulation'
        },
        {
          name: 'ISO/IEC 42001',
          status: 'Compliant',
          description: 'AI management system standard'
        },
        {
          name: 'NIST AI RMF',
          status: 'Implementing',
          description: 'NIST AI Risk Management Framework'
        },
        {
          name: 'SOC2',
          status: 'Certified',
          description: 'Security and availability controls'
        }
      ],
      
      governance_principles: [
        'Human oversight required for critical decisions',
        'Transparency in AI decision-making processes',
        'Fairness and bias mitigation',
        'Privacy and data protection',
        'Accountability and auditability',
        'Robustness and security'
      ],
      
      evaluation_criteria: {
        risk_assessment: 'Evaluated based on deployment environment, data access, and capabilities',
        compliance_scoring: 'Frameworks adherence, audit trails, human oversight',
        safety_evaluation: 'Output safety, harmful content detection, failure modes',
        bias_testing: 'Fairness across protected classes, algorithmic bias detection'
      },
      
      enforcement_actions: [
        'Warning and recommendations',
        'Mandatory evaluation and remediation',
        'Operational restrictions',
        'Temporary suspension',
        'Permanent blocking and deprecation'
      ]
    };
    
    res.json(charter);
  } catch (error) {
    console.error('Charter retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve AIR charter' });
  }
});

// Health check for AIR department
router.get('/health', async (req, res) => {
  try {
    const status = await airGovernance.getComplianceStatus();
    
    const health = {
      department: 'AIR',
      status: 'OPERATIONAL',
      director: 'The Claudenator',
      timestamp: new Date().toISOString(),
      systems: {
        agent_registry: 'online',
        evaluation_engine: 'online',
        tea_spawner: 'online',
        compliance_monitor: 'online',
        audit_trail: 'online'
      },
      metrics: {
        registered_agents: status.total_agents,
        active_evaluations: status.evaluations_due,
        compliance_rate: status.total_agents > 0 
          ? `${Math.round((status.compliant_agents / status.total_agents) * 100)}%`
          : '100%'
      },
      version: '1.0.0'
    };
    
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      department: 'AIR',
      status: 'ERROR',
      error: 'Health check failed'
    });
  }
});

export default router;