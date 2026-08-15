/** Tiny JSON helpers for dsh-skillmanager routes. */
import type { IncomingMessage, ServerResponse } from 'node:http'

export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  response.end(payload)
}

/** Guard: reject cross-origin mutation requests. */
export function sameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin
  if (origin === undefined) return true
  const host = request.headers.host ?? ''
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
