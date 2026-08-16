/**
 * dsh-about host entry: mounts the About version-manifest route over the
 * harness web server. The DSH-GUI launcher injects the client/kernel/runtime
 * versions via environment variables at host spawn; installed plugin versions
 * are read from the active profile's node_modules.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type AboutHost, mountAboutRoutes } from './routes.ts';

export const name = 'dsh-about';

export function apply(ctx: Context): void {
  ctx.inject(['webServer'], (hostCtx: Context) => {
    const host = hostCtx as unknown as AboutHost;
    host.effect(() => mountAboutRoutes(host), 'dsh-about: http routes');
  });
}
