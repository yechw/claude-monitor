/**
 * Event Broadcaster for WebSocket Clients
 *
 * Broadcasts events to all connected WebSocket clients.
 * Features:
 * - Sequence numbers for ordering
 * - Slow client detection and skipping
 * - State version tracking for change detection
 *
 * Borrowed from OpenClaw server-broadcast pattern.
 */

import type { WebSocket } from 'ws';
import type { StateVersion } from './protocol/types.js';

/** Maximum buffered bytes before a client is considered slow (1MB) */
const MAX_BUFFERED_BYTES = 1024 * 1024;

/** Broadcast options */
export interface BroadcastOptions {
  /** State version for change detection */
  stateVersion?: StateVersion;
}

/**
 * Broadcaster manages WebSocket client connections and broadcasts events.
 */
export class Broadcaster {
  private clients: Map<string, WebSocket> = new Map();
  private seq = 0;

  /**
   * Add a client to the broadcast list
   */
  addClient(id: string, socket: WebSocket): void {
    this.clients.set(id, socket);
  }

  /**
   * Remove a client from the broadcast list
   */
  removeClient(id: string): void {
    this.clients.delete(id);
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast an event to all connected clients
   *
   * Slow clients (high buffered amount) are skipped to prevent
   * memory bloat and ensure real-time delivery to healthy clients.
   */
  broadcast(event: string, payload: unknown, stateVersion?: StateVersion): void {
    if (this.clients.size === 0) {
      return;
    }

    const currentSeq = ++this.seq;
    const frame = JSON.stringify({
      type: 'event',
      event,
      payload,
      seq: currentSeq,
      stateVersion,
    });

    for (const [id, socket] of this.clients) {
      // Skip slow clients to prevent backlog
      const bufferedAmount = (socket as unknown as { bufferedAmount: number }).bufferedAmount;
      const isSlow = bufferedAmount > MAX_BUFFERED_BYTES;
      if (isSlow) {
        continue;
      }

      try {
        socket.send(frame);
      } catch {
        // Ignore send errors - client may have disconnected
        // The server's close handler will clean up the client
      }
    }
  }
}
