import crypto from 'crypto';
import { EventEmitter } from 'events';

interface ChittyBlock {
  blockNumber: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  merkleRoot: string;
  nonce: number;
  difficulty: number;
  transactions: ChittyTransaction[];
  miner?: string;
}

interface ChittyTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed?: number;
  type: 'evidence' | 'property' | 'case' | 'contract' | 'audit';
  data: any;
  timestamp: number;
}

interface ProofOfAuditData {
  evidenceCount: number;
  verificationRate: number;
  auditTrailComplete: boolean;
  complianceScore: number;
}

export class ChittyChain extends EventEmitter {
  private chain: ChittyBlock[] = [];
  private pendingTransactions: ChittyTransaction[] = [];
  private difficulty: number = 4;
  private miningReward: string = '100';
  private auditRequirement: number = 0.95; // 95% compliance required

  constructor() {
    super();
    this.createGenesisBlock();
  }

  private createGenesisBlock(): void {
    const genesisBlock: ChittyBlock = {
      blockNumber: 0,
      hash: this.calculateHash({
        blockNumber: 0,
        previousHash: '0',
        timestamp: Date.now(),
        merkleRoot: '0',
        nonce: 0,
        difficulty: this.difficulty,
        transactions: [],
      }),
      previousHash: '0',
      timestamp: Date.now(),
      merkleRoot: '0',
      nonce: 0,
      difficulty: this.difficulty,
      transactions: [],
      miner: 'genesis',
    };

    this.chain.push(genesisBlock);
    this.emit('blockAdded', genesisBlock);
  }

  private calculateHash(block: Omit<ChittyBlock, 'hash' | 'miner'>): string {
    const data = JSON.stringify({
      blockNumber: block.blockNumber,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      merkleRoot: block.merkleRoot,
      nonce: block.nonce,
      transactions: block.transactions,
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private calculateMerkleRoot(transactions: ChittyTransaction[]): string {
    if (transactions.length === 0) return '0';
    
    const hashes = transactions.map(tx => tx.hash);
    
    while (hashes.length > 1) {
      const newHashes: string[] = [];
      
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        const combined = crypto.createHash('sha256').update(left + right).digest('hex');
        newHashes.push(combined);
      }
      
      hashes.length = 0;
      hashes.push(...newHashes);
    }
    
    return hashes[0];
  }

  private validateProofOfAudit(transactions: ChittyTransaction[]): ProofOfAuditData {
    const evidenceTransactions = transactions.filter(tx => tx.type === 'evidence');
    const auditTransactions = transactions.filter(tx => tx.type === 'audit');
    
    const evidenceCount = evidenceTransactions.length;
    const verificationRate = evidenceCount > 0 ? 
      evidenceTransactions.filter(tx => tx.data.verifiedBy).length / evidenceCount : 1;
    
    const auditTrailComplete = auditTransactions.length >= evidenceCount;
    const complianceScore = (verificationRate + (auditTrailComplete ? 1 : 0)) / 2;

    return {
      evidenceCount,
      verificationRate,
      auditTrailComplete,
      complianceScore,
    };
  }

  private mineBlock(block: Omit<ChittyBlock, 'hash' | 'miner'>, miner: string): ChittyBlock {
    const target = '0'.repeat(this.difficulty);
    let nonce = 0;
    
    while (true) {
      const candidateBlock = { ...block, nonce };
      const hash = this.calculateHash(candidateBlock);
      
      if (hash.substring(0, this.difficulty) === target) {
        return {
          ...candidateBlock,
          hash,
          miner,
        };
      }
      
      nonce++;
    }
  }

  public addTransaction(transaction: Omit<ChittyTransaction, 'hash' | 'timestamp'>): string {
    const txHash = crypto.createHash('sha256')
      .update(JSON.stringify(transaction) + Date.now())
      .digest('hex');

    const fullTransaction: ChittyTransaction = {
      ...transaction,
      hash: txHash,
      timestamp: Date.now(),
    };

    this.pendingTransactions.push(fullTransaction);
    this.emit('transactionAdded', fullTransaction);
    
    return txHash;
  }

  public minePendingTransactions(miner: string): ChittyBlock | null {
    if (this.pendingTransactions.length === 0) {
      return null;
    }

    // Validate proof of audit before mining
    const auditData = this.validateProofOfAudit(this.pendingTransactions);
    if (auditData.complianceScore < this.auditRequirement) {
      throw new Error(`Block failed proof-of-audit validation. Compliance score: ${auditData.complianceScore}`);
    }

    const rewardTransaction: ChittyTransaction = {
      hash: crypto.createHash('sha256').update(`reward-${miner}-${Date.now()}`).digest('hex'),
      from: 'system',
      to: miner,
      value: this.miningReward,
      gasPrice: '0',
      type: 'audit',
      data: { reward: true, auditData },
      timestamp: Date.now(),
    };

    const transactions = [...this.pendingTransactions, rewardTransaction];
    const merkleRoot = this.calculateMerkleRoot(transactions);
    
    const newBlock = this.mineBlock({
      blockNumber: this.chain.length,
      previousHash: this.getLatestBlock().hash,
      timestamp: Date.now(),
      merkleRoot,
      nonce: 0,
      difficulty: this.difficulty,
      transactions,
    }, miner);

    this.chain.push(newBlock);
    this.pendingTransactions = [];
    
    this.emit('blockMined', newBlock);
    return newBlock;
  }

  public getLatestBlock(): ChittyBlock {
    return this.chain[this.chain.length - 1];
  }

  public getChain(): ChittyBlock[] {
    return [...this.chain];
  }

  public getBalance(address: string): string {
    let balance = BigInt(0);

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.from === address) {
          balance -= BigInt(transaction.value);
        }
        if (transaction.to === address) {
          balance += BigInt(transaction.value);
        }
      }
    }

