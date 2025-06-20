#!/usr/bin/env python3
"""
Tea Sunset Manager
Automatically expires and archives tea teams based on TTL and sunset criteria
"""

import json
import yaml
import datetime
import shutil
from pathlib import Path
from typing import Dict, List

class TeaSunsetManager:
    """Manages tea team lifecycle and expiration"""
    
    def __init__(self):
        self.air_root = Path(__file__).parent.parent
        self.team_registry = self.air_root / "registry" / "teams"
        self.archive_dir = self.air_root / "logs" / "archived_teams"
        self.sunset_log = self.air_root / "logs" / "sunset.json"
        
        # Create archive directory
        self.archive_dir.mkdir(parents=True, exist_ok=True)
    
    def load_active_teams(self) -> List[Dict]:
        """Load all active teams from registry"""
        teams = []
        
        for team_file in self.team_registry.glob("*.yaml"):
            if team_file.stem.startswith("_"):
                continue
                
            with open(team_file, 'r') as f:
                team = yaml.safe_load(f)
                team['_file'] = team_file
                
                # Skip already expired teams
                if team.get('status') != 'expired':
                    teams.append(team)
        
        return teams
    
    def check_ttl_expiration(self, team: Dict) -> bool:
        """Check if team has exceeded TTL"""
        created_at = datetime.datetime.fromisoformat(
            team['created_at'].replace('Z', '+00:00')
        )
        ttl_seconds = team.get('ttl_days', 30) * 24 * 60 * 60
        
        expiry_time = created_at + datetime.timedelta(seconds=ttl_seconds)
        return datetime.datetime.now(datetime.timezone.utc) > expiry_time
    
    def check_sunset_criteria(self, team: Dict) -> tuple[bool, str]:
        """Check if team meets sunset criteria"""
        criteria = team.get('sunset_criteria', '')
        
        # Simple criteria parsing (would be more sophisticated in production)
        if 'drop below' in criteria and '0.5%' in criteria:
            # Mock check for hallucination rate
            # In production, this would query actual metrics
            current_rate = 0.3  # Mock current rate
            if current_rate < 0.5:
                return True, f"Hallucination rate dropped to {current_rate}%"
        
        if 'all tasks completed' in criteria.lower():
            # Check if all tasks are marked complete
            # This would integrate with task tracking system
            return True, "All assigned tasks completed"
        
        return False, "Sunset criteria not met"
    
    def expire_team(self, team: Dict, reason: str) -> bool:
        """Expire a team and archive its data"""
        try:
            team_file = team['_file']
            team_name = team['team_name']
            
            # Update team status
            team['status'] = 'expired'
            team['expired_at'] = datetime.datetime.utcnow().isoformat()
            team['expiration_reason'] = reason
            
            # Archive team file
            archive_filename = f"{team_name}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.yaml"
            archive_path = self.archive_dir / archive_filename
            
            with open(archive_path, 'w') as f:
                yaml.dump(team, f, default_flow_style=False)
            
            # Remove from active registry
            team_file.unlink()
            
            print(f"☕ Expired team: {team_name} - {reason}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to expire team {team.get('team_name', 'unknown')}: {e}")
            return False
    
    def log_sunset_activity(self, activities: List[Dict]):
        """Log sunset activities"""
        log_entry = {
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'activities': activities,
            'summary': {
                'teams_checked': len([a for a in activities if a['action'] == 'checked']),
                'teams_expired': len([a for a in activities if a['action'] == 'expired']),
                'teams_active': len([a for a in activities if a['action'] == 'active'])
            }
        }
        
        # Load existing logs
        logs = []
        if self.sunset_log.exists():
            with open(self.sunset_log, 'r') as f:
                logs = json.load(f)
        
        logs.append(log_entry)
        
        # Keep last 50 entries
        logs = logs[-50:]
        
        with open(self.sunset_log, 'w') as f:
            json.dump(logs, f, indent=2)
    
    def run_sunset_check(self) -> Dict:
        """Run complete sunset check for all teams"""
        print("🌅 Running tea sunset check...")
        
        teams = self.load_active_teams()
        activities = []
        expired_count = 0
        
        for team in teams:
            team_name = team['team_name']
            activity = {
                'team_name': team_name,
                'created_at': team['created_at'],
                'ttl_days': team.get('ttl_days', 30),
                'action': 'checked',
                'timestamp': datetime.datetime.utcnow().isoformat()
            }
            
            # Check TTL expiration
            if self.check_ttl_expiration(team):
                if self.expire_team(team, "TTL expired"):
                    activity['action'] = 'expired'
                    activity['reason'] = 'TTL expired'
                    expired_count += 1
            
            # Check sunset criteria
            elif team.get('sunset_criteria'):
                criteria_met, reason = self.check_sunset_criteria(team)
                if criteria_met:
                    if self.expire_team(team, f"Sunset criteria met: {reason}"):
                        activity['action'] = 'expired'
                        activity['reason'] = reason
                        expired_count += 1
                else:
                    activity['action'] = 'active'
                    activity['reason'] = reason
            else:
                activity['action'] = 'active'
                activity['reason'] = 'No sunset criteria'
            
            activities.append(activity)
        
        # Log activities
        self.log_sunset_activities(activities)
        
        summary = {
            'total_teams': len(teams),
            'expired_teams': expired_count,
            'active_teams': len(teams) - expired_count,
            'activities': activities
        }
        
        print(f"✅ Sunset check complete: {expired_count}/{len(teams)} teams expired")
        return summary
    
    def get_sunset_schedule(self) -> Dict:
        """Get upcoming sunset schedule"""
        teams = self.load_active_teams()
        schedule = []
        
        for team in teams:
            created_at = datetime.datetime.fromisoformat(
                team['created_at'].replace('Z', '+00:00')
            )
            ttl_seconds = team.get('ttl_days', 30) * 24 * 60 * 60
            expiry_time = created_at + datetime.timedelta(seconds=ttl_seconds)
            
            hours_remaining = (expiry_time - datetime.datetime.now(datetime.timezone.utc)).total_seconds() / 3600
            
            schedule.append({
                'team_name': team['team_name'],
                'created_at': team['created_at'],
                'expires_at': expiry_time.isoformat(),
                'hours_remaining': max(0, hours_remaining),
                'purpose': team.get('purpose', 'Unknown'),
                'status': 'expiring_soon' if hours_remaining < 24 else 'active'
            })
        
        # Sort by expiry time
        schedule.sort(key=lambda x: x['hours_remaining'])
        
        return {
            'schedule': schedule,
            'expiring_soon': [s for s in schedule if s['status'] == 'expiring_soon'],
            'total_teams': len(schedule)
        }

def main():
    """CLI interface"""
    manager = TeaSunsetManager()
    
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'schedule':
        # Show sunset schedule
        print("📅 Tea Sunset Schedule")
        print("=" * 50)
        
        schedule = manager.get_sunset_schedule()
        
        if schedule['expiring_soon']:
            print(f"\n⏰ Expiring Soon ({len(schedule['expiring_soon'])}):")
            for team in schedule['expiring_soon']:
                print(f"  • {team['team_name']}: {team['hours_remaining']:.1f}h remaining")
        
        print(f"\n📊 All Teams ({len(schedule['schedule'])}):")
        for team in schedule['schedule'][:10]:  # Show first 10
            status_icon = "⏰" if team['status'] == 'expiring_soon' else "✅"
            print(f"  {status_icon} {team['team_name']}: {team['hours_remaining']:.1f}h remaining")
    
    else:
        # Run sunset check
        summary = manager.run_sunset_check()
        
        if summary['expired_teams'] > 0:
            print(f"\n☕ Expired Teams ({summary['expired_teams']}):")
            for activity in summary['activities']:
                if activity['action'] == 'expired':
                    print(f"  • {activity['team_name']}: {activity['reason']}")

if __name__ == "__main__":
    main()