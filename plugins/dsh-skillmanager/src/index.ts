/**
 * dsh-skillmanager host entry: mounts read-only skill registry routes plus a
 * toggle endpoint that flips a skill's frontmatter invocation policy on disk.
 * Creation/editing of skill bodies is deliberately left to the host agent
 * (delegated via generated prompts) — the manager inspects and toggles.
 */
import type { Context } from '@deepseek-ai/cordis'
import { mountSkillManagerRoutes, type SkillManagerHost } from './routes.ts'

export const name = 'dsh-skillmanager'

export function apply(ctx: Context): void {
  ctx.inject(['webServer', 'loader', 'skills'], (hostCtx: Context) => {
    const host = hostCtx as unknown as SkillManagerHost
    host.effect(() => mountSkillManagerRoutes(host), 'dsh-skillmanager: http routes')
  })
}
