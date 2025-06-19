#!/usr/bin/env python3
"""
ChittyChain Asset Tracer - Document and trace property ownership
Build immutable chain of ownership evidence for legal protection
"""

import json
import hashlib
import os
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import sqlite3

@dataclass
class AssetDocument:
    """Single document in the ownership chain"""
    doc_type: str  # bank_statement, deed, contract, etc
    date: str
    description: str
    file_path: str
    hash: str
    metadata: Dict

@dataclass 
class AssetEvent:
    """Significant event in asset history"""
    event_type: str  # purchase, payment, transfer, etc
    date: str
    amount: Optional[float]
    description: str
    supporting_docs: List[str]  # Document hashes
    parties: List[str]

@dataclass
class Asset:
    """Property or asset being tracked"""
    asset_id: str
    name: str
    type: str  # real_estate, vehicle, art, etc
    acquisition_date: str
    acquisition_type: str  # purchase, gift, inheritance
    marital_status: str  # separate, marital, mixed
    documents: List[AssetDocument]
    events: List[AssetEvent]
    chain_hash: str

class ChittyChain:
    def __init__(self, db_path="/Users/noshit/MCMANSION/chittychain.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for asset tracking"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Documents table
        c.execute('''CREATE TABLE IF NOT EXISTS documents
                    (hash TEXT PRIMARY KEY,
                     doc_type TEXT,
                     date TEXT,
                     description TEXT,
                     file_path TEXT,
                     metadata TEXT,
                     created_at TEXT)''')
        
        # Events table
        c.execute('''CREATE TABLE IF NOT EXISTS events
                    (event_id TEXT PRIMARY KEY,
                     asset_id TEXT,
                     event_type TEXT,
                     date TEXT,
                     amount REAL,
                     description TEXT,
                     supporting_docs TEXT,
                     parties TEXT,
                     created_at TEXT)''')
        
        # Assets table
        c.execute('''CREATE TABLE IF NOT EXISTS assets
                    (asset_id TEXT PRIMARY KEY,
                     name TEXT,
                     type TEXT,
                     acquisition_date TEXT,
                     acquisition_type TEXT,
                     marital_status TEXT,
                     chain_hash TEXT,
                     created_at TEXT,
                     updated_at TEXT)''')
        
        conn.commit()
        conn.close()
    
    def hash_file(self, file_path: str) -> str:
        """Generate SHA-256 hash of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def add_document(self, doc_type: str, date: str, description: str, 
                    file_path: str, metadata: Dict = None) -> AssetDocument:
        """Add a document to the chain"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")
        
        file_hash = self.hash_file(file_path)
        
        doc = AssetDocument(
            doc_type=doc_type,
            date=date,
            description=description,
            file_path=file_path,
            hash=file_hash,
            metadata=metadata or {}
        )
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''INSERT OR REPLACE INTO documents 
                    (hash, doc_type, date, description, file_path, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)''',
                 (doc.hash, doc.doc_type, doc.date, doc.description, 
                  doc.file_path, json.dumps(doc.metadata), datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
        print(f"✅ Document added: {doc_type} - {description}")
        print(f"   Hash: {file_hash[:16]}...")
        
        return doc
    
    def add_event(self, asset_id: str, event_type: str, date: str,
                 description: str, amount: Optional[float] = None,
                 supporting_docs: List[str] = None, parties: List[str] = None) -> AssetEvent:
        """Add an event to the asset history"""
        event = AssetEvent(
            event_type=event_type,
            date=date,
            amount=amount,
            description=description,
            supporting_docs=supporting_docs or [],
            parties=parties or []
        )
        
        event_id = hashlib.sha256(
            f"{asset_id}{event_type}{date}{description}".encode()
        ).hexdigest()[:16]
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''INSERT INTO events
                    (event_id, asset_id, event_type, date, amount, description,
                     supporting_docs, parties, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (event_id, asset_id, event.event_type, event.date, event.amount,
                  event.description, json.dumps(event.supporting_docs),
                  json.dumps(event.parties), datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
        print(f"✅ Event added: {event_type} on {date}")
        
        return event
    
    def create_asset(self, name: str, asset_type: str, acquisition_date: str,
                    acquisition_type: str, marital_status: str) -> str:
        """Create a new asset to track"""
        asset_id = hashlib.sha256(
            f"{name}{asset_type}{acquisition_date}".encode()
        ).hexdigest()[:16]
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''INSERT INTO assets
                    (asset_id, name, type, acquisition_date, acquisition_type,
                     marital_status, chain_hash, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (asset_id, name, asset_type, acquisition_date, acquisition_type,
                  marital_status, "", datetime.now().isoformat(), 
                  datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
        print(f"✅ Asset created: {name}")
        print(f"   ID: {asset_id}")
        print(f"   Status: {marital_status} property")
        
        return asset_id
    
    def generate_chain_hash(self, asset_id: str) -> str:
        """Generate immutable hash of entire asset history"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Get all events for asset
        c.execute('''SELECT * FROM events WHERE asset_id = ? ORDER BY date''', 
                 (asset_id,))
        events = c.fetchall()
        
        # Create chain string
        chain_data = f"ASSET:{asset_id}"
        for event in events:
            chain_data += f"|EVENT:{event}"
        
        # Generate final hash
        chain_hash = hashlib.sha256(chain_data.encode()).hexdigest()
        
        # Update asset with chain hash
        c.execute('''UPDATE assets SET chain_hash = ?, updated_at = ?
                    WHERE asset_id = ?''',
                 (chain_hash, datetime.now().isoformat(), asset_id))
        conn.commit()
        conn.close()
        
        return chain_hash
    
    def generate_legal_package(self, asset_id: str, output_path: str):
        """Generate complete legal evidence package for an asset"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Get asset info
        c.execute('SELECT * FROM assets WHERE asset_id = ?', (asset_id,))
        asset = c.fetchone()
        
        # Get all events
        c.execute('''SELECT * FROM events WHERE asset_id = ? ORDER BY date''',
                 (asset_id,))
        events = c.fetchall()
        
        # Get all supporting documents
        doc_hashes = set()
        for event in events:
            if event[6]:  # supporting_docs column
                docs = json.loads(event[6])
                doc_hashes.update(docs)
        
        c.execute(f'''SELECT * FROM documents 
                     WHERE hash IN ({','.join(['?']*len(doc_hashes))})''',
                 list(doc_hashes))
        documents = c.fetchall()
        
        conn.close()
        
        # Create legal package
        package = {
            "generated_at": datetime.now().isoformat(),
            "asset": {
                "id": asset[0],
                "name": asset[1],
                "type": asset[2],
                "acquisition_date": asset[3],
                "acquisition_type": asset[4],
                "marital_status": asset[5],
                "chain_hash": asset[6]
            },
            "timeline": [],
            "documents": [],
            "chain_verification": self.generate_chain_hash(asset_id)
        }
        
        # Build timeline
        for event in events:
            package["timeline"].append({
                "date": event[3],
                "type": event[2],
                "description": event[5],
                "amount": event[4],
                "parties": json.loads(event[7]) if event[7] else []
            })
        
        # Include documents
        for doc in documents:
            package["documents"].append({
                "hash": doc[0],
                "type": doc[1],
                "date": doc[2],
                "description": doc[3],
                "file_path": doc[4]
            })
        
        # Save package
        with open(output_path, 'w') as f:
            json.dump(package, f, indent=2)
        
        print(f"\n📄 Legal package generated: {output_path}")
        print(f"   Chain hash: {package['chain_verification'][:32]}...")
        print(f"   Events: {len(package['timeline'])}")
        print(f"   Documents: {len(package['documents'])}")
        
        return package

def main():
    """Interactive ChittyChain interface"""
    chain = ChittyChain()
    
    print("⛓️  ChittyChain Asset Protection System")
    print("=" * 50)
    print("Build immutable ownership evidence")
    print("Commands: new, add-doc, add-event, generate, list, exit\n")
    
    while True:
        cmd = input("⛓️  Command: ").strip().lower()
        
        if cmd == 'exit':
            print("ChittyChain secured. Goodbye!")
            break
            
        elif cmd == 'new':
            print("\n📝 Create New Asset")
            name = input("Asset name: ")
            asset_type = input("Type (real_estate/vehicle/art/other): ")
            acq_date = input("Acquisition date (YYYY-MM-DD): ")
            acq_type = input("How acquired (purchase/gift/inheritance): ")
            marital = input("Marital status (separate/marital/mixed): ")
            
            asset_id = chain.create_asset(name, asset_type, acq_date, 
                                        acq_type, marital)
            
        elif cmd == 'add-doc':
            print("\n📄 Add Document")
            asset_id = input("Asset ID: ")
            doc_type = input("Document type: ")
            date = input("Date (YYYY-MM-DD): ")
            desc = input("Description: ")
            path = input("File path: ")
            
            try:
                chain.add_document(doc_type, date, desc, path)
            except FileNotFoundError as e:
                print(f"❌ Error: {e}")
                
        elif cmd == 'add-event':
            print("\n📅 Add Event")
            asset_id = input("Asset ID: ")
            event_type = input("Event type: ")
            date = input("Date (YYYY-MM-DD): ")
            desc = input("Description: ")
            amount = input("Amount (or press enter): ")
            
            chain.add_event(asset_id, event_type, date, desc,
                          float(amount) if amount else None)
            
        elif cmd == 'generate':
            print("\n⚖️  Generate Legal Package")
            asset_id = input("Asset ID: ")
            output = input("Output file: ")
            
            chain.generate_legal_package(asset_id, output)
            
        elif cmd == 'list':
            conn = sqlite3.connect(chain.db_path)
            c = conn.cursor()
            c.execute('SELECT asset_id, name, type, marital_status FROM assets')
            assets = c.fetchall()
            conn.close()
            
            print("\n📋 Your Assets:")
            for asset in assets:
                print(f"  {asset[0]}: {asset[1]} ({asset[2]}) - {asset[3]}")
            print()

if __name__ == "__main__":
    main()