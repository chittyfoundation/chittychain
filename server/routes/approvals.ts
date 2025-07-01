import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { approvalRequests, requestRecipients, requestResponses, auditLogs } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Mock authenticate middleware for now
const authenticate = (req: any, res: any, next: any) => {
  req.user = { id: 1, registrationNumber: 'REG12345678' };
  next();
};

// Generate unique request ID
function generateRequestId(): string {
  return 'REQ' + Date.now().toString().slice(-6);
}

// Create approval request schema
const createApprovalSchema = z.object({
  title: z.string().min(1),
  requestType: z.string().min(1),
  requestDate: z.string(),
  requestTime: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
  recipients: z.array(z.string()).min(1),
  caseId: z.number().optional(),
});

// Response schema
const approvalResponseSchema = z.object({
  response: z.enum(['approved', 'denied']),
  recipient: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// POST /api/v1/approvals/create
router.post('/create', authenticate, async (req, res) => {
  try {
    const validatedData = createApprovalSchema.parse(req.body);
    const requestId = generateRequestId();
    
    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Create approval request
      const [approval] = await tx.insert(approvalRequests).values({
        requestId,
        title: validatedData.title,
        requestType: validatedData.requestType,
        requestDate: validatedData.requestDate,
        requestTime: validatedData.requestTime,
        location: validatedData.location,
        description: validatedData.description,
        caseId: validatedData.caseId,
        createdBy: req.user!.id,
        status: 'pending',
      }).returning();

      // Add recipients
      const recipientRecords = validatedData.recipients.map(recipient => ({
        requestId: approval.id,
        recipient,
        recipientType: recipient.includes('@') ? 'email' : 'phone',
      }));

      await tx.insert(requestRecipients).values(recipientRecords);

      // Create blockchain entry (simplified for now)
      const blockData = {
        type: 'APPROVAL_REQUEST',
        requestId: approval.requestId,
        title: approval.title,
        recipients: validatedData.recipients,
        createdBy: req.user!.registrationNumber,
        timestamp: new Date().toISOString(),
      };

      const blockHash = crypto.createHash('sha256')
        .update(JSON.stringify(blockData))
        .digest('hex');
      
      // Update approval with block hash
      await tx.update(approvalRequests)
        .set({ blockHash })
        .where(eq(approvalRequests.id, approval.id));

      // Log audit trail
      await tx.insert(auditLogs).values({
        userId: req.user!.id.toString(),
        action: 'CREATE_APPROVAL',
        resourceType: 'approval_request',
        resourceId: approval.requestId,
        details: { recipients: validatedData.recipients.length },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        blockNumber: 1,
      });

      return { approval, blockHash };
    });

    res.status(201).json({
      success: true,
      requestId: result.approval.requestId,
      blockHash: result.blockHash,
      recipients: validatedData.recipients.length,
    });
  } catch (error) {
    console.error('Error creating approval:', error);
    res.status(500).json({ error: 'Failed to create approval request' });
  }
});

// GET /api/v1/approvals/:id
router.get('/:id', async (req, res) => {
  try {
    const approval = await db.query.approvalRequests.findFirst({
      where: eq(approvalRequests.requestId, req.params.id),
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const recipients = await db.query.requestRecipients.findMany({
      where: eq(requestRecipients.requestId, approval.id),
    });

    const responses = await db.query.requestResponses.findMany({
      where: eq(requestResponses.requestId, approval.id),
    });

    res.json({
      ...approval,
      recipients: recipients.map(r => r.recipient),
      responses: responses.map(r => ({
        recipient: r.recipient,
        response: r.response,
        respondedAt: r.respondedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching approval:', error);
    res.status(500).json({ error: 'Failed to fetch approval request' });
  }
});

// POST /api/v1/approvals/:id/respond
router.post('/:id/respond', async (req, res) => {
  try {
    const validatedData = approvalResponseSchema.parse(req.body);
    
    const approval = await db.query.approvalRequests.findFirst({
      where: eq(approvalRequests.requestId, req.params.id),
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    // Check if already responded
    const existingResponse = await db.query.requestResponses.findFirst({
      where: and(
        eq(requestResponses.requestId, approval.id),
        eq(requestResponses.recipient, validatedData.recipient)
      ),
    });

    if (existingResponse) {
      return res.status(400).json({ error: 'Already responded to this request' });
    }

    // Create signature
    const signature = crypto.createHash('sha256')
      .update(`${approval.requestId}:${validatedData.recipient}:${validatedData.response}`)
      .digest('hex');

    // Record response
    await db.transaction(async (tx) => {
      await tx.insert(requestResponses).values({
        requestId: approval.id,
        recipient: validatedData.recipient,
        response: validatedData.response,
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        signature,
      });

      // Update approval status
      const allRecipients = await tx.query.requestRecipients.findMany({
        where: eq(requestRecipients.requestId, approval.id),
      });

      const allResponses = await tx.query.requestResponses.findMany({
        where: eq(requestResponses.requestId, approval.id),
      });

      const deniedCount = allResponses.filter(r => r.response === 'denied').length;
      const approvedCount = allResponses.filter(r => r.response === 'approved').length;

      let newStatus = 'pending';
      if (deniedCount > 0) {
        newStatus = 'denied';
      } else if (approvedCount === allRecipients.length) {
        newStatus = 'approved';
      }

      await tx.update(approvalRequests)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(approvalRequests.id, approval.id));

      // Add to blockchain (simplified)
      const responseBlockData = {
        type: 'APPROVAL_RESPONSE',
        requestId: approval.requestId,
        recipient: validatedData.recipient,
        response: validatedData.response,
        signature,
        timestamp: new Date().toISOString(),
      };
      
      const responseBlockHash = crypto.createHash('sha256')
        .update(JSON.stringify(responseBlockData))
        .digest('hex');

      // Log audit
      await tx.insert(auditLogs).values({
        userId: validatedData.recipient,
        action: 'RESPOND_APPROVAL',
        resourceType: 'approval_response',
        resourceId: approval.requestId,
        details: { response: validatedData.response },
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        blockNumber: 1,
      });
    });

    res.json({
      success: true,
      message: 'Response recorded successfully',
      signature,
    });
  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// GET /api/v1/approvals
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = {};
    if (status) {
      whereClause = { status: status as string };
    }

    const approvals = await db.query.approvalRequests.findMany({
      where: whereClause as any,
      limit: Number(limit),
      offset,
      orderBy: (approvals, { desc }) => [desc(approvals.createdAt)],
    });

    res.json({
      approvals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

export { router as approvalsRouter };