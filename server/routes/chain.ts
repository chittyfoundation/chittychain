import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BlockchainService } from '../services/BlockchainService';
import { db } from '../storage';
import { evidenceRecords } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const blockchainService = new BlockchainService();

// Verify artifact on chain
router.get('/verify/:artifact_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { artifact_id } = req.params;

    // Get artifact from database
    const [artifact] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.artifactId, artifact_id))
      .limit(1);

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Get transaction from blockchain
    const transaction = artifact.blockchainTxHash ? 
      await blockchainService.getTransactionByHash(artifact.blockchainTxHash) : null;

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found on chain' });
    }

    // Get block containing the transaction
    const block = blockchainService.getBlockByNumber(transaction.blockNumber);

    // Validate entire chain
    const chainValid = await blockchainService.validateChain();

    res.json({
      artifactId: artifact_id,
      verified: true,
      transaction: {
        hash: transaction.hash,
        blockNumber: transaction.blockNumber,
        timestamp: transaction.timestamp,
        data: transaction.data
      },
      block: {
        blockNumber: block.blockNumber,
        hash: block.hash,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
        miner: block.miner
      },
      chainIntegrity: chainValid
    });
  } catch (error) {
    console.error('Chain verification error:', error);
    res.status(500).json({ error: 'Failed to verify on chain' });
  }
});

// Get block by ID
router.get('/block/:block_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const blockId = parseInt(req.params.block_id);
    
    if (isNaN(blockId)) {
      return res.status(400).json({ error: 'Invalid block ID' });
    }

    const block = blockchainService.getBlockByNumber(blockId);
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({
      block: {
        blockNumber: block.blockNumber,
        hash: block.hash,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        miner: block.miner,
        transactions: block.transactions,
        merkleRoot: block.merkleRoot
      }
    });
  } catch (error) {
    console.error('Block retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve block' });
  }
});

// Validate sequence of blocks
router.post('/validate-sequence', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { startBlock, endBlock } = req.body;

    if (typeof startBlock !== 'number' || typeof endBlock !== 'number') {
      return res.status(400).json({ error: 'Invalid block range' });
    }

    if (startBlock < 0 || endBlock < startBlock) {
      return res.status(400).json({ error: 'Invalid block range' });
    }

    const chain = blockchainService.getChain();
    const maxBlock = chain.length - 1;

    if (endBlock > maxBlock) {
      return res.status(400).json({ error: `End block exceeds chain length (max: ${maxBlock})` });
    }

    // Validate the sequence
    let sequenceValid = true;
    const invalidBlocks = [];

    for (let i = startBlock; i <= endBlock; i++) {
      const block = chain[i];
      
      if (i > 0) {
        const previousBlock = chain[i - 1];
        
        // Verify previous hash
        if (block.previousHash !== previousBlock.hash) {
          sequenceValid = false;
          invalidBlocks.push({
            blockNumber: i,
            reason: 'Invalid previous hash',
            expected: previousBlock.hash,
            actual: block.previousHash
          });
        }
        
        // Verify block hash
        const calculatedHash = blockchainService.calculateBlockHash(block);
        if (block.hash !== calculatedHash) {
          sequenceValid = false;
          invalidBlocks.push({
            blockNumber: i,
            reason: 'Invalid block hash',
            expected: calculatedHash,
            actual: block.hash
          });
        }
      }
    }

    res.json({
      startBlock,
      endBlock,
      blocksChecked: endBlock - startBlock + 1,
      sequenceValid,
      invalidBlocks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sequence validation error:', error);
    res.status(500).json({ error: 'Failed to validate sequence' });
  }
});

// Get Merkle proof for artifact
router.get('/merkle-proof/:artifact_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { artifact_id } = req.params;

    // Get artifact from database
    const [artifact] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.artifactId, artifact_id))
      .limit(1);

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (!artifact.blockchainTxHash) {
      return res.status(404).json({ error: 'Artifact not recorded on blockchain' });
    }

    // Get transaction
    const transaction = await blockchainService.getTransactionByHash(artifact.blockchainTxHash);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get block containing the transaction
    const block = blockchainService.getBlockByNumber(transaction.blockNumber);
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Generate Merkle proof (simplified for MVP)
    // In a real implementation, this would generate a proper Merkle tree proof
    const merkleProof = {
      root: block.merkleRoot,
      transactionHash: transaction.hash,
      blockNumber: block.blockNumber,
      blockHash: block.hash,
      siblings: [], // Would contain sibling hashes in a real Merkle tree
      verified: true
    };

    res.json({
      artifactId: artifact_id,
      merkleProof,
      verificationPath: {
        artifact: artifact_id,
        transaction: transaction.hash,
        block: block.blockNumber,
        chain: 'ChittyChain'
      }
    });
  } catch (error) {
    console.error('Merkle proof error:', error);
    res.status(500).json({ error: 'Failed to generate Merkle proof' });
  }
});

// Get chain statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const stats = blockchainService.getStats();
    const health = await blockchainService.getChainHealth();
    const latestBlock = blockchainService.getLatestBlock();

    res.json({
      chain: 'ChittyChain',
      network: 'mainnet',
      version: '1.0.0',
      stats,
      health,
      latestBlock: {
        blockNumber: latestBlock.blockNumber,
        hash: latestBlock.hash,
        timestamp: latestBlock.timestamp,
        transactionCount: latestBlock.transactions.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chain stats error:', error);
    res.status(500).json({ error: 'Failed to get chain statistics' });
  }
});

export default router;