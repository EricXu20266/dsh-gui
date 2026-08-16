import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pngToIco from 'png-to-ico';
/**
 * 生成应用图标（从 DHS favicon.svg 黑色鲸鱼）：
 *  - resources/icon/icon-256.png   窗口/安装包图标（256x256）
 *  - resources/icon/icon.ico       安装包 exe 图标（多尺寸 16-256）
 *  - resources/icon/tray-16.png    系统托盘图标（16x16）
 *  - resources/icon/tray-32.png    系统托盘图标（32x32，高分屏）
 * 用法：node scripts/gen-icons.mjs
 */
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
// DHS favicon：相对路径（本地 E:/AllinDeepSeek/DSH-GUI/../deepseek-harness；CI $GITHUB_WORKSPACE/dsh-gui/../deepseek-harness）
const SVG_SRC = join(ROOT, '..', 'deepseek-harness', 'apps', 'web', 'public', 'favicon.svg');
const OUT = join(ROOT, 'resources', 'icon');
const TMP = mkdtempSync(join(tmpdir(), 'dsh-icons-')); // ico 中间 PNG 放系统临时目录，不污染 resources/

// DeepSeek 品牌蓝（--dsw-static-deepseek-500）
const DEEPSEEK_BLUE = '#4176E6';

mkdirSync(OUT, { recursive: true });

/** 黑色鲸鱼 → DeepSeek 蓝色（黑色任务栏上不可见，蓝色浅深任务栏都清晰） */
const svgText = readFileSync(SVG_SRC, 'utf8')
  .replaceAll('fill="#000"', `fill="${DEEPSEEK_BLUE}"`)
  .replaceAll('path { fill: #fff; }', `path { fill: ${DEEPSEEK_BLUE}; }`);

/** 渲染 SVG 到指定尺寸 PNG 并落盘，返回文件路径 */
async function renderPng(size, name) {
  const file = join(TMP, name);
  await sharp(Buffer.from(svgText), { density: 300 }).resize(size, size).png().toFile(file);
  return file;
}

// 托盘图标：16 / 32
await renderPng(16, 'tray-16.png');
await renderPng(32, 'tray-32.png');

// 512 主图标（macOS .icns 转换要求 ≥512）
const png512 = await renderPng(512, 'icon-512.png');
writeFileSync(join(OUT, 'icon-512.png'), readFileSync(png512));

// 256 主图标（窗口 + 安装包）
const png256 = join(OUT, 'icon-256.png');
await renderPng(256, 'icon-256.png');

// 多尺寸 ICO（16/24/32/48/64/128/256）
const ico = await pngToIco([
  await renderPng(16, 'tmp-16.png'),
  await renderPng(24, 'tmp-24.png'),
  await renderPng(32, 'tmp-32.png'),
  await renderPng(48, 'tmp-48.png'),
  await renderPng(64, 'tmp-64.png'),
  await renderPng(128, 'tmp-128.png'),
  png256,
]);
writeFileSync(join(OUT, 'icon.ico'), ico);

console.log('icons generated →', OUT);
