/** Tiny JSON helpers for dsh-discovery routes (mirrors dsh-market's http.ts). */
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

/** Guard: only accept same-origin requests for non-GET mutation (none exist here). */
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
