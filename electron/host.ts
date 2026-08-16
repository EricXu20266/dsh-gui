/**
 * DHS host 子进程管理。
 *
 * 端口策略：`dsh --profile web --port 0` 让 OS 分配空闲端口，
 * 从根本上避免 3080 被已有 DHS web / 其他进程占用导致的「连到别人服务」。
 * host 的 readiness 信号是官方打印的 `dsh web: http://127.0.0.1:<port>`，
 * 从 stdout 解析端口，不在固定端口上盲等。
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { getDhsBin } from './paths';

const WEB_URL_PATTERN = /dsh web:\s+(http:\/\/127\.0\.0\.1:(\d+))/;

export interface StartHostOptions {
  dhsRoot: string;
  nodeBin: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  /** host 启动后退出（崩溃 / 被 kill）时回调；仅在启动完成后触发 */
  onExit?: (code: number | null) => void;
}

export interface RunningHost {
  proc: ChildProcess;
  port: number;
}

export async function startHost(options: StartHostOptions): Promise<RunningHost> {
  const timeoutMs = options.timeoutMs ?? 90000;
  const args = [getDhsBin(options.dhsRoot), '--profile', 'web', '--port', '0'];
  return new Promise<RunningHost>((resolve, reject) => {
    let settled = false;
    const proc = spawn(options.nodeBin, args, {
      cwd: options.dhsRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });

    const finishError = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        proc.kill();
      } catch {
        /* 进程可能已经退出 */
      }
      reject(error);
    };
    const finishOk = (port: number): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ proc, port });
    };

    const timer = setTimeout(() => {
      finishError(
        new Error(`host 启动超时（${Math.round(timeoutMs / 1000)}s），请查看控制台/日志`),
      );
    }, timeoutMs);

    let stdoutBuffer = '';
    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdoutBuffer += text;
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        process.stdout.write(`[host] ${line}\n`);
        const matched = line.match(WEB_URL_PATTERN);
        const port = matched
          ? Number(matched[2])
          : Number(line.match(/http:\/\/127\.0\.0\.1:(\d+)/)?.[1]);
        if (Number.isInteger(port) && port > 0) finishOk(port);
      }
    });
    proc.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(`[host:err] ${data}`);
    });
    proc.on('error', (error) => {
      finishError(new Error(`host 启动失败: ${error.message}`));
    });
    proc.on('exit', (code) => {
      if (settled) {
        options.onExit?.(code);
      } else {
        finishError(new Error(`host 在就绪前退出（exit code ${code}）`));
      }
    });
  });
}

/** 停止 host 子进程 */
export function stopHost(proc: ChildProcess | undefined): void {
  if (proc === undefined || proc.exitCode !== null || proc.signalCode !== null) return;
  try {
    proc.kill();
  } catch {
    // 已退出，忽略
  }
}
