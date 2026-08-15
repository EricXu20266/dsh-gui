/** Tiny JSON helpers for dsh-discovery routes (mirrors dsh-market's http.ts). */
import type { IncomingMessage, ServerResponse } from 'node:http';
export declare function sendJson(response: ServerResponse, status: number, body: unknown): void;
/** Guard: only accept same-origin requests for non-GET mutation (none exist here). */
export declare function sameOrigin(request: IncomingMessage): boolean;
