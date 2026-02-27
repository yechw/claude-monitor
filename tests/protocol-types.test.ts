// tests/protocol-types.test.ts
import { describe, it, expect } from 'vitest';
import {
  SessionRefSchema,
  SessionStateSchema,
  MessageRecordSchema,
  ErrorRecordSchema,
  MonitorSnapshotSchema,
  LifecycleSchema,
  TaskPhaseSchema,
  TaskProgressSchema,
  TaskSchema,
  ProcessInfoSchema,
  ModelInfoSchema,
  ContextUsageSchema,
  StateVersionSchema,
  MonitorStatsSchema,
} from '../src/core/protocol/types.js';
import { Value } from '@sinclair/typebox/value';

describe('Protocol Types', () => {
  describe('SessionRefSchema', () => {
    it('should validate a valid SessionRef', () => {
      const valid = {
        sessionId: 'test-uuid',
        projectPath: '/path/to/project',
        projectName: 'test-project',
      };
      expect(Value.Check(SessionRefSchema, valid)).toBe(true);
    });

    it('should reject SessionRef without required fields', () => {
      const invalid = {
        sessionId: 'test-uuid',
        // missing projectPath and projectName
      };
      expect(Value.Check(SessionRefSchema, invalid)).toBe(false);
    });
  });

  describe('LifecycleSchema', () => {
    it('should validate valid lifecycle values', () => {
      const validValues = ['starting', 'running', 'idle', 'error', 'ended'];
      validValues.forEach((value) => {
        expect(Value.Check(LifecycleSchema, value)).toBe(true);
      });
    });

    it('should reject invalid lifecycle values', () => {
      expect(Value.Check(LifecycleSchema, 'invalid')).toBe(false);
    });
  });

  describe('TaskPhaseSchema', () => {
    it('should validate valid task phase values', () => {
      const validValues = ['thinking', 'acting', 'waiting', 'complete'];
      validValues.forEach((value) => {
        expect(Value.Check(TaskPhaseSchema, value)).toBe(true);
      });
    });

    it('should reject invalid task phase values', () => {
      expect(Value.Check(TaskPhaseSchema, 'invalid')).toBe(false);
    });
  });

  describe('TaskProgressSchema', () => {
    it('should validate TaskProgress with required fields', () => {
      const valid = {
        current: 1,
        total: 10,
      };
      expect(Value.Check(TaskProgressSchema, valid)).toBe(true);
    });

    it('should validate TaskProgress with optional step', () => {
      const valid = {
        current: 1,
        total: 10,
        step: 'Processing file',
      };
      expect(Value.Check(TaskProgressSchema, valid)).toBe(true);
    });
  });

  describe('TaskSchema', () => {
    it('should validate Task with required fields', () => {
      const valid = {
        description: 'Implement feature X',
        phase: 'thinking' as const,
      };
      expect(Value.Check(TaskSchema, valid)).toBe(true);
    });

    it('should validate Task with progress', () => {
      const valid = {
        description: 'Implement feature X',
        phase: 'acting' as const,
        progress: {
          current: 5,
          total: 10,
          step: 'Writing code',
        },
      };
      expect(Value.Check(TaskSchema, valid)).toBe(true);
    });
  });

  describe('ProcessInfoSchema', () => {
    it('should validate ProcessInfo with required pid', () => {
      const valid = {
        pid: 12345,
      };
      expect(Value.Check(ProcessInfoSchema, valid)).toBe(true);
    });

    it('should validate ProcessInfo with tmux info', () => {
      const valid = {
        pid: 12345,
        tmuxSession: 'claude-1',
        tmuxWindow: '0',
      };
      expect(Value.Check(ProcessInfoSchema, valid)).toBe(true);
    });
  });

  describe('ModelInfoSchema', () => {
    it('should validate ModelInfo', () => {
      const valid = {
        name: 'claude-3-opus',
        displayName: 'Claude 3 Opus',
      };
      expect(Value.Check(ModelInfoSchema, valid)).toBe(true);
    });
  });

  describe('ContextUsageSchema', () => {
    it('should validate ContextUsage', () => {
      const valid = {
        used: 50000,
        total: 200000,
        percentage: 25,
      };
      expect(Value.Check(ContextUsageSchema, valid)).toBe(true);
    });
  });

  describe('SessionStateSchema', () => {
    it('should validate SessionState with required fields', () => {
      const valid = {
        ref: {
          sessionId: 'test-uuid',
          projectPath: '/path/to/project',
          projectName: 'test-project',
        },
        lifecycle: 'running' as const,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      expect(Value.Check(SessionStateSchema, valid)).toBe(true);
    });

    it('should validate SessionState with optional fields', () => {
      const valid = {
        ref: {
          sessionId: 'test-uuid',
          projectPath: '/path/to/project',
          projectName: 'test-project',
        },
        lifecycle: 'running' as const,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        process: {
          pid: 12345,
        },
        model: {
          name: 'claude-3-opus',
          displayName: 'Claude 3 Opus',
        },
        task: {
          description: 'Working on task',
          phase: 'acting' as const,
        },
        context: {
          used: 50000,
          total: 200000,
          percentage: 25,
        },
      };
      expect(Value.Check(SessionStateSchema, valid)).toBe(true);
    });
  });

  describe('MessageRecordSchema', () => {
    it('should validate MessageRecord', () => {
      const valid = {
        id: 'msg-id',
        timestamp: Date.now(),
        role: 'user' as const,
        content: 'Hello',
        truncated: false,
      };
      expect(Value.Check(MessageRecordSchema, valid)).toBe(true);
    });

    it('should validate assistant role', () => {
      const valid = {
        id: 'msg-id',
        timestamp: Date.now(),
        role: 'assistant' as const,
        content: 'Hi there!',
        truncated: false,
      };
      expect(Value.Check(MessageRecordSchema, valid)).toBe(true);
    });
  });

  describe('ErrorRecordSchema', () => {
    it('should validate ErrorRecord with required fields', () => {
      const valid = {
        id: 'err-id',
        timestamp: Date.now(),
        type: 'TestError',
        message: 'Something went wrong',
      };
      expect(Value.Check(ErrorRecordSchema, valid)).toBe(true);
    });

    it('should validate ErrorRecord with stack trace', () => {
      const valid = {
        id: 'err-id',
        timestamp: Date.now(),
        type: 'TestError',
        message: 'Something went wrong',
        stack: 'Error: Something went wrong\n    at test.js:1:1',
      };
      expect(Value.Check(ErrorRecordSchema, valid)).toBe(true);
    });
  });

  describe('StateVersionSchema', () => {
    it('should validate StateVersion', () => {
      const valid = {
        seq: 42,
      };
      expect(Value.Check(StateVersionSchema, valid)).toBe(true);
    });

    it('should reject negative seq', () => {
      const invalid = {
        seq: -1,
      };
      expect(Value.Check(StateVersionSchema, invalid)).toBe(false);
    });
  });

  describe('MonitorStatsSchema', () => {
    it('should validate MonitorStats', () => {
      const valid = {
        totalSessions: 5,
        activeSessions: 3,
        errorCount: 1,
      };
      expect(Value.Check(MonitorStatsSchema, valid)).toBe(true);
    });
  });

  describe('MonitorSnapshotSchema', () => {
    it('should validate MonitorSnapshot with required fields', () => {
      const valid = {
        version: {
          seq: 1,
        },
        sessions: [],
        messages: [],
        errors: [],
        stats: {
          totalSessions: 0,
          activeSessions: 0,
          errorCount: 0,
        },
      };
      expect(Value.Check(MonitorSnapshotSchema, valid)).toBe(true);
    });

    it('should validate MonitorSnapshot with active session', () => {
      const valid = {
        version: {
          seq: 2,
        },
        sessions: [
          {
            ref: {
              sessionId: 'test-uuid',
              projectPath: '/path/to/project',
              projectName: 'test-project',
            },
            lifecycle: 'running',
            startedAt: Date.now(),
            lastActivityAt: Date.now(),
          },
        ],
        activeSessionId: 'test-uuid',
        messages: [
          {
            id: 'msg-1',
            timestamp: Date.now(),
            role: 'user',
            content: 'Hello',
            truncated: false,
          },
        ],
        errors: [],
        stats: {
          totalSessions: 1,
          activeSessions: 1,
          errorCount: 0,
        },
      };
      expect(Value.Check(MonitorSnapshotSchema, valid)).toBe(true);
    });
  });
});
