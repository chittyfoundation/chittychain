import express, { type Express, type Request, type Response } from 'express';
import { createServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import { neonStorage as storage } from './neon-storage.js';
import { approvalsRouter } from './routes/approvals';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerSimpleRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);

  // Serve static files from dist/public
  const staticPath = path.join(__dirname, '..', 'dist', 'public');
  app.use(express.static(staticPath));

  // Register approval routes
  app.use('/api/v1/approvals', approvalsRouter);

  // Basic API endpoints for ChittyChain
  app.get('/api/v1/status', (req: Request, res: Response) => {
    res.json({
      status: 'running',
      blockchain: 'ChittyChain',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/v1/blocks', async (req: Request, res: Response) => {
    try {
      const blocks = await storage.getAllBlocks();
      res.json({ blocks });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch blocks' });
    }
  });

  app.get('/api/v1/evidence', async (req: Request, res: Response) => {
    try {
      const evidence = await storage.getAllEvidence();
      res.json({ evidence });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch evidence' });
    }
  });

  app.get('/api/v1/cases', async (req: Request, res: Response) => {
    try {
      const cases = await storage.getAllCases();
      res.json({ cases });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch cases' });
    }
  });

  app.get('/api/v1/properties', async (req: Request, res: Response) => {
    try {
      const properties = await storage.getAllProperties();
      res.json({ properties });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  });

  // WebSocket server setup
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send initial blockchain status
    ws.send(JSON.stringify({
      type: 'blockchain_status',
      data: {
        connected: true,
        timestamp: new Date().toISOString()
      }
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
        
        // Echo back for now
        ws.send(JSON.stringify({
          type: 'response',
          data: { received: data }
        }));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return server;
}