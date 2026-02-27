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

  it('should trim messages to MAX_MESSAGES_PER_SESSION (100)', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    // Add 150 messages (more than MAX_MESSAGES_PER_SESSION = 100)
    for (let i = 0; i < 150; i++) {
      const msg: MessageRecord = {
        id: `msg-${i}`,
        timestamp: Date.now() + i,
        role: 'user',
        content: `Message ${i}`,
        truncated: false,
      };
      state.addMessage('session-1', msg);
    }

    const messages = state.getMessages('session-1');
    expect(messages).toHaveLength(100);

    // Verify only the last 100 messages are kept (50-149)
    expect(messages[0].id).toBe('msg-50');
    expect(messages[0].content).toBe('Message 50');
    expect(messages[99].id).toBe('msg-149');
    expect(messages[99].content).toBe('Message 149');
  });

  it('should trim errors to MAX_ERRORS_PER_SESSION (50)', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    // Add 80 errors (more than MAX_ERRORS_PER_SESSION = 50)
    for (let i = 0; i < 80; i++) {
      const error: ErrorRecord = {
        id: `err-${i}`,
        timestamp: Date.now() + i,
        type: 'TestError',
        message: `Error ${i}`,
      };
      state.addError('session-1', error);
    }

    const errors = state.getErrors('session-1');
    expect(errors).toHaveLength(50);

    // Verify only the last 50 errors are kept (30-79)
    expect(errors[0].id).toBe('err-30');
    expect(errors[0].message).toBe('Error 30');
    expect(errors[49].id).toBe('err-79');
    expect(errors[49].message).toBe('Error 79');
  });

  it('should set and get active session', () => {
    const session = createTestSession('session-1');
    state.addSession(session);

    // Initially no active session
    expect(state.getActiveSessionId()).toBeUndefined();

    // Set active session
    state.setActiveSession('session-1');
    expect(state.getActiveSessionId()).toBe('session-1');

    // Clear active session
    state.setActiveSession(undefined);
    expect(state.getActiveSessionId()).toBeUndefined();
  });

  it('should include activeSessionId in snapshot', () => {
    const session1 = createTestSession('session-1');
    const session2 = createTestSession('session-2');
    state.addSession(session1);
    state.addSession(session2);

    // Set active session
    state.setActiveSession('session-2');

    const snapshot = state.getSnapshot();
    expect(snapshot.activeSessionId).toBe('session-2');

    // Snapshot should include messages from active session
    const msg: MessageRecord = {
      id: 'msg-1',
      timestamp: Date.now(),
      role: 'user',
      content: 'Hello',
      truncated: false,
    };
    state.addMessage('session-2', msg);

    const snapshot2 = state.getSnapshot();
    expect(snapshot2.messages).toHaveLength(1);
    expect(snapshot2.messages[0].content).toBe('Hello');
  });

  it('should clear activeSessionId when active session is removed', () => {
    const session1 = createTestSession('session-1');
    const session2 = createTestSession('session-2');
    state.addSession(session1);
    state.addSession(session2);

    // Set active session
    state.setActiveSession('session-1');
    expect(state.getActiveSessionId()).toBe('session-1');

    // Remove the active session
    state.removeSession('session-1');

    // activeSessionId should be cleared
    expect(state.getActiveSessionId()).toBeUndefined();

    // Session 2 should still exist
    expect(state.getSessions()).toHaveLength(1);
    expect(state.getSession('session-2')).toBeDefined();
  });

  it('should return empty array for getMessages with unknown session', () => {
    const messages = state.getMessages('unknown-session');
    expect(messages).toEqual([]);
    expect(messages).toHaveLength(0);
  });

  it('should return empty array for getErrors with unknown session', () => {
    const errors = state.getErrors('unknown-session');
    expect(errors).toEqual([]);
    expect(errors).toHaveLength(0);
  });
});
