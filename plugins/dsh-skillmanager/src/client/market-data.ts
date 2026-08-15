/** Data model for the skill manager browser. */

export interface SkillInfo {
  name: string
  description: string
  whenToUse?: string
  source: string
  provider: string
  invocation: { modelInvocable: boolean; userInvocable: boolean }
}

export interface SkillDetail extends SkillInfo {
  content: string
  path?: string
}

/** Source bucket label ordering for the UI. */
export const SOURCE_ORDER = ['user-dsh', 'user-agents', 'project-dsh', 'project-agents', 'bundled'] as const

export function sourceLabel(source: string): string {
  switch (source) {
    case 'user-dsh': return '~/.dsh'
    case 'user-agents': return '~/.agents'
    case 'project-dsh': return '项目 .dsh'
    case 'project-agents': return '项目 .agents'
    case 'bundled': return '内置'
    case 'runtime': return '运行时'
    default: return source
  }
}
