/**
 * 子进程工具：
 * - runChild：跑一个子进程直到退出，逐行回调 stdout，输出可落盘
 * - trackChild / killTrackedChildren：托管安装类子进程，
 *   app 退出时统一清理，避免向导中途关闭留下孤儿 pnpm / 文件锁
 */
import { type ChildProcess, spawn } from 'node:child_process';

const trackedChildren = new Set<ChildProcess>();

/** 纳入全局托管：进程退出时自动移出集合 */
export function trackChild(child: ChildProcess): ChildProcess {
  trackedChildren.add(child);
  child.once('exit', () => trackedChildren.delete(child));
  child.once('close', () => trackedChildren.delete(child));
  return child;
}

/** 退出前清理所有托管中的安装子进程 */
export function killTrackedChildren(): void {
  for (const child of [...trackedChildren]) {
    try {
      child.kill();
    } catch {
      // 进程已经退出，忽略
    }
  }
}

export interface RunChildOptions {
  cwd?: string;
  env?: Record<string, string>;
  /** 逐行接收 stdout（跳过空行） */
  onLine?: (line: string) => void;
  /** 接收原始 stdout / stderr（用于写日志） */
  onOutput?: (text: string, kind: 'out' | 'err') => void;
}

/** 运行子进程直到退出；退出码 0 视为成功 */
export function runChild(
  bin: string,
  args: string[],
  options: RunChildOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = trackChild(
      spawn(bin, args, {
        cwd: options.cwd,
        windowsHide: true,
        env: { ...process.env, ...options.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      options.onOutput?.(text, 'out');
      if (options.onLine) {
        for (const line of text.split('\n')) {
          if (line.trim()) options.onLine(line);
        }
      }
    });
    child.stderr?.on('data', (data: Buffer) => {
      options.onOutput?.(data.toString(), 'err');
    });
    child.on('error', (error) => reject(error));
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`子进程退出码 ${code}`));
    });
  });
}
