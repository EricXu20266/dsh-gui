/**
 * 代理与 DHS 设置文件读写。
 * - 系统代理读取：Windows 注册表 / macOS scutil；输出统一补全协议前缀
 * - host 代理 env：从 ~/.dsh/settings.yaml 的 proxy 节解析
 * - 语言偏好写入：YAML 解析失败时绝不覆盖用户文件，写盘走 tmp + rename
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import type { Locale } from './types';

/** 补协议前缀：`127.0.0.1:7897` → `http://127.0.0.1:7897`；已有 http/https/socks 前缀则原样保留 */
export function normalizeProxyUrl(raw: string): string {
  const value = raw.trim();
  if (value === '') return '';
  if (/^(https?|socks4?|socks5):\/\//i.test(value)) return value;
  return `http://${value}`;
}

/**
 * 解析 Windows 注册表 ProxyServer 的整段值。
 * 兼容 `127.0.0.1:7897`、`http=127.0.0.1:7897;https=127.0.0.1:7897` 两种形态。
 */
export function parseProxyServerEntry(raw: string): string {
  const parts = raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';

  const pick = (scheme: string): string => {
    const found = parts.find((part) => part.toLowerCase().startsWith(`${scheme}=`));
    if (!found) return '';
    return normalizeProxyUrl(found.slice(found.indexOf('=') + 1));
  };
  const http = pick('http');
  if (http) return http;
  const plain = parts.find((part) => !part.includes('='));
  if (plain) return normalizeProxyUrl(plain);
  return pick('https');
}

function getWindowsSystemProxy(): string {
  try {
    const out = execFileSync(
      'reg',
      [
        'query',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
        '/v',
        'ProxyServer',
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    const matched = out.match(/ProxyServer\s+REG_SZ\s+(.+)/);
    return matched ? parseProxyServerEntry(matched[1]) : '';
  } catch {
    return '';
  }
}

function getMacSystemProxy(): string {
  try {
    const out = execFileSync('scutil', ['--proxy'], { encoding: 'utf8', windowsHide: true });
    if (!/HTTPEnable\s*:\s*1/.test(out)) return '';
    const host = out.match(/HTTPProxy\s*:\s*(\S+)/);
    if (!host) return '';
    const port = out.match(/HTTPPort\s*:\s*(\d+)/);
    return normalizeProxyUrl(`${host[1]}:${port?.[1] ?? '80'}`);
  } catch {
    return '';
  }
}

/** 读取系统代理（Windows / macOS），Linux 暂不支持返回空串 */
export function getSystemProxy(): string {
  if (process.platform === 'win32') return getWindowsSystemProxy();
  if (process.platform === 'darwin') return getMacSystemProxy();
  return '';
}

function readSettingsDoc(settingsPath: string): Record<string, unknown> {
  const text = readFileSync(settingsPath, 'utf8');
  try {
    return (yamlLoad(text) as Record<string, unknown> | null | undefined) ?? {};
  } catch {
    throw new Error('~/.dsh/settings.yaml 不是有效 YAML，已停止写入以避免覆盖现有配置');
  }
}

/** 写 settings.yaml：tmp + rename，失败时从 .bak 恢复，避免写坏用户配置 */
function writeYamlAtomic(settingsPath: string, doc: Record<string, unknown>): void {
  const tmpPath = `${settingsPath}.${process.pid}.tmp`;
  const bakPath = `${settingsPath}.bak`;
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(tmpPath, yamlDump(doc, { lineWidth: -1 }), 'utf8');
  try {
    if (existsSync(settingsPath)) renameSync(settingsPath, bakPath);
    renameSync(tmpPath, settingsPath);
  } catch (error) {
    if (!existsSync(settingsPath) && existsSync(bakPath)) renameSync(bakPath, settingsPath);
    throw error;
  } finally {
    rmSync(tmpPath, { force: true });
  }
}

/** 把语言偏好写入 DHS host 配置（~/.dsh/settings.yaml 的 locale.preference） */
export function writeLocalePreference(locale: Locale): void {
  const settingsPath = join(homedir(), '.dsh', 'settings.yaml');
  let doc: Record<string, unknown>;
  if (existsSync(settingsPath)) {
    doc = readSettingsDoc(settingsPath);
  } else {
    doc = {};
  }
  const current = (
    typeof doc.locale === 'object' && doc.locale !== null ? doc.locale : {}
  ) as Record<string, unknown>;
  doc.locale = { ...current, preference: locale };
  writeYamlAtomic(settingsPath, doc);
  console.log(`[dsh-gui] DHS locale preference set: ${locale}`);
}

/**
 * 读取 ~/.dsh/settings.yaml 的 proxy 节 → host 代理环境变量。
 * DHS 全链路走 Node 全局 fetch，Node 24 由 NODE_USE_ENV_PROXY 启用环境变量代理。
 * 外部已显式设置代理变量（大小写均算）时不覆盖；manual 模式为空时明确不生效，不静默回退系统代理。
 */
export function resolveHostProxyEnv(): Record<string, string> {
  const externallyConfigured = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'].some(
    (key) => process.env[key] !== undefined,
  );
  if (externallyConfigured) return {};

  const settingsPath = join(homedir(), '.dsh', 'settings.yaml');
  if (!existsSync(settingsPath)) return {};
  let doc: Record<string, unknown>;
  try {
    doc = readSettingsDoc(settingsPath);
  } catch {
    return {};
  }
  const proxy = (doc.proxy ?? {}) as Record<string, unknown>;
  if (proxy.enabled !== true) return {};

  let url = '';
  if (proxy.mode === 'manual') {
    if (typeof proxy.url !== 'string' || proxy.url.trim() === '') return {};
    url = normalizeProxyUrl(proxy.url);
  } else {
    url = getSystemProxy();
  }
  if (url === '') return {};
  return {
    NODE_USE_ENV_PROXY: '1',
    HTTP_PROXY: url,
    HTTPS_PROXY: url,
    NO_PROXY: 'localhost,127.0.0.1,::1',
  };
}
