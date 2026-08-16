/**
 * dsh-gui 主进程 / preload / 安装向导共享的类型定义。
 * 仅包含类型，不会被 esbuild 输出任何运行时代码。
 */

export type Locale = 'zh' | 'en';

/** 向导初始化信息（setup:info 返回值） */
export interface SetupInfo {
  /** DHS 安装目录（打包版为 userData/dhs，开发态为本地 deepseek-harness） */
  dhsRoot: string;
  /** 预估安装大小（MB） */
  estimatedMb: number;
  /** 默认语言 */
  defaultLocale: Locale;
}

/** 向导收集的安装配置（setup:install 入参） */
export interface InstallConfig {
  /** npm registry 地址（用户选择的下载源） */
  registry: string;
  /** 代理地址（代理模式时；可为空字符串） */
  proxy: string;
  /** 是否使用操作系统代理 */
  useSystemProxy: boolean;
  /** 安装向导当前语言 */
  locale: Locale;
}

export type InstallStage = 'bootstrap' | 'download' | 'verify';

/** 安装进度中校验项的真实结果 */
export interface InstallChecks {
  deps: boolean;
  bin: boolean;
  node: boolean;
}

/** 安装进度事件（主进程 → 向导页） */
export interface InstallProgress {
  stage: InstallStage;
  /** 0-100 */
  percent: number;
  message: string;
  /** 仅安装完成时携带：三项校验的真实结果 */
  checks?: InstallChecks;
}

/** 安装结果 */
export interface InstallResult {
  ok: boolean;
  error?: string;
}
