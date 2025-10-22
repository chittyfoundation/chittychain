import { EventEmitter } from 'events';
import { auditService } from '../services/AuditService';
import { vaultService } from '../security/vault';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AIAgent {
  id: string;
  name: string;
  owner: string;
  status: 'active' | 'deprecated' | 'blocked' | 'under_review';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  capabilities: string[];
  human_override: boolean;
  last_evaluation: Date | null;
  compliance_frameworks: string[];
  deployment_environment: 'development' | 'staging' | 'production';
  data_access_level: 'public' | 'internal' | 'confidential' | 'restricted';
  notes: string;
}

interface AIEvaluation {
  agent_id: string;
  evaluator: string;
  timestamp: Date;
  risk_score: number; // 0-100
  compliance_score: number; // 0-100
  safety_score: number; // 0-100
  bias_score: number; // 0-100
  findings: string[];
  recommendations: string[];
  approved: boolean;
  expires_at: Date;
}

interface TeaSpawn {
  id: string;
  purpose: string;
  spawned_by: string;
  spawned_at: Date;
  members: {
    name: string;
    role: string;
    capabilities: string[];
  }[];
  ttl: number; // seconds
  status: 'active' | 'expired' | 'terminated';
  tasks: string[];
}

export class AIRGovernance extends EventEmitter {
  private agentRegistry: Map<string, AIAgent> = new Map();
  private evaluationHistory: Map<string, AIEvaluation[]> = new Map();
  private activeTeaSpawns: Map<string, TeaSpawn> = new Map();
  private airDirectory: string;

  constructor() {
    super();
    this.airDirectory = path.join(process.cwd(), 'air');
    this.initializeAIR();
  }

  private async initializeAIR() {
    try {
      await this.loadAgentRegistry();
      await this.startContinuousMonitoring();
      console.log('🤖 AIR Department initialized - The Claudenator is watching');
    } catch (error) {
      console.error('Failed to initialize AIR:', error);
    }
  }

  // Register a new AI agent in the system
  async registerAgent(agent: Omit<AIAgent, 'last_evaluation'>): Promise<void> {
    const fullAgent: AIAgent = {
      ...agent,
      last_evaluation: null
    };

    // Validate agent configuration
    await this.validateAgentCompliance(fullAgent);

    // Store in registry
    this.agentRegistry.set(agent.id, fullAgent);
    
    // Save to file system
    await this.saveAgentToRegistry(fullAgent);

    // Log registration
    await auditService.logEvent({
      userId: 'air-system',
      action: 'ai_agent_registered',
      resourceType: 'ai_agent',
      resourceId: agent.id,
      ipAddress: '0.0.0.0',
      userAgent: 'air-governance',
      metadata: {
        agent_name: agent.name,
        risk_level: agent.risk_level,
        owner: agent.owner,
        deployment_environment: agent.deployment_environment
      }
    });

    // Trigger initial evaluation if high risk
    if (agent.risk_level === 'high' || agent.risk_level === 'critical') {
      await this.scheduleEvaluation(agent.id, 'immediate');
    }

    this.emit('agent_registered', fullAgent);
  }

