/**
 * Shared helpers for SMS API routes.
 * Server-only — never imported from client components.
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { SemaphoreError } from '@/lib/semaphore/types';

export const ROUTE_RUNTIME = 'nodejs';

export function jsonError(status: number, message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { success: false, error: message, ...(details !== undefined ? { details } : {}) },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function jsonOk<T extends Record<string, unknown>>(
  body: T,
  init: { status?: number } = {},
): NextResponse {
  return NextResponse.json(
    { success: true, ...body },
    {
      status: init.status ?? 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

/**
 * Translate SemaphoreError into an HTTP response.
 * The body shape stays minimal — never leaks the raw provider payload to clients.
 */
export function handleSemaphoreError(err: unknown): NextResponse {
  if (err instanceof SemaphoreError) {
    return jsonError(err.httpStatus ?? 500, err.message, { code: err.code });
  }
  return jsonError(500, 'Internal server error');
}

/**
 * Read JSON body safely. Returns either parsed body or a 400 response.
 */
export async function readJsonBody<T>(req: Request): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse }> {
  try {
    const body = (await req.json()) as T;
    return { ok: true, body };
  } catch {
    return { ok: false, response: jsonError(400, 'Invalid JSON body') };
  }
}
