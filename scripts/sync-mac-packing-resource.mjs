/**
 * sync-mac-packing-resource.mjs
 * 将 4 个外置插件同步到 mac-packing-resource/，供远程 mac 打包自包含。
 *
 * 背景：本地打包 Windows 时 electron-builder 的 extraResources 直接引用
 * E:\AllinDeepSeek 平级的外置插件目录（../dsh-*）。远程 macOS CI 没有这些
 * 目录，早期方案是多仓库 checkout（脆弱、易漏）。本方案把插件源码打进
 * dsh-gui 仓库自身，CI 单仓库自包含，最稳。
 *
 * 用法：node scripts/sync-mac-packing-resource.mjs
 * 插件更新后重跑一次即可，然后提交 mac-packing-resource/ 变更。
 *
 * filter 语义与 package.json build.extraResources 各插件的 filter 保持一致：
 * 只复制 electron-builder 最终会打进 app 的文件，避免仓库带冗余（src/scripts 等）。
 */
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_ROOT = resolve(ROOT, '..'); // E:\AllinDeepSeek（与 dsh-gui 平级）
const DEST = join(ROOT, 'mac-packing-resource');

// 各插件的排除规则（对齐 package.json filter）
const PLUGINS = {
  'dsh-discovery': {
    excludeDirs: ['node_modules', '.git', 'src'],
    excludeFiles: [
      /\.tsbuildinfo$/,
      /\.map$/,
      /^install\.log$/,
      /^\.gitignore$/,
      /^pnpm-lock\.yaml$/,
      /^tsconfig.*\.json$/,
      /^tsdown\.config\.ts$/,
    ],
  },
  'dsh-skillmanager': {
    excludeDirs: ['node_modules', '.git', 'src', 'scripts'],
    excludeFiles: [/\.tsbuildinfo$/, /\.map$/],
  },
  'dsh-mcpmanager': {
    excludeDirs: ['node_modules', '.git', 'src', 'scripts'],
    excludeFiles: [/\.tsbuildinfo$/, /\.map$/],
  },
  'dsh-proxy': {
    excludeDirs: ['node_modules', '.git', 'src', 'scripts'],
    excludeFiles: [/\.tsbuildinfo$/, /\.map$/],
  },
};

function copyTree(srcDir, destRoot, cfg, rel = '') {
  let count = 0;
  let bytes = 0;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    const srcPath = join(srcDir, entry.name);
    if (entry.isDirectory()) {
      if (cfg.excludeDirs.includes(entry.name)) continue;
      const sub = copyTree(srcPath, destRoot, cfg, relPath);
      count += sub.count;
      bytes += sub.bytes;
    } else {
      if (cfg.excludeFiles.some((re) => re.test(entry.name))) continue;
      const out = join(destRoot, relPath);
      mkdirSync(dirname(out), { recursive: true });
      cpSync(srcPath, out);
      count += 1;
      bytes += statSync(srcPath).size;
    }
  }
  return { count, bytes };
}

let totalFiles = 0;
let totalBytes = 0;
for (const [name, cfg] of Object.entries(PLUGINS)) {
  const src = join(SRC_ROOT, name);
  const dest = join(DEST, name);
  if (!statSync(src, { throwIfNoEntry: false })?.isDirectory()) {
    console.warn(`[skip] ${name} 不存在于 ${src}`);
    continue;
  }
  rmSync(dest, { recursive: true, force: true });
  const { count, bytes } = copyTree(src, dest, cfg);
  totalFiles += count;
  totalBytes += bytes;
  console.log(`[ok] ${name}: ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`\n完成：${totalFiles} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB → ${DEST}`);