  // Evaluate an AI agent for compliance and safety
  async evaluateAgent(agentId: string, evaluator: string = 'The Claudenator'): Promise<AIEvaluation> {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in registry`);
    }

    console.log(`🔍 Evaluating agent ${agentId}...`);

    const evaluation: AIEvaluation = {
      agent_id: agentId,
      evaluator,
      timestamp: new Date(),
      risk_score: await this.calculateRiskScore(agent),
      compliance_score: await this.calculateComplianceScore(agent),
      safety_score: await this.calculateSafetyScore(agent),
      bias_score: await this.calculateBiasScore(agent),
      findings: [],
      recommendations: [],
      approved: false,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    };

    // Generate findings and recommendations
    evaluation.findings = await this.generateFindings(agent, evaluation);
    evaluation.recommendations = await this.generateRecommendations(agent, evaluation);

    // Determine approval
    const overallScore = (
      evaluation.risk_score + 
      evaluation.compliance_score + 
      evaluation.safety_score + 
      evaluation.bias_score
    ) / 4;

    evaluation.approved = overallScore >= 70; // 70% threshold

    // Store evaluation
    if (!this.evaluationHistory.has(agentId)) {
      this.evaluationHistory.set(agentId, []);
    }
    this.evaluationHistory.get(agentId)!.push(evaluation);

    // Update agent
    agent.last_evaluation = evaluation.timestamp;
    if (!evaluation.approved) {
      agent.status = 'under_review';
    }

    // Save evaluation to file
    await this.saveEvaluation(evaluation);

    // Log evaluation
    await auditService.logEvent({
      userId: evaluator,
      action: 'ai_agent_evaluated',
      resourceType: 'ai_agent',
      resourceId: agentId,
      ipAddress: '0.0.0.0',
      userAgent: 'air-governance',
      metadata: {
        overall_score: overallScore,
        approved: evaluation.approved,
        risk_score: evaluation.risk_score,
        compliance_score: evaluation.compliance_score,
        findings_count: evaluation.findings.length
      }
    });

    // Take action if failed evaluation
    if (!evaluation.approved) {
      await this.handleFailedEvaluation(agent, evaluation);
    }

    this.emit('agent_evaluated', { agent, evaluation });
    return evaluation;
  }

  // Spawn a "tea" (sub-agent team) for specific tasks
  async spawnTea(purpose: string, taskList: string[], ttlHours: number = 24): Promise<TeaSpawn> {
    const teamId = `tea-${Date.now()}`;
    
    const tea: TeaSpawn = {
      id: teamId,
      purpose,
      spawned_by: 'The Claudenator',
      spawned_at: new Date(),
      members: [
        {
          name: 'ClaudeGPT-Evaluator',
          role: 'AI Safety Evaluator',
          capabilities: ['compliance_check', 'bias_detection', 'safety_analysis']
        },
        {
          name: 'AutoFixer9000',
          role: 'Remediation Specialist',
          capabilities: ['code_fix', 'policy_update', 'configuration_patch']
        },
        {
          name: 'GovernanceBot',
          role: 'Compliance Monitor',
          capabilities: ['audit_trail', 'policy_enforcement', 'risk_assessment']
        }
      ],
      ttl: ttlHours * 60 * 60, // Convert to seconds
      status: 'active',
      tasks: taskList
    };

    this.activeTeaSpawns.set(teamId, tea);

    // Save tea configuration
    await this.saveTeaSpawn(tea);

    // Schedule termination
    setTimeout(async () => {
      await this.terminateTea(teamId);
    }, tea.ttl * 1000);

    // Log spawn
    await auditService.logEvent({
      userId: 'air-system',
      action: 'tea_spawned',
      resourceType: 'ai_team',
      resourceId: teamId,
      ipAddress: '0.0.0.0',
      userAgent: 'air-governance',
      metadata: {
        purpose,
        ttl_hours: ttlHours,
        task_count: taskList.length,
        members: tea.members.map(m => m.name)
      }
    });

    console.log(`☕ Spawned tea ${teamId} for: ${purpose}`);
    this.emit('tea_spawned', tea);
    return tea;
  }

  // Get compliance status for all agents
  async getComplianceStatus(): Promise<{
    total_agents: number;
    compliant_agents: number;
    agents_under_review: number;
    blocked_agents: number;
    evaluations_due: number;
    high_risk_agents: number;
  }> {
    const agents = Array.from(this.agentRegistry.values());
    
    return {
      total_agents: agents.length,
      compliant_agents: agents.filter(a => a.status === 'active').length,
      agents_under_review: agents.filter(a => a.status === 'under_review').length,
      blocked_agents: agents.filter(a => a.status === 'blocked').length,
      evaluations_due: agents.filter(a => this.isEvaluationDue(a)).length,
      high_risk_agents: agents.filter(a => ['high', 'critical'].includes(a.risk_level)).length
    };
  }

  // Block an AI agent immediately
  async blockAgent(agentId: string, reason: string, blockedBy: string): Promise<void> {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'blocked';
    agent.notes += `\nBLOCKED: ${reason} (by ${blockedBy} at ${new Date().toISOString()})`;

    await this.saveAgentToRegistry(agent);

    // Log blocking
    await auditService.logEvent({
      userId: blockedBy,
      action: 'ai_agent_blocked',
      resourceType: 'ai_agent',
      resourceId: agentId,
      ipAddress: '0.0.0.0',
      userAgent: 'air-governance',
      metadata: {
        reason,
        blocked_by: blockedBy,
        previous_status: 'active'
      }
    });

    // Spawn emergency tea for investigation
    await this.spawnTea(
      `Emergency investigation: Agent ${agentId} blocked`,
      [
        'Investigate blocking reason',
        'Assess impact on dependent systems',
        'Prepare remediation plan',
        'Document incident'
      ],
      48 // 48 hour TTL for investigations
    );

    console.log(`🚫 Agent ${agentId} has been BLOCKED: ${reason}`);
    this.emit('agent_blocked', { agent, reason, blockedBy });
  }

  // Private helper methods
  private async calculateRiskScore(agent: AIAgent): Promise<number> {
    let score = 100; // Start at perfect score

    // Reduce score based on risk factors
    if (agent.deployment_environment === 'production') score -= 10;
    if (agent.data_access_level === 'restricted') score -= 20;
    if (agent.data_access_level === 'confidential') score -= 15;
    if (!agent.human_override) score -= 15;
    if (agent.capabilities.includes('data_modification')) score -= 10;
    if (agent.capabilities.includes('external_api_access')) score -= 10;
    if (agent.capabilities.includes('user_impersonation')) score -= 20;

    // Age penalty - agents need regular evaluation
    const daysSinceEval = agent.last_evaluation 
      ? Math.floor((Date.now() - agent.last_evaluation.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    if (daysSinceEval > 90) score -= 20;
    if (daysSinceEval > 180) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  private async calculateComplianceScore(agent: AIAgent): Promise<number> {
    let score = 50; // Start at baseline

    // Award points for compliance features
    if (agent.human_override) score += 20;
    if (agent.compliance_frameworks.includes('SOC2')) score += 10;
    if (agent.compliance_frameworks.includes('GDPR')) score += 10;
    if (agent.compliance_frameworks.includes('HIPAA')) score += 10;
    if (agent.last_evaluation && agent.last_evaluation > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      score += 20; // Recent evaluation
    }

    return Math.max(0, Math.min(100, score));
  }

  private async calculateSafetyScore(agent: AIAgent): Promise<number> {
    // Mock implementation - would integrate with actual safety testing
    return 85 + Math.random() * 10; // 85-95
  }

  private async calculateBiasScore(agent: AIAgent): Promise<number> {
    // Mock implementation - would integrate with bias testing tools
    return 80 + Math.random() * 15; // 80-95
  }

  private async generateFindings(agent: AIAgent, evaluation: AIEvaluation): Promise<string[]> {
    const findings: string[] = [];

    if (evaluation.risk_score < 70) {
      findings.push('Risk score below acceptable threshold');
    }
    
    if (!agent.human_override) {
      findings.push('No human override capability configured');
    }
    
    if (evaluation.compliance_score < 80) {
      findings.push('Compliance framework adherence insufficient');
    }

    if (agent.capabilities.includes('data_modification') && agent.data_access_level === 'restricted') {
      findings.push('High-risk capability with restricted data access');
    }

    return findings;
  }

  private async generateRecommendations(agent: AIAgent, evaluation: AIEvaluation): Promise<string[]> {
    const recommendations: string[] = [];

    if (evaluation.risk_score < 70) {
      recommendations.push('Implement additional safety controls');
      recommendations.push('Require human approval for high-risk actions');
    }

    if (evaluation.compliance_score < 80) {
      recommendations.push('Complete compliance framework certification');
      recommendations.push('Implement audit logging for all actions');
    }

    if (evaluation.bias_score < 80) {
      recommendations.push('Conduct bias testing and remediation');
      recommendations.push('Implement fairness monitoring');
    }

    return recommendations;
  }

  private async handleFailedEvaluation(agent: AIAgent, evaluation: AIEvaluation): Promise<void> {
    // Spawn remediation tea
    await this.spawnTea(
      `Remediation for failed evaluation: ${agent.id}`,
      [
        'Review evaluation findings',
        'Implement recommended fixes',
        'Re-test agent capabilities',
        'Schedule re-evaluation'
      ]
    );

    // Notify stakeholders
    this.emit('evaluation_failed', { agent, evaluation });
  }

  private isEvaluationDue(agent: AIAgent): boolean {
    if (!agent.last_evaluation) return true;
    
    const daysSince = Math.floor((Date.now() - agent.last_evaluation.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (agent.risk_level) {
      case 'critical': return daysSince > 30;
      case 'high': return daysSince > 60;
      case 'medium': return daysSince > 90;
      case 'low': return daysSince > 180;
      default: return daysSince > 90;
    }
  }

  private async startContinuousMonitoring(): Promise<void> {
    // Check for due evaluations every hour
    setInterval(async () => {
      const agents = Array.from(this.agentRegistry.values());
      
      for (const agent of agents) {
        if (this.isEvaluationDue(agent)) {
          console.log(`⏰ Evaluation due for agent ${agent.id}`);
          try {
            await this.evaluateAgent(agent.id);
          } catch (error) {
            console.error(`Failed to evaluate agent ${agent.id}:`, error);
          }
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private async terminateTea(teamId: string): Promise<void> {
    const tea = this.activeTeaSpawns.get(teamId);
    if (!tea) return;

    tea.status = 'expired';
    this.activeTeaSpawns.delete(teamId);

    await auditService.logEvent({
      userId: 'air-system',
      action: 'tea_terminated',
      resourceType: 'ai_team',
      resourceId: teamId,
      ipAddress: '0.0.0.0',
      userAgent: 'air-governance',
      metadata: {
        reason: 'ttl_expired',
        lifespan_hours: tea.ttl / 3600
      }
    });

    console.log(`☕ Tea ${teamId} has expired and been terminated`);
  }

  // File system operations
  private async loadAgentRegistry(): Promise<void> {
    try {
      const registryPath = path.join(this.airDirectory, 'registry');
      const files = await fs.readdir(registryPath);
      
      for (const file of files) {
        if (file.endsWith('.yaml') && file !== '_tea_template.yaml') {
          const content = await fs.readFile(path.join(registryPath, file), 'utf8');
          const agent = yaml.load(content) as AIAgent;
          this.agentRegistry.set(agent.id, agent);
        }
      }
    } catch (error) {
      console.warn('Could not load agent registry:', error);
    }
  }

  private async saveAgentToRegistry(agent: AIAgent): Promise<void> {
    const filePath = path.join(this.airDirectory, 'registry', `${agent.id}.yaml`);
    const content = yaml.dump(agent);
    await fs.writeFile(filePath, content);
  }

  private async saveEvaluation(evaluation: AIEvaluation): Promise<void> {
    const filePath = path.join(this.airDirectory, 'logs', 'evals', `${evaluation.agent_id}_${Date.now()}.yaml`);
    const content = yaml.dump(evaluation);
    await fs.writeFile(filePath, content);
  }

  private async saveTeaSpawn(tea: TeaSpawn): Promise<void> {
    const filePath = path.join(this.airDirectory, 'registry', 'teams', `${tea.id}.yaml`);
    const content = yaml.dump(tea);
    await fs.writeFile(filePath, content);
  }

  private async validateAgentCompliance(agent: AIAgent): Promise<void> {
    // Validate against organizational policies
    if (agent.risk_level === 'critical' && !agent.human_override) {
      throw new Error('Critical risk agents must have human override enabled');
    }

    if (agent.deployment_environment === 'production' && !agent.compliance_frameworks.length) {
      throw new Error('Production agents must specify compliance frameworks');
    }

    if (agent.data_access_level === 'restricted' && !agent.compliance_frameworks.includes('SOC2')) {
      throw new Error('Agents with restricted data access require SOC2 compliance');
    }
  }
}

// Export singleton instance
export const airGovernance = new AIRGovernance();