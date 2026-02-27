/**
 * WebSocket Monitor Server
 *
 * Central server that manages WebSocket connections and handles
 * communication between the monitor and clients.
 *
 * Features:
 * - WebSocket server for client connections
 * - Request/Response handling for RPC-style calls
 * - Event broadcasting for state changes
 *
 * Borrowed from OpenClaw server pattern.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { StateManager, type StateEvent } from './state.js';
import { Broadcaster } from './broadcaster.js';
import {
  RequestFrame,
  ResponseFrame,
  createResponseFrame,
  isRequestFrame,
  parseFrame,
} from './protocol/frames.js';
import type { SessionState, MonitorSnapshot } from './protocol/types.js';

/** Unique ID counter for client connections */
let clientIdCounter = 0;

/** Server configuration options */
export interface MonitorServerOptions {
  /** State manager instance */
  state: StateManager;
  /** Port to listen on */
  port: number;
  /** Host to bind to (default: localhost) */
  host?: string;
}

/**
 * MonitorServer handles WebSocket connections and coordinates
 * state management with event broadcasting.
 */
export class MonitorServer {
  private state: StateManager;
  private broadcaster: Broadcaster;
  private port: number;
  private host: string;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private unsubscribe?: () => void;

  constructor(options: MonitorServerOptions) {
    this.state = options.state;
    this.port = options.port;
    this.host = options.host ?? 'localhost';
    this.broadcaster = new Broadcaster();

    // Subscribe to state changes
    this.unsubscribe = this.state.subscribe(this.handleStateEvent.bind(this));
  }

  /**
   * Handle state events and broadcast them to clients
   */
  private handleStateEvent(event: StateEvent): void {
    this.broadcaster.broadcast(event.type, event.payload, this.state.getVersion());
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({
        port: this.port,
        host: this.host,
      });

      this.wss.on('error', (err) => {
        reject(err);
      });

      this.wss.on('listening', () => {
        resolve();
      });

      this.wss.on('connection', (socket) => {
        this.handleConnection(socket);
      });
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    // Unsubscribe from state changes
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }

      // Close all client connections
      for (const [id, socket] of this.clients) {
        socket.close();
        this.broadcaster.removeClient(id);
      }
      this.clients.clear();

      this.wss.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }

  /**
   * Handle a new WebSocket connection
   */
  private handleConnection(socket: WebSocket): void {
    const clientId = `client-${++clientIdCounter}`;
    this.clients.set(clientId, socket);
    this.broadcaster.addClient(clientId, socket);

    socket.on('message', (data) => {
      try {
        const frame = parseFrame(data.toString());
        if (isRequestFrame(frame)) {
          this.handleRequest(socket, frame);
        }
      } catch {
        // Ignore invalid frames
      }
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
      this.broadcaster.removeClient(clientId);
    });

    socket.on('error', () => {
      this.clients.delete(clientId);
      this.broadcaster.removeClient(clientId);
    });
  }

  /**
   * Handle a request frame from a client
   */
  private handleRequest(socket: WebSocket, frame: RequestFrame): void {
    try {
      switch (frame.method) {
        case 'getSnapshot':
          this.handleGetSnapshot(socket, frame);
          break;
        default:
          this.sendError(socket, frame.id, 'method_not_found', `Unknown method: ${frame.method}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.sendError(socket, frame.id, 'internal_error', message);
    }
  }

  /**
   * Handle getSnapshot request
   */
  private handleGetSnapshot(socket: WebSocket, frame: RequestFrame): void {
    const snapshot = this.state.getSnapshot();
    this.sendResponse(socket, frame.id, snapshot);
  }

  /**
   * Send a success response
   */
  private sendResponse(socket: WebSocket, id: string, payload: unknown): void {
    const response = createResponseFrame(id, true, payload);
    socket.send(JSON.stringify(response));
  }

  /**
   * Send an error response
   */
  private sendError(
    socket: WebSocket,
    id: string,
    code: string,
    message: string,
  ): void {
    const response = createResponseFrame(id, false, undefined, { code, message });
    socket.send(JSON.stringify(response));
  }

  /**
   * Broadcast session.started event
   */
  broadcastSessionStarted(session: SessionState): void {
    this.broadcaster.broadcast('session.started', session, this.state.getVersion());
  }

  /**
   * Broadcast session.ended event
   */
  broadcastSessionEnded(sessionId: string): void {
    this.broadcaster.broadcast('session.ended', { sessionId }, this.state.getVersion());
  }

  /**
   * Broadcast session.updated event
   */
  broadcastSessionUpdated(session: SessionState): void {
    this.broadcaster.broadcast('session.updated', session, this.state.getVersion());
  }
}
