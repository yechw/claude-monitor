/**
 * Protocol Type Definitions using TypeBox
 *
 * These schemas define the data structures used for:
 * - Session management
 * - State tracking
 * - WebSocket communication
 */

import { Type, Static } from '@sinclair/typebox';

// ============================================================
// Primitives
// ============================================================

/** Non-empty string constraint */
const NonEmptyString = Type.String({ minLength: 1 });

// ============================================================
// Session Reference
// ============================================================

/** Identifies a Claude Code CLI session */
export const SessionRefSchema = Type.Object(
  {
    /** Unique session identifier (UUID) */
    sessionId: NonEmptyString,
    /** Absolute path to the project directory */
    projectPath: NonEmptyString,
    /** Human-readable project name */
    projectName: NonEmptyString,
  },
  { additionalProperties: false },
);

export type SessionRef = Static<typeof SessionRefSchema>;

// ============================================================
// Lifecycle State
// ============================================================

/** Session lifecycle states */
export const LifecycleSchema = Type.Union([
  Type.Literal('starting'),
  Type.Literal('running'),
  Type.Literal('idle'),
  Type.Literal('error'),
  Type.Literal('ended'),
]);

export type Lifecycle = Static<typeof LifecycleSchema>;

// ============================================================
// Task Tracking
// ============================================================

/** Task execution phases */
export const TaskPhaseSchema = Type.Union([
  Type.Literal('thinking'),
  Type.Literal('acting'),
  Type.Literal('waiting'),
  Type.Literal('complete'),
]);

export type TaskPhase = Static<typeof TaskPhaseSchema>;

/** Task progress indicator */
export const TaskProgressSchema = Type.Object(
  {
    /** Current step number */
    current: Type.Integer({ minimum: 0 }),
    /** Total number of steps */
    total: Type.Integer({ minimum: 1 }),
    /** Optional description of current step */
    step: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export type TaskProgress = Static<typeof TaskProgressSchema>;

/** Current task being executed */
export const TaskSchema = Type.Object(
  {
    /** Task description */
    description: NonEmptyString,
    /** Current phase of execution */
    phase: TaskPhaseSchema,
    /** Optional progress indicator */
    progress: Type.Optional(TaskProgressSchema),
  },
  { additionalProperties: false },
);

export type Task = Static<typeof TaskSchema>;

// ============================================================
// Process Information
// ============================================================

/** Information about the Claude Code CLI process */
export const ProcessInfoSchema = Type.Object(
  {
    /** Process ID */
    pid: Type.Integer({ minimum: 1 }),
    /** Tmux session name (if running in tmux) */
    tmuxSession: Type.Optional(NonEmptyString),
    /** Tmux window identifier (if running in tmux) */
    tmuxWindow: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export type ProcessInfo = Static<typeof ProcessInfoSchema>;

// ============================================================
// Model Information
// ============================================================

/** Information about the Claude model being used */
export const ModelInfoSchema = Type.Object(
  {
    /** Model identifier (e.g., 'claude-3-opus') */
    name: NonEmptyString,
    /** Human-readable model name */
    displayName: NonEmptyString,
  },
  { additionalProperties: false },
);

export type ModelInfo = Static<typeof ModelInfoSchema>;

// ============================================================
// Context Usage
// ============================================================

/** Context window usage statistics */
export const ContextUsageSchema = Type.Object(
  {
    /** Tokens used */
    used: Type.Integer({ minimum: 0 }),
    /** Total context window size */
    total: Type.Integer({ minimum: 1 }),
    /** Usage percentage (0-100) */
    percentage: Type.Integer({ minimum: 0, maximum: 100 }),
  },
  { additionalProperties: false },
);

export type ContextUsage = Static<typeof ContextUsageSchema>;

// ============================================================
// Session State
// ============================================================

/** Complete state of a Claude Code CLI session */
export const SessionStateSchema = Type.Object(
  {
    /** Session reference */
    ref: SessionRefSchema,
    /** Current lifecycle state */
    lifecycle: LifecycleSchema,
    /** Unix timestamp when session started */
    startedAt: Type.Integer({ minimum: 0 }),
    /** Unix timestamp of last activity */
    lastActivityAt: Type.Integer({ minimum: 0 }),
    /** Process information (if available) */
    process: Type.Optional(ProcessInfoSchema),
    /** Model information (if available) */
    model: Type.Optional(ModelInfoSchema),
    /** Current task (if any) */
    task: Type.Optional(TaskSchema),
    /** Context usage (if available) */
    context: Type.Optional(ContextUsageSchema),
  },
  { additionalProperties: false },
);

export type SessionState = Static<typeof SessionStateSchema>;

// ============================================================
// Message Records
// ============================================================

/** Message role types */
const MessageRoleSchema = Type.Union([
  Type.Literal('user'),
  Type.Literal('assistant'),
  Type.Literal('system'),
]);

/** A message in the conversation */
export const MessageRecordSchema = Type.Object(
  {
    /** Unique message identifier */
    id: NonEmptyString,
    /** Unix timestamp of the message */
    timestamp: Type.Integer({ minimum: 0 }),
    /** Message sender role */
    role: MessageRoleSchema,
    /** Message content */
    content: Type.String(),
    /** Whether content was truncated */
    truncated: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type MessageRecord = Static<typeof MessageRecordSchema>;

// ============================================================
// Error Records
// ============================================================

/** An error that occurred in a session */
export const ErrorRecordSchema = Type.Object(
  {
    /** Unique error identifier */
    id: NonEmptyString,
    /** Unix timestamp of the error */
    timestamp: Type.Integer({ minimum: 0 }),
    /** Error type/name */
    type: NonEmptyString,
    /** Error message */
    message: Type.String(),
    /** Optional stack trace */
    stack: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export type ErrorRecord = Static<typeof ErrorRecordSchema>;

// ============================================================
// State Versioning
// ============================================================

/** State version for change detection */
export const StateVersionSchema = Type.Object(
  {
    /** Monotonically increasing sequence number */
    seq: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type StateVersion = Static<typeof StateVersionSchema>;

// ============================================================
// Monitor Statistics
// ============================================================

/** Aggregate statistics for the monitor */
export const MonitorStatsSchema = Type.Object(
  {
    /** Total number of sessions tracked */
    totalSessions: Type.Integer({ minimum: 0 }),
    /** Number of currently active sessions */
    activeSessions: Type.Integer({ minimum: 0 }),
    /** Total error count across all sessions */
    errorCount: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type MonitorStats = Static<typeof MonitorStatsSchema>;

// ============================================================
// Monitor Snapshot
// ============================================================

/** Complete snapshot of monitor state for broadcasting */
export const MonitorSnapshotSchema = Type.Object(
  {
    /** State version for change detection */
    version: StateVersionSchema,
    /** All tracked sessions */
    sessions: Type.Array(SessionStateSchema),
    /** ID of the currently active/focused session */
    activeSessionId: Type.Optional(NonEmptyString),
    /** Recent messages from active session */
    messages: Type.Array(MessageRecordSchema),
    /** Recent errors from all sessions */
    errors: Type.Array(ErrorRecordSchema),
    /** Aggregate statistics */
    stats: MonitorStatsSchema,
  },
  { additionalProperties: false },
);

export type MonitorSnapshot = Static<typeof MonitorSnapshotSchema>;
