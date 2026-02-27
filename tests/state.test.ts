// tests/state.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../src/core/state.js';
import type { SessionState, MessageRecord, ErrorRecord } from '../src/core/protocol/types.js';

describe('StateManager', () => {
  let state: StateManager;

  beforeEach(() => {
    state = new StateManager();
  });

  const createTestSession = (id: string): SessionState => ({
    ref: {
      sessionId: id,
      projectPath: `/path/to/${id}`,
      projectName: id,
    },
    lifecycle: 'running',
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
  });

  it('should add and retrieve sessions', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    const sessions = state.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].ref.sessionId).toBe('session-1');
  });

  it('should update session state', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    state.updateSession('session-1', { lifecycle: 'idle' });

    const updated = state.getSession('session-1');
    expect(updated?.lifecycle).toBe('idle');
  });

  it('should remove session', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    state.removeSession('session-1');

    expect(state.getSessions()).toHaveLength(0);
  });

  it('should track messages per session', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    const msg: MessageRecord = {
      id: 'msg-1',
      timestamp: Date.now(),
      role: 'user',
      content: 'Hello',
      truncated: false,
    };
    state.addMessage('session-1', msg);

    const messages = state.getMessages('session-1');
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello');
  });

  it('should track errors per session', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    const error: ErrorRecord = {
      id: 'err-1',
      timestamp: Date.now(),
      type: 'TestError',
      message: 'Something went wrong',
    };
    state.addError('session-1', error);

    const errors = state.getErrors('session-1');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Something went wrong');
  });

  it('should generate snapshot', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    const snapshot = state.getSnapshot();

    expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.stats.totalSessions).toBe(1);
    expect(snapshot.stats.activeSessions).toBe(1);
    expect(snapshot.version.seq).toBeGreaterThan(0);
  });

  it('should increment version on changes', () => {
    const session = createTestSession('session-1');
    state.addSession(session);
    const v1 = state.getVersion();

    state.updateSession('session-1', { lifecycle: 'idle' });
    const v2 = state.getVersion();

    expect(v2.seq).toBeGreaterThan(v1.seq);
  });
});
