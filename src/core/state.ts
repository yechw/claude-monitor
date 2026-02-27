/**
 * State Manager for Claude Monitor
 *
 * Centralized state management for tracking:
 * - Session states
 * - Messages per session
 * - Errors per session
 *
 * Design borrowed from OpenClaw's server-runtime-state.ts
 */

import type {
  SessionState,
  MessageRecord,
  ErrorRecord,
  StateVersion,
  MonitorStats,
  MonitorSnapshot,
  Lifecycle,
} from './protocol/types.js';

/** Maximum messages to keep per session */
const MAX_MESSAGES_PER_SESSION = 100;

/** Maximum errors to keep per session */
const MAX_ERRORS_PER_SESSION = 50;

/**
 * StateManager handles all session tracking and state versioning
 */
export class StateManager {
  /** Map of session ID to session state */
  private sessions = new Map<string, SessionState>();

  /** Map of session ID to messages array */
  private messages = new Map<string, MessageRecord[]>();

  /** Map of session ID to errors array */
  private errors = new Map<string, ErrorRecord[]>();

  /** Current state version for change detection */
  private version: StateVersion = { seq: 0 };

  /** ID of the currently active/focused session */
  private activeSessionId?: string;

  /**
   * Increment the version counter
   */
  private bumpVersion(): void {
    this.version = { seq: this.version.seq + 1 };
  }

  /**
   * Add a new session to tracking
   */
  addSession(session: SessionState): void {
    this.sessions.set(session.ref.sessionId, session);
    this.messages.set(session.ref.sessionId, []);
    this.errors.set(session.ref.sessionId, []);
    this.bumpVersion();
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions as an array
   */
  getSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Update a session's state
   */
  updateSession(sessionId: string, updates: Partial<Omit<SessionState, 'ref'>>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      this.bumpVersion();
    }
  }

  /**
   * Remove a session from tracking
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
    this.errors.delete(sessionId);
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = undefined;
    }
    this.bumpVersion();
  }

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: MessageRecord): void {
    const sessionMessages = this.messages.get(sessionId);
    if (sessionMessages) {
      sessionMessages.push(message);
      // Trim to max size
      if (sessionMessages.length > MAX_MESSAGES_PER_SESSION) {
        sessionMessages.shift();
      }
      this.bumpVersion();
    }
  }

  /**
   * Get messages for a session
   */
  getMessages(sessionId: string): MessageRecord[] {
    return this.messages.get(sessionId) ?? [];
  }

  /**
   * Add an error to a session
   */
  addError(sessionId: string, error: ErrorRecord): void {
    const sessionErrors = this.errors.get(sessionId);
    if (sessionErrors) {
      sessionErrors.push(error);
      // Trim to max size
      if (sessionErrors.length > MAX_ERRORS_PER_SESSION) {
        sessionErrors.shift();
      }
      this.bumpVersion();
    }
  }

  /**
   * Get errors for a session
   */
  getErrors(sessionId: string): ErrorRecord[] {
    return this.errors.get(sessionId) ?? [];
  }

  /**
   * Get the current state version
   */
  getVersion(): StateVersion {
    return { ...this.version };
  }

  /**
   * Set the active session
   */
  setActiveSession(sessionId: string | undefined): void {
    this.activeSessionId = sessionId;
    this.bumpVersion();
  }

  /**
   * Get the active session ID
   */
  getActiveSessionId(): string | undefined {
    return this.activeSessionId;
  }

  /**
   * Get aggregate statistics
   */
  getStats(): MonitorStats {
    const sessions = this.getSessions();
    const activeLifecycles: Lifecycle[] = ['starting', 'running', 'idle'];

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => activeLifecycles.includes(s.lifecycle)).length,
      errorCount: Array.from(this.errors.values()).reduce((sum, errs) => sum + errs.length, 0),
    };
  }

  /**
   * Generate a complete snapshot of the monitor state
   */
  getSnapshot(): MonitorSnapshot {
    // Collect recent messages from active session
    const activeMessages = this.activeSessionId ? this.getMessages(this.activeSessionId) : [];

    // Collect all errors from all sessions
    const allErrors: ErrorRecord[] = [];
    for (const errors of this.errors.values()) {
      allErrors.push(...errors);
    }

    return {
      version: this.getVersion(),
      sessions: this.getSessions(),
      activeSessionId: this.activeSessionId,
      messages: activeMessages,
      errors: allErrors,
      stats: this.getStats(),
    };
  }
}