    return balance.toString();
  }

  public validateChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Validate hash
      const calculatedHash = this.calculateHash({
        blockNumber: currentBlock.blockNumber,
        previousHash: currentBlock.previousHash,
        timestamp: currentBlock.timestamp,
        merkleRoot: currentBlock.merkleRoot,
        nonce: currentBlock.nonce,
        difficulty: currentBlock.difficulty,
        transactions: currentBlock.transactions,
      });

      if (currentBlock.hash !== calculatedHash) {
        return false;
      }

      // Validate chain linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      // Validate merkle root
      const calculatedMerkleRoot = this.calculateMerkleRoot(currentBlock.transactions);
      if (currentBlock.merkleRoot !== calculatedMerkleRoot) {
        return false;
      }

      // Validate proof of audit
      const auditData = this.validateProofOfAudit(currentBlock.transactions);
      if (auditData.complianceScore < this.auditRequirement) {
        return false;
      }
    }

    return true;
  }

  public getBlockByNumber(blockNumber: number): ChittyBlock | undefined {
    return this.chain.find(block => block.blockNumber === blockNumber);
  }

  public getTransactionByHash(hash: string): ChittyTransaction | undefined {
    for (const block of this.chain) {
      const transaction = block.transactions.find(tx => tx.hash === hash);
      if (transaction) {
        return transaction;
      }
    }
    return undefined;
  }

  public getStats() {
    const latestBlock = this.getLatestBlock();
    const totalTransactions = this.chain.reduce((sum, block) => sum + block.transactions.length, 0);
    const evidenceRecords = this.chain.reduce((sum, block) => 
      sum + block.transactions.filter(tx => tx.type === 'evidence').length, 0);
    
    return {
      totalBlocks: this.chain.length,
      latestBlockNumber: latestBlock.blockNumber,
      totalTransactions,
      evidenceRecords,
      pendingTransactions: this.pendingTransactions.length,
      difficulty: this.difficulty,
      isValid: this.validateChain(),
    };
  }
}
