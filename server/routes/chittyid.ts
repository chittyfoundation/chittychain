import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ChittyID generation schema
const generateChittyIDSchema = z.object({
  vertical: z.enum(['user', 'evidence', 'case', 'property', 'contract', 'audit']).optional().default('user'),
  nodeId: z.string().optional().default('1'),
  jurisdiction: z.string().optional().default('USA')
});

const validateChittyIDSchema = z.object({
  chittyId: z.string().min(1)
});

// ChittyID Core System (simplified server-side implementation)
class ChittyIDServer {
  private static readonly PREFIX = 'CHTTY';
  private static readonly VERTICALS = ['user', 'evidence', 'case', 'property', 'contract', 'audit'];
  
  static generateChittyID(vertical: string = 'user', nodeId: string = '1'): string {
    if (!this.VERTICALS.includes(vertical)) {
      throw new Error(`Invalid vertical: ${vertical}`);
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const sequence = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const components = [this.PREFIX, timestamp, vertical.toUpperCase(), nodeId, sequence].join('-');
    const checksum = this.generateChecksum(components);
    
    return `${components}-${checksum}`;
  }

  static validateChittyID(chittyId: string): boolean {
    try {
      const parts = chittyId.split('-');
      if (parts.length !== 6) return false;
      
      const [prefix, timestamp, vertical, nodeId, sequence, checksum] = parts;
      
      if (prefix !== this.PREFIX) return false;
      if (!this.VERTICALS.includes(vertical.toLowerCase())) return false;
      
      const expectedChecksum = this.generateChecksum([prefix, timestamp, vertical, nodeId, sequence].join('-'));
      return checksum === expectedChecksum;
    } catch {
      return false;
    }
  }

  static parseChittyID(chittyId: string) {
    if (!this.validateChittyID(chittyId)) return null;
    
    const [prefix, timestamp, vertical, nodeId, sequence, checksum] = chittyId.split('-');
    
    return {
      prefix,
      timestamp: parseInt(timestamp, 36),
      vertical: vertical.toLowerCase(),
      nodeId,
      sequence,
      checksum
    };
  }

  private static generateChecksum(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substr(0, 4).toUpperCase();
  }
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ChittyID v2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Generate ChittyID
router.post('/generate', async (req, res) => {
  try {
    const { vertical, nodeId, jurisdiction } = generateChittyIDSchema.parse(req.body);
    
    const chittyId = ChittyIDServer.generateChittyID(vertical, nodeId);
    const parsed = ChittyIDServer.parseChittyID(chittyId);

    res.json({
      chittyId,
      displayFormat: chittyId,
      timestamp: parsed?.timestamp,
      vertical: parsed?.vertical,
      valid: ChittyIDServer.validateChittyID(chittyId),
      metadata: {
        nodeId,
        jurisdiction,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('ChittyID generation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Validate ChittyID
router.post('/validate', async (req, res) => {
  try {
    const { chittyId } = validateChittyIDSchema.parse(req.body);
    
    const isValid = ChittyIDServer.validateChittyID(chittyId);
    const parsed = isValid ? ChittyIDServer.parseChittyID(chittyId) : null;

    res.json({
      chittyId,
      valid: isValid,
      details: parsed,
      validatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('ChittyID validation error:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request' 
    });
  }
});

// Bulk generate ChittyIDs
router.post('/generate/bulk', async (req, res) => {
  try {
    const { count = 10, vertical = 'user', nodeId = '1' } = req.body;
    
    if (count > 100) {
      return res.status(400).json({ error: 'Maximum bulk generation limit is 100 IDs' });
    }

    const ids = [];
    for (let i = 0; i < count; i++) {
      const chittyId = ChittyIDServer.generateChittyID(vertical, nodeId);
      const parsed = ChittyIDServer.parseChittyID(chittyId);
      ids.push({
        chittyId,
        timestamp: parsed?.timestamp,
        vertical: parsed?.vertical
      });
    }

    res.json({
      ids,
      count: ids.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Bulk ChittyID generation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Bulk generation failed' 
    });
  }
});

export default router;