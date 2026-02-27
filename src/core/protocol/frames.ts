/**
 * Protocol Frame Definitions using TypeBox
 *
 * Defines the WebSocket communication frames:
 * - Request/Response pattern for RPC-style calls
 * - Event frames for broadcasting state changes
 *
 * Borrowed from OpenClaw design pattern.
 */

import { Type, Static } from '@sinclair/typebox';
import { StateVersionSchema } from './types.js';

// ============================================================
// Primitives
// ============================================================

/** Non-empty string constraint */
const NonEmptyString = Type.String({ minLength: 1 });

// ============================================================
// Error Shape
// ============================================================

/** Standard error structure for response frames */
export const ErrorShapeSchema = Type.Object(
  {
    /** Machine-readable error code */
    code: NonEmptyString,
    /** Human-readable error message */
    message: NonEmptyString,
    /** Optional additional error details */
    details: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false },
);

export type ErrorShape = Static<typeof ErrorShapeSchema>;

// ============================================================
// Request Frame
// ============================================================

/** Request frame for RPC-style method calls */
export const RequestFrameSchema = Type.Object(
  {
    /** Frame type discriminator */
    type: Type.Literal('req'),
    /** Unique request identifier for correlation */
    id: NonEmptyString,
    /** Method name to invoke */
    method: NonEmptyString,
    /** Optional method parameters */
    params: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false },
);

export type RequestFrame = Static<typeof RequestFrameSchema>;

// ============================================================
// Response Frame
// ============================================================

/** Response frame for RPC-style method responses */
export const ResponseFrameSchema = Type.Object(
  {
    /** Frame type discriminator */
    type: Type.Literal('res'),
    /** Request ID this response corresponds to */
    id: NonEmptyString,
    /** Whether the request was successful */
    ok: Type.Boolean(),
    /** Response payload (present when ok is true) */
    payload: Type.Optional(Type.Unknown()),
    /** Error details (present when ok is false) */
    error: Type.Optional(ErrorShapeSchema),
  },
  { additionalProperties: false },
);

export type ResponseFrame = Static<typeof ResponseFrameSchema>;

// ============================================================
// Event Frame
// ============================================================

/** Event frame for broadcasting state changes */
export const EventFrameSchema = Type.Object(
  {
    /** Frame type discriminator */
    type: Type.Literal('event'),
    /** Event name */
    event: NonEmptyString,
    /** Optional event payload */
    payload: Type.Optional(Type.Unknown()),
    /** Optional sequence number for ordering */
    seq: Type.Optional(Type.Integer({ minimum: 0 })),
    /** Optional state version for change detection */
    stateVersion: Type.Optional(StateVersionSchema),
  },
  { additionalProperties: false },
);

export type EventFrame = Static<typeof EventFrameSchema>;

// ============================================================
// Frame Union
// ============================================================

/** Discriminated union of all frame types */
export const FrameSchema = Type.Union([RequestFrameSchema, ResponseFrameSchema, EventFrameSchema], {
  discriminator: 'type',
});

export type Frame = Static<typeof FrameSchema>;

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a request frame
 */
export function createRequestFrame(
  id: string,
  method: string,
  params?: unknown,
): RequestFrame {
  const frame: RequestFrame = {
    type: 'req',
    id,
    method,
  };
  if (params !== undefined) {
    frame.params = params;
  }
  return frame;
}

/**
 * Create a response frame
 */
export function createResponseFrame(
  id: string,
  ok: boolean,
  payload?: unknown,
  error?: ErrorShape,
): ResponseFrame {
  const frame: ResponseFrame = {
    type: 'res',
    id,
    ok,
  };
  if (payload !== undefined) {
    frame.payload = payload;
  }
  if (error !== undefined) {
    frame.error = error;
  }
  return frame;
}

/**
 * Create an event frame
 */
export function createEventFrame(
  event: string,
  payload?: unknown,
  seq?: number,
  stateVersion?: { seq: number },
): EventFrame {
  const frame: EventFrame = {
    type: 'event',
    event,
  };
  if (payload !== undefined) {
    frame.payload = payload;
  }
  if (seq !== undefined) {
    frame.seq = seq;
  }
  if (stateVersion !== undefined) {
    frame.stateVersion = stateVersion;
  }
  return frame;
}

// ============================================================
// Parsing
// ============================================================

/** Valid frame type values */
type FrameType = 'req' | 'res' | 'event';

/** Check if a value is a valid frame type */
function isValidFrameType(type: unknown): type is FrameType {
  return type === 'req' || type === 'res' || type === 'event';
}

/**
 * Parse a JSON string into a Frame object
 * @throws Error if the JSON is invalid or not a valid frame
 */
export function parseFrame(json: string): Frame {
  const parsed = JSON.parse(json);
  // Basic validation - ensure it has a type field
  if (!parsed || typeof parsed.type !== 'string') {
    throw new Error('Invalid frame: missing type field');
  }
  if (!isValidFrameType(parsed.type)) {
    throw new Error(`Invalid frame type: ${parsed.type}`);
  }
  return parsed as Frame;
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Check if a frame is a RequestFrame
 */
export function isRequestFrame(frame: Frame): frame is RequestFrame {
  return frame.type === 'req';
}

/**
 * Check if a frame is a ResponseFrame
 */
export function isResponseFrame(frame: Frame): frame is ResponseFrame {
  return frame.type === 'res';
}

/**
 * Check if a frame is an EventFrame
 */
export function isEventFrame(frame: Frame): frame is EventFrame {
  return frame.type === 'event';
}
