#!/usr/bin/env python3
"""
ChittyChain Oversight System - Validation, alerts, and integrity monitoring
Ensures the chain remains legally bulletproof
"""

import json
import sqlite3
import hashlib
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import smtplib
from email.mime.text import MIMEText

class ChittyChainOversight:
    def __init__(self, db_path="/Users/noshit/MCMANSION/chittychain.db"):
        self.db_path = db_path
        self.alerts = []
        self.validation_rules = self.load_validation_rules()
        
    def load_validation_rules(self) -> Dict:
        """Legal validation rules for different jurisdictions"""
        return {
            "separate_property": {
                "required_docs": ["bank_statement", "purchase_agreement", "deed"],
                "timing_rules": {
                    "funds_before_purchase": 30,  # Days funds must exist before purchase
                    "marriage_buffer": 0  # Must be acquired before marriage date
                },
                "red_flags": [
                    "joint_account", "spouse_signature", "marital_funds", 
                    "community_property", "gift_from_spouse"
                ]
            },
            "chain_integrity": {
                "max_gap_days": 90,  # Max days between related events
                "required_sequence": ["funds_available", "purchase_agreement", "closing", "deed_recorded"],
                "suspicious_patterns": [
                    "backdated_documents", "round_number_transfers", 
                    "multiple_transfers_same_day", "missing_bank_records"
                ]
            }
        }
    
    def validate_document(self, doc_hash: str) -> Tuple[bool, List[str]]:
        """Validate a single document for red flags"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT * FROM documents WHERE hash = ?', (doc_hash,))
        doc = c.fetchone()
        conn.close()
        
        if not doc:
            return False, ["Document not found in chain"]
        
        issues = []
        metadata = json.loads(doc[5]) if doc[5] else {}
        
        # Check for red flags in metadata
        for red_flag in self.validation_rules["separate_property"]["red_flags"]:
            if red_flag in str(metadata).lower():
                issues.append(f"Red flag detected: {red_flag}")
        
        # Verify file still exists and matches hash
        if os.path.exists(doc[4]):
            current_hash = self.hash_file(doc[4])
            if current_hash != doc_hash:
                issues.append("CRITICAL: File has been modified since addition to chain")
        else:
            issues.append("WARNING: Original file no longer exists at recorded path")
        
        return len(issues) == 0, issues
    
    def validate_timeline(self, asset_id: str) -> Tuple[bool, List[str]]:
        """Validate the timeline makes legal sense"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Get all events chronologically
        c.execute('''SELECT * FROM events WHERE asset_id = ? ORDER BY date''', 
                 (asset_id,))
        events = c.fetchall()
        
        # Get asset info
        c.execute('SELECT * FROM assets WHERE asset_id = ?', (asset_id,))
        asset = c.fetchone()
        conn.close()
        
        issues = []
        
        if not events:
            issues.append("No events recorded for asset")
            return False, issues
        
        # Check for timeline gaps
        for i in range(1, len(events)):
            prev_date = datetime.fromisoformat(events[i-1][3])
            curr_date = datetime.fromisoformat(events[i][3])
            gap_days = (curr_date - prev_date).days
            
            if gap_days > self.validation_rules["chain_integrity"]["max_gap_days"]:
                issues.append(f"Large gap ({gap_days} days) between events on {events[i-1][3]} and {events[i][3]}")
        
        # Check for required sequence
        event_types = [e[2] for e in events]
        required_seq = self.validation_rules["chain_integrity"]["required_sequence"]
        
        for i, required in enumerate(required_seq):
            if required not in event_types:
                issues.append(f"Missing required event: {required}")
            elif i > 0:
                # Check order
                prev_idx = event_types.index(required_seq[i-1])
                curr_idx = event_types.index(required)
                if curr_idx < prev_idx:
                    issues.append(f"Event order violation: {required} before {required_seq[i-1]}")
        
        # Check marital timing for separate property
        if asset and asset[5] == "separate":
            marriage_date = self.get_marriage_date()
            if marriage_date:
                acq_date = datetime.fromisoformat(asset[3])
                if acq_date >= marriage_date:
                    issues.append("CRITICAL: Asset acquired after marriage but claimed as separate")
        
        return len(issues) == 0, issues
    
    def detect_anomalies(self, asset_id: str) -> List[Dict]:
        """Detect suspicious patterns in asset history"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''SELECT * FROM events WHERE asset_id = ? ORDER BY date''', 
                 (asset_id,))
        events = c.fetchall()
        conn.close()
        
        anomalies = []
        
        # Check for round number transactions (often fabricated)
        for event in events:
            if event[4]:  # amount
                amount = float(event[4])
                if amount % 1000 == 0 and amount > 10000:
                    anomalies.append({
                        "type": "round_number",
                        "event": event[2],
                        "date": event[3],
                        "amount": amount,
                        "risk": "medium"
                    })
        
        # Check for multiple events on same day (suspicious)
        date_counts = {}
        for event in events:
            date = event[3]
            date_counts[date] = date_counts.get(date, 0) + 1
        
        for date, count in date_counts.items():
            if count > 2:
                anomalies.append({
                    "type": "multiple_same_day",
                    "date": date,
                    "count": count,
                    "risk": "high"
                })
        
        # Check for backdating patterns
        for event in events:
            event_date = datetime.fromisoformat(event[3])
            created_date = datetime.fromisoformat(event[8])
            
            days_diff = (created_date.date() - event_date.date()).days
            if days_diff > 365:  # Event added more than a year after it happened
                anomalies.append({
                    "type": "potential_backdating",
                    "event": event[2],
                    "event_date": event[3],
                    "added_date": event[8],
                    "days_after": days_diff,
                    "risk": "high"
                })
        
        return anomalies
    
    def generate_oversight_report(self, asset_id: str) -> Dict:
        """Generate comprehensive oversight report"""
        report = {
            "generated_at": datetime.now().isoformat(),
            "asset_id": asset_id,
            "validation_results": {},
            "anomalies": [],
            "recommendations": [],
            "legal_readiness_score": 0
        }
        
        # Get asset info
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT * FROM assets WHERE asset_id = ?', (asset_id,))
        asset = c.fetchone()
        
        if not asset:
            report["error"] = "Asset not found"
            return report
        
        report["asset_name"] = asset[1]
        report["asset_type"] = asset[2]
        
        # Run timeline validation
        timeline_valid, timeline_issues = self.validate_timeline(asset_id)
        report["validation_results"]["timeline"] = {
            "valid": timeline_valid,
            "issues": timeline_issues
        }
        
        # Check all documents
        c.execute('''SELECT DISTINCT supporting_docs FROM events WHERE asset_id = ?''',
                 (asset_id,))
        all_doc_lists = c.fetchall()
        conn.close()
        
        doc_issues = []
        for doc_list in all_doc_lists:
            if doc_list[0]:
                docs = json.loads(doc_list[0])
                for doc_hash in docs:
                    valid, issues = self.validate_document(doc_hash)
                    if not valid:
                        doc_issues.extend(issues)
        
        report["validation_results"]["documents"] = {
            "valid": len(doc_issues) == 0,
            "issues": doc_issues
        }
        
        # Detect anomalies
        report["anomalies"] = self.detect_anomalies(asset_id)
        
        # Calculate legal readiness score
        score = 100
        score -= len(timeline_issues) * 10
        score -= len(doc_issues) * 5
        score -= len([a for a in report["anomalies"] if a["risk"] == "high"]) * 15
        score -= len([a for a in report["anomalies"] if a["risk"] == "medium"]) * 5
        score = max(0, score)
        
        report["legal_readiness_score"] = score
        
        # Generate recommendations
        if score < 70:
            report["recommendations"].append("Address critical issues before using in legal proceedings")
        
        if len(timeline_issues) > 0:
            report["recommendations"].append("Fill timeline gaps with additional documentation")
            
        if len(doc_issues) > 0:
            report["recommendations"].append("Locate original documents or obtain certified copies")
            
        if len(report["anomalies"]) > 0:
            report["recommendations"].append("Prepare explanations for detected anomalies")
        
        return report
    
    def monitor_changes(self):
        """Monitor for unauthorized changes to the chain"""
        # This would run as a daemon/cron job
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Check if any chain hashes have changed
        c.execute('SELECT asset_id, chain_hash FROM assets')
        assets = c.fetchall()
        
        for asset_id, stored_hash in assets:
            current_hash = self.generate_chain_hash(asset_id)
            if current_hash != stored_hash:
                self.alerts.append({
                    "type": "chain_tampering",
                    "asset_id": asset_id,
                    "timestamp": datetime.now().isoformat(),
                    "severity": "critical"
                })
        
        conn.close()
    
    def hash_file(self, file_path: str) -> str:
        """Generate SHA-256 hash of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def generate_chain_hash(self, asset_id: str) -> str:
        """Recalculate chain hash for verification"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''SELECT * FROM events WHERE asset_id = ? ORDER BY date''', 
                 (asset_id,))
        events = c.fetchall()
        conn.close()
        
        chain_data = f"ASSET:{asset_id}"
        for event in events:
            chain_data += f"|EVENT:{event}"
        
        return hashlib.sha256(chain_data.encode()).hexdigest()
    
    def get_marriage_date(self) -> Optional[datetime]:
        """Get marriage date from configuration or events"""
        # This would be configured per user
        # For now, return a sample date
        return datetime(2020, 1, 1)  # Would read from config

def main():
    """Run oversight checks"""
    oversight = ChittyChainOversight()
    
    print("🔍 ChittyChain Oversight System")
    print("=" * 50)
    print("Validating chain integrity and legal readiness\n")
    
    # Get asset to check
    conn = sqlite3.connect(oversight.db_path)
    c = conn.cursor()
    c.execute('SELECT asset_id, name FROM assets')
    assets = c.fetchall()
    conn.close()
    
    if not assets:
        print("No assets found. Create assets with chittychain_asset_tracer.py first.")
        return
    
    print("Available assets:")
    for asset_id, name in assets:
        print(f"  {asset_id}: {name}")
    
    asset_id = input("\nAsset ID to validate: ").strip()
    
    print("\n⏳ Running oversight checks...")
    report = oversight.generate_oversight_report(asset_id)
    
    print(f"\n📊 Oversight Report for {report.get('asset_name', 'Unknown')}")
    print("=" * 50)
    
    print(f"\n⚖️  Legal Readiness Score: {report['legal_readiness_score']}/100")
    
    if report['legal_readiness_score'] >= 90:
        print("   ✅ Excellent - Ready for legal proceedings")
    elif report['legal_readiness_score'] >= 70:
        print("   ⚠️  Good - Minor issues to address")
    else:
        print("   ❌ Poor - Significant issues need resolution")
    
    print("\n📋 Timeline Validation:")
    timeline = report['validation_results']['timeline']
    if timeline['valid']:
        print("   ✅ Timeline is legally sound")
    else:
        print("   ❌ Timeline issues detected:")
        for issue in timeline['issues']:
            print(f"      - {issue}")
    
    print("\n📄 Document Validation:")
    docs = report['validation_results']['documents']
    if docs['valid']:
        print("   ✅ All documents verified")
    else:
        print("   ❌ Document issues found:")
        for issue in docs['issues']:
            print(f"      - {issue}")
    
    if report['anomalies']:
        print("\n⚠️  Anomalies Detected:")
        for anomaly in report['anomalies']:
            risk_color = "🔴" if anomaly['risk'] == 'high' else "🟡"
            print(f"   {risk_color} {anomaly['type']}: {anomaly}")
    
    if report['recommendations']:
        print("\n💡 Recommendations:")
        for rec in report['recommendations']:
            print(f"   • {rec}")
    
    # Save report
    report_path = f"oversight_report_{asset_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📁 Full report saved to: {report_path}")

if __name__ == "__main__":
    main()