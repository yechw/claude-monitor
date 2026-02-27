// tests/broadcaster.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { Broadcaster } from '../src/core/broadcaster.js';

describe('Broadcaster', () => {
  let broadcaster: Broadcaster;
  let mockClient: { send: ReturnType<typeof vi.fn>; bufferedAmount: number };

  beforeEach(() => {
    broadcaster = new Broadcaster();
    mockClient = {
      send: vi.fn(),
      bufferedAmount: 0,
    };
  });

  it('should add and remove clients', () => {
    broadcaster.addClient('client-1', mockClient as unknown as WebSocket);
    expect(broadcaster.getClientCount()).toBe(1);

    broadcaster.removeClient('client-1');
    expect(broadcaster.getClientCount()).toBe(0);
  });

  it('should broadcast event to all clients', () => {
    broadcaster.addClient('client-1', mockClient as unknown as WebSocket);
    broadcaster.addClient('client-2', mockClient as unknown as WebSocket);

    broadcaster.broadcast('session.started', { sessionId: 'test' });

    expect(mockClient.send).toHaveBeenCalledTimes(2);
    const sentData = JSON.parse(mockClient.send.mock.calls[0][0]);
    expect(sentData.type).toBe('event');
    expect(sentData.event).toBe('session.started');
    expect(sentData.seq).toBe(1);
  });

  it('should increment sequence number', () => {
    broadcaster.addClient('client-1', mockClient as unknown as WebSocket);

    broadcaster.broadcast('session.started', { sessionId: 'test1' });
    broadcaster.broadcast('session.ended', { sessionId: 'test2' });

    const call1 = JSON.parse(mockClient.send.mock.calls[0][0]);
    const call2 = JSON.parse(mockClient.send.mock.calls[1][0]);
    expect(call2.seq).toBeGreaterThan(call1.seq);
  });

  it('should include state version when provided', () => {
    broadcaster.addClient('client-1', mockClient as unknown as WebSocket);

    broadcaster.broadcast('session.updated', { sessionId: 'test' }, { seq: 5 });

    const sentData = JSON.parse(mockClient.send.mock.calls[0][0]);
    expect(sentData.stateVersion).toEqual({ seq: 5 });
  });

  it('should skip slow clients', () => {
    mockClient.bufferedAmount = 2 * 1024 * 1024; // 2MB - Simulate slow client (> 1MB threshold)
    broadcaster.addClient('client-1', mockClient as unknown as WebSocket);

    broadcaster.broadcast('session.started', { sessionId: 'test' });

    expect(mockClient.send).not.toHaveBeenCalled();
  });
});
