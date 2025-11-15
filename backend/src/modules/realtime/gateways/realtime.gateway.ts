import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeEventsService } from '../services/realtime-events.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  email?: string;
}

/**
 * WebSocket Gateway per comunicazione realtime multi-tenant
 *
 * Caratteristiche:
 * - Autenticazione JWT su handshake
 * - Isolamento tenant tramite rooms (tenant:${tenantId})
 * - CORS configurabile
 * - Heartbeat automatico
 * - Supporto eventi bidirezionali
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001'],
    credentials: true,
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private realtimeEvents: RealtimeEventsService,
  ) {}

  onModuleInit() {
    // Injetta il gateway nel service per evitare circular dependency
    this.realtimeEvents.setGateway(this);
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Heartbeat ogni 30 secondi per mantenere connessioni attive
    this.heartbeatInterval = setInterval(() => {
      server.emit('heartbeat', { timestamp: new Date().toISOString() });
    }, 30000);
  }

  /**
   * Gestisce nuove connessioni WebSocket
   * Valida JWT e aggiunge il socket alla room del tenant
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Estrai token dal handshake (auth header o query param)
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Connection rejected - No token provided`);
        client.disconnect();
        return;
      }

      // Verifica JWT
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (!decoded || !decoded.userId || !decoded.tenantId) {
        this.logger.warn(`Connection rejected - Invalid token payload`);
        client.disconnect();
        return;
      }

      // Verifica che l'utente esista nel database
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, tenantId: true },
      });

      if (!user || user.tenantId !== decoded.tenantId) {
        this.logger.warn(
          `Connection rejected - User not found or tenant mismatch`,
        );
        client.disconnect();
        return;
      }

      // Aggiungi metadata al socket
      client.userId = decoded.userId;
      client.tenantId = decoded.tenantId;
      client.email = user.email;

      // Aggiungi il socket alla room del tenant per isolamento
      const tenantRoom = `tenant:${decoded.tenantId}`;
      client.join(tenantRoom);

      this.logger.log(
        `Client connected: ${client.id} | User: ${user.email} | Tenant: ${decoded.tenantId}`,
      );

      // Notifica il client della connessione riuscita
      client.emit('connected', {
        userId: client.userId,
        tenantId: client.tenantId,
        email: client.email,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Connection error: ${message}`, stack);
      client.disconnect();
    }
  }

  /**
   * Gestisce disconnessioni
   */
  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Client disconnected: ${client.id} | User: ${client.email || 'unknown'}`,
    );
  }

  /**
   * Permette ai client di fare ping per verificare la connessione
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return {
      event: 'pong',
      data: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * Permette ai client di unirsi a stanze aggiuntive (es. email threads)
   */
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Assicurati che la room inizi con il tenantId per sicurezza
    const room = `tenant:${client.tenantId}:${data.room}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room: ${room}`);
    return { event: 'joined_room', data: { room } };
  }

  /**
   * Permette ai client di lasciare stanze
   */
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const room = `tenant:${client.tenantId}:${data.room}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room: ${room}`);
    return { event: 'left_room', data: { room } };
  }

  /**
   * Cleanup quando il gateway viene distrutto
   */
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
