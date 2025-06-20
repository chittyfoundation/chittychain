import { ChittyChain } from '../blockchain/ChittyChain.js';
import { EventEmitter } from 'events';
import { getWebSocketService } from './websocket';

export class BlockchainService extends EventEmitter {
  private chittyChain: ChittyChain;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.chittyChain = new ChittyChain();
    this.initialize();
  }

  private initialize(): void {
    // Set up event listeners for the blockchain
    this.chittyChain.on('blockAdded', (block) => {
      this.emit('newBlock', block);
      
      // Emit WebSocket event
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.emitBlockchainUpdate('block_added', {
          blockNumber: block.index,
          hash: block.hash,
          previousHash: block.previousHash,
          timestamp: block.timestamp,
          transactionCount: block.transactions.length
        });
      }
    });

    this.chittyChain.on('transactionAdded', (transaction) => {
      this.emit('newTransaction', transaction);
      
      // Emit WebSocket event
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.emitBlockchainUpdate('transaction_added', {
          txHash: transaction.hash,
          from: transaction.from,
          to: transaction.to,
          type: transaction.type,
          timestamp: transaction.timestamp
        });
      }
    });

    this.chittyChain.on('blockMined', (block) => {
      this.emit('blockMined', block);
      
      // Emit WebSocket event
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.emitBlockchainUpdate('block_mined', {
          blockNumber: block.index,
          hash: block.hash,
          miner: block.miner,
          difficulty: block.difficulty,
          nonce: block.nonce,
          transactionCount: block.transactions.length
        });
      }
    });

    this.isInitialized = true;
  }

  public async addTransaction(type: string, from: string, to: string, value: string, data: any): Promise<string> {
    try {
      const txHash = this.chittyChain.addTransaction({
        from,
        to,
        value,
        gasPrice: '20000000000', // 20 gwei
        type: type as any,
        data,
      });

      return txHash;
    } catch (error) {
      throw new Error(`Failed to add transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async recordEvidence(caseId: string, evidenceHash: string, submittedBy: string, metadata: any): Promise<string> {
    try {
      const evidenceData = {
        caseId,
        evidenceHash,
        submittedBy,
        metadata,
        timestamp: Date.now(),
      };

      const txHash = await this.addTransaction(
        'evidence',
        submittedBy,
        'evidence_contract',
        '0',
        evidenceData
      );

      return txHash;
    } catch (error) {
      throw new Error(`Failed to record evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async mintPropertyNFT(
    propertyAddress: string,
    owner: string,
    metadata: any
  ): Promise<string> {
    try {
      const propertyData = {
        propertyAddress,
        owner,
        metadata,
        timestamp: Date.now(),
      };

      const txHash = await this.addTransaction(
        'property',
        'system',
        owner,
        '0',
        propertyData
      );

      return txHash;
    } catch (error) {
      throw new Error(`Failed to mint property NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async createCase(caseNumber: string, createdBy: string, caseData: any): Promise<string> {
    try {
      const txHash = await this.addTransaction(
        'case',
        createdBy,
        'case_contract',
        '0',
        { caseNumber, ...caseData, timestamp: Date.now() }
      );

      return txHash;
    } catch (error) {
      throw new Error(`Failed to create case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async mineBlock(miner: string): Promise<any> {
    try {
      const block = this.chittyChain.minePendingTransactions(miner);
      return block;
    } catch (error) {
      throw new Error(`Failed to mine block: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public getLatestBlock(): any {
    return this.chittyChain.getLatestBlock();
  }

  public getChain(): any[] {
    return this.chittyChain.getChain();
  }

  public getStats(): any {
    return this.chittyChain.getStats();
  }

  public getBalance(address: string): string {
    return this.chittyChain.getBalance(address);
  }

  public validateChain(): boolean {
    return this.chittyChain.validateChain();
  }

  public getBlockByNumber(blockNumber: number): any {
    return this.chittyChain.getBlockByNumber(blockNumber);
  }

  public getTransactionByHash(hash: string): any {
    return this.chittyChain.getTransactionByHash(hash);
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async getRecentTransactions(limit: number = 10): Promise<any[]> {
    const chain = this.getChain();
    const transactions: any[] = [];

    // Get recent transactions from the last few blocks
    for (let i = chain.length - 1; i >= 0 && transactions.length < limit; i--) {
      const block = chain[i];
      for (let j = block.transactions.length - 1; j >= 0 && transactions.length < limit; j--) {
        transactions.push({
          ...block.transactions[j],
          blockNumber: block.blockNumber,
          blockHash: block.hash,
        });
      }
    }

    return transactions;
  }

  public async getChainHealth(): Promise<{
    isValid: boolean;
    totalBlocks: number;
    totalTransactions: number;
    averageBlockTime: number;
    lastBlockTime: number;
  }> {
    const stats = this.getStats();
    const chain = this.getChain();
    
    let totalBlockTime = 0;
    let blockTimeCount = 0;

    if (chain.length > 1) {
      for (let i = 1; i < chain.length; i++) {
        const timeDiff = chain[i].timestamp - chain[i - 1].timestamp;
        totalBlockTime += timeDiff;
        blockTimeCount++;
      }
    }

    const averageBlockTime = blockTimeCount > 0 ? totalBlockTime / blockTimeCount : 0;
    const lastBlock = this.getLatestBlock();

    return {
      isValid: this.validateChain(),
      totalBlocks: stats.totalBlocks,
      totalTransactions: stats.totalTransactions,
      averageBlockTime: Math.round(averageBlockTime / 1000), // Convert to seconds
      lastBlockTime: lastBlock ? Math.round((Date.now() - lastBlock.timestamp) / 1000) : 0,
    };
  }
}
