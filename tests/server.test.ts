import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { MonitorServer } from '../src/core/server.js';
import { StateManager } from '../src/core/state.js';

describe('MonitorServer', () => {
  let server: MonitorServer;
  let state: StateManager;
  const port = 19876;

  beforeAll(async () => {
    state = new StateManager();
    server = new MonitorServer({ state, port });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should accept WebSocket connections', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve, reject) => {
      client.on('open', () => {
        client.close();
        resolve();
      });
      client.on('error', reject);
    });
  });

  it('should respond to getSnapshot request', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);

    const response = await new Promise<any>((resolve, reject) => {
      client.on('open', () => {
        client.send(JSON.stringify({
          type: 'req',
          id: 'req-1',
          method: 'getSnapshot',
        }));
      });
      client.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'res' && msg.id === 'req-1') {
          client.close();
          resolve(msg);
        }
      });
      client.on('error', reject);
    });

    expect(response.ok).toBe(true);
    expect(response.payload).toHaveProperty('sessions');
    expect(response.payload).toHaveProperty('stats');
  });

  it('should broadcast events when state changes', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);

    const event = await new Promise<any>((resolve, reject) => {
      client.on('open', () => {
        // Trigger state change
        state.addSession({
          ref: {
            sessionId: 'test-broadcast',
            projectPath: '/test',
            projectName: 'test',
          },
          lifecycle: 'running',
          startedAt: Date.now(),
          lastActivityAt: Date.now(),
        });
      });
      client.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'event' && msg.event === 'session.started') {
          client.close();
          resolve(msg);
        }
      });
      client.on('error', reject);
    });

    expect(event.event).toBe('session.started');
    expect(event.payload.ref.sessionId).toBe('test-broadcast');
  });
});
