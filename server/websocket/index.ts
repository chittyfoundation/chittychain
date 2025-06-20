import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { db } from '../db';
import { users, audit_logs } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  registrationNumber?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private caseRooms: Map<string, Set<string>> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: env.CORS_ORIGINS.split(','),
        credentials: true
      },
      path: '/ws'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        
        const user = await db.select().from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (!user.length) {
          return next(new Error('User not found'));
        }

        socket.userId = user[0].id;
        socket.userEmail = user[0].email;
        socket.registrationNumber = user[0].registration_number || undefined;

        await db.insert(audit_logs).values({
          user_id: user[0].id,
          action: 'websocket_connect',
          resource_type: 'websocket',
          resource_id: socket.id,
          ip_address: socket.handshake.address,
          user_agent: socket.handshake.headers['user-agent'] || 'Unknown',
          metadata: { socketId: socket.id }
        });

        next();
      } catch (error) {
        next(new Error('Invalid authentication'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`WebSocket connected: ${socket.id} for user ${socket.userId}`);

      // Track user sockets
      if (socket.userId) {
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set());
        }
        this.userSockets.get(socket.userId)!.add(socket.id);
      }

      // Case updates subscription
      socket.on('subscribe:case', async (data: { caseId: string }) => {
        const { caseId } = data;
        
        // TODO: Verify user has access to this case
        const roomName = `case:${caseId}`;
        socket.join(roomName);
        
        if (!this.caseRooms.has(caseId)) {
          this.caseRooms.set(caseId, new Set());
        }
        this.caseRooms.get(caseId)!.add(socket.userId!);

        socket.emit('subscribed:case', { caseId, status: 'success' });
        
        await this.logAudit(socket.userId!, 'websocket_subscribe', 'case', caseId, {
          action: 'subscribe',
          socketId: socket.id
        });
      });

      socket.on('unsubscribe:case', async (data: { caseId: string }) => {
        const { caseId } = data;
        const roomName = `case:${caseId}`;
        socket.leave(roomName);
        
        if (this.caseRooms.has(caseId)) {
          this.caseRooms.get(caseId)!.delete(socket.userId!);
        }

        socket.emit('unsubscribed:case', { caseId, status: 'success' });
      });

      // Evidence live updates subscription
      socket.on('subscribe:evidence', async () => {
        socket.join('evidence:live');
        socket.emit('subscribed:evidence', { status: 'success' });
        
        await this.logAudit(socket.userId!, 'websocket_subscribe', 'evidence', 'live', {
          action: 'subscribe',
          socketId: socket.id
        });
      });

      // Blockchain updates subscription
      socket.on('subscribe:chain', async () => {
        socket.join('chain:blocks');
        socket.emit('subscribed:chain', { status: 'success' });
        
        await this.logAudit(socket.userId!, 'websocket_subscribe', 'blockchain', 'blocks', {
          action: 'subscribe',
          socketId: socket.id
        });
      });

      socket.on('disconnect', async () => {
        console.log(`WebSocket disconnected: ${socket.id}`);
        
        if (socket.userId && this.userSockets.has(socket.userId)) {
          this.userSockets.get(socket.userId)!.delete(socket.id);
          if (this.userSockets.get(socket.userId)!.size === 0) {
            this.userSockets.delete(socket.userId);
          }
        }

        // Clean up case rooms
        for (const [caseId, users] of this.caseRooms.entries()) {
          if (users.has(socket.userId!)) {
            users.delete(socket.userId!);
            if (users.size === 0) {
              this.caseRooms.delete(caseId);
            }
          }
        }

        await this.logAudit(socket.userId!, 'websocket_disconnect', 'websocket', socket.id, {
          socketId: socket.id
        });
      });
    });
  }

  // Public methods for emitting events
  public emitCaseUpdate(caseId: string, event: string, data: any) {
    this.io.to(`case:${caseId}`).emit(`case:${event}`, {
      caseId,
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public emitEvidenceUpdate(event: string, data: any) {
    this.io.to('evidence:live').emit(`evidence:${event}`, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public emitBlockchainUpdate(event: string, data: any) {
    this.io.to('chain:blocks').emit(`chain:${event}`, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public emitToUser(userId: string, event: string, data: any) {
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      userSocketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  private async logAudit(userId: string, action: string, resourceType: string, resourceId: string, metadata: any) {
    try {
      await db.insert(audit_logs).values({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  public getCaseSubscribers(caseId: string): string[] {
    return Array.from(this.caseRooms.get(caseId) || []);
  }
}