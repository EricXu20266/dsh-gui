/**
 * 安装日志：同时写控制台 + 落盘文件。
 * 打包版没有控制台，安装失败时必须能从日志文件定位问题。
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

let installLogPath = '';

/** 打开本次安装的日志文件（幂等：重复调用只写一次开始标记） */
export function openInstallLog(filePath: string): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    installLogPath = filePath;
    appendFileSync(installLogPath, `\n===== 安装开始 ${new Date().toISOString()} =====\n`);
  } catch {
    // 日志打不开不阻塞安装流程，错误只能靠界面提示
    installLogPath = '';
  }
}

/** 写一条安装日志（控制台 + 文件） */
export function logInstall(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (installLogPath === '') return;
  try {
    appendFileSync(installLogPath, `${line}\n`);
  } catch {
    // 日志写入失败不阻塞安装流程
  }
}

/** 当前安装日志路径（供错误提示拼接） */
export function getInstallLogPath(): string {
  return installLogPath;
}
