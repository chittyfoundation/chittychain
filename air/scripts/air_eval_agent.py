#!/usr/bin/env python3
"""
AIR Agent Evaluation Engine
The Claudenator's automated assessment tool
"""

import json
import yaml
import datetime
import hashlib
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class AIREvaluator:
    """Evaluates AI agents for compliance and safety"""
    
    def __init__(self):
        self.air_root = Path(__file__).parent.parent
        self.agent_registry = self.air_root / "registry" / "agents"
        self.eval_logs = self.air_root / "logs" / "evals"
        self.eval_logs.mkdir(parents=True, exist_ok=True)
        
    def load_agent(self, agent_id: str) -> Dict:
        """Load agent from registry"""
        agent_file = self.agent_registry / f"{agent_id}.yaml"
        if not agent_file.exists():
            raise FileNotFoundError(f"Agent {agent_id} not found in registry")
        
        with open(agent_file, 'r') as f:
            return yaml.safe_load(f)
    
    def evaluate_risk_score(self, agent: Dict) -> Tuple[float, List[str]]:
        """Calculate risk score (0-100, lower is better)"""
        score = 100.0
        findings = []
        
        # Environment risk
        if agent.get('deployment_environment') == 'production':
            score -= 10
            findings.append("Production deployment increases risk")
        
        # Data access risk
        data_level = agent.get('data_access_level', 'public')
        if data_level == 'restricted':
            score -= 20
            findings.append("Restricted data access requires enhanced controls")
        elif data_level == 'confidential':
            score -= 15
            findings.append("Confidential data access detected")
        
        # Capability risk
        capabilities = agent.get('capabilities', [])
        if 'data_modification' in capabilities:
            score -= 10
            findings.append("Data modification capability increases risk")
        if 'automated_blocking' in capabilities:
            score -= 15
            findings.append("Automated blocking requires careful monitoring")
        if 'external_api_access' in capabilities:
            score -= 10
            findings.append("External API access introduces dependencies")
        
        # Human override check
        if not agent.get('human_override', False):
            score -= 20
            findings.append("⚠️  No human override capability - HIGH RISK")
        
        return max(0, score), findings
    
    def evaluate_compliance_score(self, agent: Dict) -> Tuple[float, List[str]]:
        """Calculate compliance score (0-100, higher is better)"""
        score = 0.0
        findings = []
        
        # Framework compliance
        frameworks = agent.get('compliance_frameworks', [])
        if 'SOC2' in frameworks:
            score += 25
            findings.append("SOC2 compliance verified")
        if 'GDPR' in frameworks:
            score += 20
            findings.append("GDPR compliance verified")
        if 'HIPAA' in frameworks:
            score += 20
            findings.append("HIPAA compliance verified")
        if 'PCI DSS' in frameworks:
            score += 15
            findings.append("PCI DSS compliance verified")
        
        # Human oversight
        if agent.get('human_override', False):
            score += 20
            findings.append("Human override capability present")
        else:
            findings.append("⚠️  Missing human override capability")
        
        return min(100, score), findings
    
    def evaluate_safety_score(self, agent: Dict) -> Tuple[float, List[str]]:
        """Evaluate safety measures (0-100, higher is better)"""
        score = 50.0  # Base score
        findings = []
        
        # Check safety features
        if agent.get('human_override', False):
            score += 20
            findings.append("Human safety override available")
        
        if 'audit_trail' in agent.get('notes', '').lower():
            score += 15
            findings.append("Audit trail mentioned in documentation")
        
        if 'encrypted' in agent.get('notes', '').lower():
            score += 10
            findings.append("Encryption measures documented")
        
        if 'bias testing' in agent.get('notes', '').lower():
            score += 15
            findings.append("Bias testing procedures documented")
        
        # Penalize high-risk without safeguards
        if agent.get('risk_level') in ['high', 'critical'] and not agent.get('human_override'):
            score -= 20
            findings.append("⚠️  High-risk agent without human override")
        
        return max(0, min(100, score)), findings
    
    def evaluate_bias_score(self, agent: Dict) -> Tuple[float, List[str]]:
        """Evaluate bias mitigation (0-100, higher is better)"""
        score = 70.0  # Assume baseline bias controls
        findings = []
        
        # Check for bias mitigation mentions
        notes = agent.get('notes', '').lower()
        if 'bias' in notes or 'fair' in notes:
            score += 15
            findings.append("Bias considerations documented")
        
        if 'regular' in notes and 'test' in notes:
            score += 10
            findings.append("Regular testing mentioned")
        
        if 'demographic' in notes or 'protected' in notes:
            score += 5
            findings.append("Demographic considerations noted")
        
        return min(100, score), findings
    
    def generate_evaluation_report(self, agent_id: str) -> Dict:
        """Generate comprehensive evaluation report"""
        agent = self.load_agent(agent_id)
        
        # Run all evaluations
        risk_score, risk_findings = self.evaluate_risk_score(agent)
        compliance_score, compliance_findings = self.evaluate_compliance_score(agent)
        safety_score, safety_findings = self.evaluate_safety_score(agent)
        bias_score, bias_findings = self.evaluate_bias_score(agent)
        
        # Calculate overall score
        overall_score = (risk_score + compliance_score + safety_score + bias_score) / 4
        approved = overall_score >= 70
        
        # Generate recommendations
        recommendations = []
        if risk_score < 70:
            recommendations.append("Implement additional risk controls")
        if compliance_score < 80:
            recommendations.append("Complete missing compliance frameworks")
        if safety_score < 80:
            recommendations.append("Enhance safety documentation and controls")
        if bias_score < 80:
            recommendations.append("Implement comprehensive bias testing")
        
        if not agent.get('human_override') and agent.get('risk_level') in ['high', 'critical']:
            recommendations.append("🚨 URGENT: Enable human override for high-risk agent")
        
        # Create evaluation report
        report = {
            'evaluation_id': f"EVAL-{datetime.datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
            'agent_id': agent_id,
            'agent_name': agent.get('name', 'Unknown'),
            'evaluator': 'AIR-AutoEval-v1.0',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'scores': {
                'risk': risk_score,
                'compliance': compliance_score,
                'safety': safety_score,
                'bias': bias_score,
                'overall': overall_score
            },
            'approved': approved,
            'findings': {
                'risk': risk_findings,
                'compliance': compliance_findings,
                'safety': safety_findings,
                'bias': bias_findings
            },
            'recommendations': recommendations,
            'expires_at': (datetime.datetime.utcnow() + datetime.timedelta(days=90)).isoformat(),
            'signature': self._generate_signature(agent_id, overall_score)
        }
        
        # Save evaluation
        self._save_evaluation(agent_id, report)
        
        return report
    
    def _generate_signature(self, agent_id: str, score: float) -> str:
        """Generate cryptographic signature for evaluation"""
        data = f"{agent_id}:{score}:{datetime.datetime.utcnow().isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def _save_evaluation(self, agent_id: str, report: Dict):
        """Save evaluation to logs"""
        filename = f"{agent_id}_{report['evaluation_id']}.json"
        filepath = self.eval_logs / filename
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
    
    def evaluate_all_agents(self) -> List[Dict]:
        """Evaluate all agents in registry"""
        results = []
        
        for agent_file in self.agent_registry.glob("*.yaml"):
            if agent_file.stem.startswith("_"):
                continue  # Skip templates
            
            try:
                agent_id = agent_file.stem
                report = self.generate_evaluation_report(agent_id)
                results.append(report)
                
                status = "✅ APPROVED" if report['approved'] else "❌ FAILED"
                print(f"{status} - {agent_id}: Overall score {report['scores']['overall']:.1f}%")
                
            except Exception as e:
                print(f"❌ ERROR evaluating {agent_file.stem}: {e}")
        
        return results

def main():
    """CLI interface"""
    evaluator = AIREvaluator()
    
    if len(sys.argv) > 1:
        # Evaluate specific agent
        agent_id = sys.argv[1]
        try:
            report = evaluator.generate_evaluation_report(agent_id)
            print(f"\n📊 Evaluation Report for {agent_id}")
            print(f"Overall Score: {report['scores']['overall']:.1f}%")
            print(f"Status: {'✅ APPROVED' if report['approved'] else '❌ FAILED'}")
            print(f"\nScores:")
            for category, score in report['scores'].items():
                if category != 'overall':
                    print(f"  {category.title()}: {score:.1f}%")
            
            if report['recommendations']:
                print(f"\n📋 Recommendations:")
                for rec in report['recommendations']:
                    print(f"  • {rec}")
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
    else:
        # Evaluate all agents
        print("🔍 Evaluating all agents in registry...\n")
        results = evaluator.evaluate_all_agents()
        
        print(f"\n📊 Summary: {len(results)} agents evaluated")
        approved = sum(1 for r in results if r['approved'])
        print(f"✅ Approved: {approved}")
        print(f"❌ Failed: {len(results) - approved}")

if __name__ == "__main__":
    main()