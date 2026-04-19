import { NextResponse } from "next/server";
import type { RateLimitResult } from "./rate-limit";

/**
 * Convert any thrown value to a user-safe message.
 *
 * In development we surface the full message so debugging is fast.
 * In production we only surface messages that have been explicitly marked
 * safe (via `PublicError`); everything else collapses to a generic 500
 * message so internal stack traces / SDK errors don't leak.
 */
export class PublicError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PublicError";
    this.status = status;
  }
}

const isProd = process.env.NODE_ENV === "production";

export function safeErrorMessage(err: unknown, fallback = "Internal server error."): string {
  if (err instanceof PublicError) return err.message;
  if (!isProd && err instanceof Error) return err.message;
  return fallback;
}

export function publicErrorStatus(err: unknown, fallback = 500): number {
  if (err instanceof PublicError) return err.status;
  return fallback;
}

export function errorResponse(err: unknown, fallback = "Internal server error.") {
  return NextResponse.json(
    { error: safeErrorMessage(err, fallback) },
    { status: publicErrorStatus(err) },
  );
}

export function rateLimitResponse(rl: RateLimitResult) {
  return NextResponse.json(
    { error: `Too many requests. Try again in ${rl.retryAfter}s.` },
    {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    },
  );
}
