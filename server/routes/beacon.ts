import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { chittyBeacon } from '../services/ChittyBeaconService.js';

const router = Router();

// Custom beacon schema
const customBeaconSchema = z.object({
  event: z.string().default('custom'),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().optional()
});

// Health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const config = chittyBeacon.getConfig();
    const appInfo = chittyBeacon.getAppInfo();
    
    res.json({
      status: 'ok',
      service: 'ChittyBeacon v1.0.0',
      enabled: config.enabled,
      app: appInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'ChittyBeacon v1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get beacon statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await chittyBeacon.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Beacon stats error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Get beacon history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const history = await chittyBeacon.getBeaconHistory();
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    res.json({
      beacons: history.slice(0, limit),
      total: history.length,
      limit
    });
  } catch (error) {
    console.error('Beacon history error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Send custom beacon
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { event, metadata, timestamp } = customBeaconSchema.parse(req.body);
    const appInfo = chittyBeacon.getAppInfo();
    
    if (!appInfo) {
      return res.status(400).json({ error: 'Beacon service not initialized' });
    }

    await chittyBeacon.sendBeacon({
      ...appInfo,
      event: event as any,
      timestamp: timestamp || new Date().toISOString(),
      metadata: {
        ...appInfo.metadata,
        ...metadata,
        custom: true,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({ 
      status: 'ok',
      message: 'Beacon sent successfully',
      event,
      timestamp: timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error('Custom beacon error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send beacon' 
    });
  }
});

// Get app detection info
router.get('/detect', async (req: Request, res: Response) => {
  try {
    const detection = chittyBeacon.detectApp();
    res.json(detection);
  } catch (error) {
    console.error('App detection error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Detection failed' 
    });
  }
});

// Simple dashboard (similar to the original tracker-server.js)
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const history = await chittyBeacon.getBeaconHistory();
    const stats = await chittyBeacon.getStats();
    
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ChittyBeacon Dashboard</title>
          <style>
            body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stat-value { font-size: 2em; font-weight: bold; color: #2563eb; }
            .stat-label { color: #6b7280; margin-top: 5px; }
            .beacon { border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 8px; background: white; }
            .claude { background: #eff6ff; border-color: #3b82f6; }
            .beacon-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
            .beacon-name { font-weight: bold; font-size: 1.1em; }
            .beacon-platform { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; }
            .beacon-time { color: #6b7280; font-size: 0.9em; }
            .refresh-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📡 ChittyBeacon Dashboard</h1>
              <p>Real-time tracking for ChittyChain ecosystem</p>
              <button class="refresh-btn" onclick="location.reload()">Refresh</button>
            </div>
            
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">${stats.total_beacons}</div>
                <div class="stat-label">Total Beacons</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.active_apps}</div>
                <div class="stat-label">Active Apps</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.recent_activity}</div>
                <div class="stat-label">Recent Activity (1h)</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${Object.keys(stats.platforms).length}</div>
                <div class="stat-label">Platforms</div>
              </div>
            </div>

            <h2>Recent Beacons</h2>
            <div id="beacons">
              ${history.slice(0, 20).map(beacon => `
                <div class="beacon ${beacon.has_claude_code ? 'claude' : ''}">
                  <div class="beacon-header">
                    <span class="beacon-name">${beacon.name}</span>
                    <span class="beacon-platform">${beacon.platform}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>
                      ${beacon.event} 
                      ${beacon.has_claude_code ? '🤖 Claude' : ''} 
                      ${beacon.has_git ? '📋 Git' : ''}
                    </span>
                    <span class="beacon-time">${new Date(beacon.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <script>
            // Auto-refresh every 30 seconds
            setTimeout(() => location.reload(), 30000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 20px;">
          <h1>ChittyBeacon Dashboard Error</h1>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
});

export default router;