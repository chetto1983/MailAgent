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
import { Server } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { RealtimeEventsService } from '../services/realtime-events.service';
import { RealtimeHandshakeService } from '../services/realtime-handshake.service';
import {
  AuthenticatedSocket,
  buildTenantScopedRoom,
} from '../types/realtime.types';

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
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly handshakeService: RealtimeHandshakeService,
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
      const authContext = await this.handshakeService.authenticate(client);

      client.userId = authContext.userId;
      client.tenantId = authContext.tenantId;
      client.email = authContext.email;

      await client.join(authContext.tenantRoom);

      this.logger.log(`Client connected: ${client.id} | User: ${client.email} | Tenant: ${client.tenantId}`);

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
  handlePing(@ConnectedSocket() _client: AuthenticatedSocket) {
    return {
      event: 'pong',
      data: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * Permette ai client di unirsi a stanze aggiuntive (es. email threads)
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.tenantId) {
      this.logger.warn(`join_room rejected for unauthenticated client ${client.id}`);
      return { event: 'error', data: { message: 'unauthenticated' } };
    }

    // Assicurati che la room inizi con il tenantId per sicurezza
    const room = buildTenantScopedRoom(client.tenantId, data.room);
    await client.join(room);
    this.logger.debug(`Client ${client.id} joined room: ${room}`);
    return { event: 'joined_room', data: { room } };
  }

  /**
   * Permette ai client di lasciare stanze
   */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.tenantId) {
      this.logger.warn(`leave_room rejected for unauthenticated client ${client.id}`);
      return { event: 'error', data: { message: 'unauthenticated' } };
    }

    const room = buildTenantScopedRoom(client.tenantId, data.room);
    await client.leave(room);
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
