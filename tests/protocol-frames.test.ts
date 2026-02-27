// tests/protocol-frames.test.ts
import { describe, it, expect } from 'vitest';
import {
  createRequestFrame,
  createResponseFrame,
  createEventFrame,
  parseFrame,
  isRequestFrame,
  isResponseFrame,
  isEventFrame,
} from '../src/core/protocol/frames.js';

describe('Protocol Frames', () => {
  it('should create and parse request frame', () => {
    const frame = createRequestFrame('req-1', 'getSnapshot', { sessionId: 'test' });
    const parsed = parseFrame(JSON.stringify(frame));
    expect(isRequestFrame(parsed)).toBe(true);
    expect(parsed.id).toBe('req-1');
    expect(parsed.method).toBe('getSnapshot');
  });

  it('should create and parse response frame', () => {
    const frame = createResponseFrame('req-1', true, { sessions: [] });
    const parsed = parseFrame(JSON.stringify(frame));
    expect(isResponseFrame(parsed)).toBe(true);
    expect(parsed.id).toBe('req-1');
    expect(parsed.ok).toBe(true);
  });

  it('should create and parse event frame', () => {
    const frame = createEventFrame('session.started', { sessionId: 'test' }, 1);
    const parsed = parseFrame(JSON.stringify(frame));
    expect(isEventFrame(parsed)).toBe(true);
    expect(parsed.event).toBe('session.started');
    expect(parsed.seq).toBe(1);
  });

  it('should create error response frame', () => {
    const frame = createResponseFrame('req-1', false, undefined, {
      code: 'NOT_FOUND',
      message: 'Session not found',
    });
    const parsed = parseFrame(JSON.stringify(frame));
    expect(parsed.ok).toBe(false);
    expect(parsed.error?.code).toBe('NOT_FOUND');
  });
});
