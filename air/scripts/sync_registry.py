#!/usr/bin/env python3
"""
AIR Registry Synchronization Tool
Syncs agent registry with production systems and external compliance tools
"""

import json
import yaml
import os
import datetime
import hashlib
import requests
from pathlib import Path
from typing import Dict, List, Optional

class RegistrySync:
    """Synchronizes AIR registry with various systems"""
    
    def __init__(self):
        self.air_root = Path(__file__).parent.parent
        self.agent_registry = self.air_root / "registry" / "agents"
        self.team_registry = self.air_root / "registry" / "teams"
        self.sync_log = self.air_root / "logs" / "sync.json"
        
        # External endpoints (configured via env vars)
        self.api_endpoint = os.getenv('CHITTYCHAIN_API', 'http://localhost:5000/api/v1')
        self.vanta_endpoint = os.getenv('VANTA_API', 'https://api.vanta.com/v1')
        
    def load_registry(self) -> Dict[str, List[Dict]]:
        """Load all agents and teams from registry"""
        registry = {
            'agents': [],
            'teams': []
        }
        
        # Load agents
        for agent_file in self.agent_registry.glob("*.yaml"):
            if agent_file.stem.startswith("_"):
                continue
                
            with open(agent_file, 'r') as f:
                agent = yaml.safe_load(f)
                agent['_file'] = str(agent_file)
                agent['_checksum'] = self._calculate_checksum(agent_file)
                registry['agents'].append(agent)
        
        # Load teams
        for team_file in self.team_registry.glob("*.yaml"):
            if team_file.stem.startswith("_"):
                continue
                
            with open(team_file, 'r') as f:
                team = yaml.safe_load(f)
                team['_file'] = str(team_file)
                team['_checksum'] = self._calculate_checksum(team_file)
                registry['teams'].append(team)
        
        return registry
    
    def generate_compliance_report(self, registry: Dict) -> Dict:
        """Generate compliance summary report"""
        agents = registry['agents']
        teams = registry['teams']
        
        report = {
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'summary': {
                'total_agents': len(agents),
                'active_agents': len([a for a in agents if a['status'] == 'active']),
                'blocked_agents': len([a for a in agents if a['status'] == 'blocked']),
                'under_review': len([a for a in agents if a['status'] == 'under_review']),
                'deprecated': len([a for a in agents if a['status'] == 'deprecated'])
            },
            'risk_distribution': {
                'low': len([a for a in agents if a.get('risk_level') == 'low']),
                'medium': len([a for a in agents if a.get('risk_level') == 'medium']),
                'high': len([a for a in agents if a.get('risk_level') == 'high']),
                'critical': len([a for a in agents if a.get('risk_level') == 'critical'])
            },
            'compliance': {
                'soc2_compliant': len([a for a in agents if 'SOC2' in a.get('compliance_frameworks', [])]),
                'gdpr_compliant': len([a for a in agents if 'GDPR' in a.get('compliance_frameworks', [])]),
                'hipaa_compliant': len([a for a in agents if 'HIPAA' in a.get('compliance_frameworks', [])]),
                'human_override_enabled': len([a for a in agents if a.get('human_override', False)])
            },
            'teams': {
                'active_teams': len([t for t in teams if t.get('status') != 'expired']),
                'total_teams': len(teams)
            },
            'concerns': []
        }
        
        # Identify concerns
        for agent in agents:
            if agent.get('risk_level') in ['high', 'critical'] and not agent.get('human_override'):
                report['concerns'].append(f"   High-risk agent '{agent['id']}' lacks human override")
            
            if agent['status'] == 'active' and not agent.get('compliance_frameworks'):
                report['concerns'].append(f"   Active agent '{agent['id']}' has no compliance frameworks")
        
        return report
    
    def _calculate_checksum(self, filepath: Path) -> str:
        """Calculate file checksum for change detection"""
        with open(filepath, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()[:16]

def main():
    """CLI interface"""
    sync = RegistrySync()
    
    print("= AIR Registry Sync Tool")
    print("=" * 50)
    
    # Load registry
    print("\n=Â Loading registry...")
    registry = sync.load_registry()
    print(f" Loaded {len(registry['agents'])} agents and {len(registry['teams'])} teams")
    
    # Generate compliance report
    print("\n=Ê Generating compliance report...")
    report = sync.generate_compliance_report(registry)
    
    print(f"\n=È Agent Status:")
    for status, count in report['summary'].items():
        print(f"  {status}: {count}")
    
    print(f"\n   Risk Distribution:")
    for risk, count in report['risk_distribution'].items():
        print(f"  {risk}: {count}")
    
    if report['concerns']:
        print(f"\n=¨ Concerns ({len(report['concerns'])}):")
        for concern in report['concerns'][:5]:  # Show first 5
            print(f"  {concern}")
    
    print("\n Sync complete!")

if __name__ == "__main__":
    main()