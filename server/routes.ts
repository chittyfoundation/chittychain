import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { neonStorage as storage } from "./neon-storage.js";
import chittyIdRoutes from "./routes/chittyid.js";
import beaconRoutes from "./routes/beacon.js";
import { chittyBeacon } from "./services/ChittyBeaconService.js";
import { BlockchainService } from "./services/BlockchainService.js";
import { EvidenceService } from "./services/EvidenceService.js";
import { PropertyService } from "./services/PropertyService.js";
import { CaseService } from "./services/CaseService.js";
import { insertBlockSchema, insertEvidenceSchema, insertCaseSchema, insertPropertySchema, insertTransactionSchema } from "@shared/schema.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const blockchainService = new BlockchainService();
  const evidenceService = new EvidenceService();
  const propertyService = new PropertyService();
  const caseService = new CaseService();

  // ChittyID routes
  app.use("/api/chittyid", chittyIdRoutes);

  // ChittyBeacon routes
  app.use("/api/beacon", beaconRoutes);

  // Initialize ChittyBeacon tracking
  chittyBeacon.initialize().catch(console.error);

  // Blockchain routes
  app.get("/api/blockchain/status", async (req, res) => {
    try {
      const stats = blockchainService.getStats();
      const health = await blockchainService.getChainHealth();
      res.json({ stats, health });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/blockchain/chain", async (req, res) => {
    try {
      const chain = blockchainService.getChain();
      res.json(chain);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/blockchain/block/:number", async (req, res) => {
    try {
      const blockNumber = parseInt(req.params.number);
      const block = blockchainService.getBlockByNumber(blockNumber);
      if (!block) {
        return res.status(404).json({ error: "Block not found" });
      }
      res.json(block);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/blockchain/mine", async (req, res) => {
    try {
      const { miner } = req.body;
      if (!miner) {
        return res.status(400).json({ error: "Miner address required" });
      }
      const block = await blockchainService.mineBlock(miner);
      res.json(block);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/blockchain/transactions/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const transactions = await blockchainService.getRecentTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Evidence routes
  app.post("/api/evidence/submit", async (req, res) => {
    try {
      const validatedData = insertEvidenceSchema.parse(req.body);
      
      // Record evidence on blockchain
      const txHash = await blockchainService.recordEvidence(
        validatedData.caseId,
        validatedData.hash,
        validatedData.submittedBy,
        validatedData.metadata
      );

      // Store in database
      const evidence = await storage.createEvidence({
        ...validatedData,
        blockNumber: blockchainService.getLatestBlock().blockNumber,
      });

      res.json({ evidence, transactionHash: txHash });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/evidence/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      const { verifiedBy, notes } = req.body;
      
      const evidence = await evidenceService.verifyEvidence(id, verifiedBy, notes);
      await storage.updateEvidence(id, { verifiedBy, verifiedAt: new Date() });
      
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/evidence/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const evidence = await storage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ error: "Evidence not found" });
      }
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/evidence/case/:caseId", async (req, res) => {
    try {
      const { caseId } = req.params;
      const evidence = await storage.getEvidenceByCase(caseId);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Case management routes
  app.post("/api/case/create", async (req, res) => {
    try {
      const validatedData = insertCaseSchema.parse(req.body);
      
      // Create case on blockchain
      const txHash = await blockchainService.createCase(
        validatedData.caseNumber,
        validatedData.createdBy,
        validatedData
      );

      // Store in database
      const legalCase = await storage.createCase(validatedData);
      
      res.json({ case: legalCase, transactionHash: txHash });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/case/:caseNumber", async (req, res) => {
    try {
      const { caseNumber } = req.params;
      const legalCase = await storage.getCase(caseNumber);
      if (!legalCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      res.json(legalCase);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/cases", async (req, res) => {
    try {
      const cases = await storage.getAllCases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Property NFT routes
  app.post("/api/property/mint", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      
      // Mint NFT on blockchain
      const txHash = await blockchainService.mintPropertyNFT(
        validatedData.propertyAddress,
        validatedData.owner,
        validatedData.metadata
      );

      // Store in database
      const property = await storage.createProperty({
        ...validatedData,
        blockNumber: blockchainService.getLatestBlock().blockNumber,
      });

      res.json({ property, transactionHash: txHash });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/property/:tokenId", async (req, res) => {
    try {
      const tokenId = parseInt(req.params.tokenId);
      const property = await storage.getProperty(tokenId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/property/owner/:owner", async (req, res) => {
    try {
      const { owner } = req.params;
      const properties = await storage.getPropertiesByOwner(owner);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Smart contract routes
  app.get("/api/contracts", async (req, res) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // System stats and monitoring
  app.get("/api/stats", async (req, res) => {
    try {
      const blockchainStats = blockchainService.getStats();
      const caseStats = await caseService.getCaseStats();
      const propertyStats = await propertyService.getPropertyStats();
      
      res.json({
        blockchain: blockchainStats,
        cases: caseStats,
        properties: propertyStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/audit/trail", async (req, res) => {
    try {
      const auditLogs = await storage.getAllAuditLogs();
      res.json(auditLogs);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // AI Analysis routes - import and mount
  try {
    const { aiAnalysisRouter } = await import('./routes/ai-analysis.js');
    app.use('/api/v1/ai-analysis', aiAnalysisRouter);
    console.log('✅ AI Analysis routes mounted at /api/v1/ai-analysis');
  } catch (error) {
    console.error('❌ Failed to load AI Analysis routes:', error);
  }

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    
    // Send initial data
    const initialData = {
      type: 'connection',
      data: { status: 'connected', timestamp: new Date().toISOString() }
    };
    ws.send(JSON.stringify(initialData));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Function to broadcast to all connected clients
  const broadcast = (message: any) => {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };

  // Listen to blockchain events and broadcast
  blockchainService.on('newBlock', (block) => {
    broadcast({
      type: 'new_block',
      data: block
    });
  });

  blockchainService.on('newTransaction', (transaction) => {
    broadcast({
      type: 'new_transaction',
      data: transaction
    });
  });

  blockchainService.on('blockMined', (block) => {
    broadcast({
      type: 'block_mined',
      data: block
    });
  });

  // Periodic stats updates
  setInterval(async () => {
    try {
      const stats = blockchainService.getStats();
      const health = await blockchainService.getChainHealth();
      
      broadcast({
        type: 'system_stats',
        data: { stats, health, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Error broadcasting stats:', error);
    }
  }, 30000); // Every 30 seconds

  return httpServer;
}
