/** Data model for the skill manager browser. */

export interface SkillInfo {
  name: string
  description: string
  whenToUse?: string
  source: string
  provider: string
  invocation: { modelInvocable: boolean; userInvocable: boolean }
  group?: string
  subgroup?: string
  path?: string
}

export interface SkillDetail extends SkillInfo {
  content: string
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

/** 按合集（group）聚合：返回有序 group 列表。 */
export function groupList(skills: SkillInfo[]): string[] {
  const groups = new Set<string>()
  for (const s of skills) {
    if (s.group !== undefined && s.group !== '') groups.add(s.group)
  }
  return [...groups].sort((a, b) => a.localeCompare(b, 'zh'))
}
