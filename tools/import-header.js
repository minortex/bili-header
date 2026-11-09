#!/usr/bin/env node

/* Import a Bilibili header/v2 response into the archive format. */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
function usage() {
  console.log(`用法:
  node tools/import-header.js <URL 或 JSON 文件> [选项]

选项:
  --id <id>       季节目录和配置使用的 id，默认 import-<接口 id>
  --label <文字>  配置中的显示名称，默认使用接口 name 或 id
  --output <目录> 输出目录，默认 seasons/<id>
  --register      写入 config/seasons.json
  --force         允许覆盖输出目录中的同名文件
  --help          显示帮助

示例:
  node tools/import-header.js \\
    'https://api.bilibili.com/x/web-show/page/header/v2?category=0&web_location=333.934' \\
    --id 2026-spring-summer --register

  node tools/import-header.js seasons/2026-summer/banner/header.json \\
    --id 2026-summer --register`);
}

function parseArgs(args) {
  const options = { register: false, force: false };
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--register') options.register = true;
    else if (arg === '--force') options.force = true;
    else if (['--id', '--label', '--output'].includes(arg)) {
      if (!args[i + 1]) throw new Error(`${arg} 需要一个值`);
      options[arg.slice(2)] = args[++i];
    } else if (arg.startsWith('-')) throw new Error(`未知选项: ${arg}`);
    else positional.push(arg);
  }
  options.input = positional[0];
  return options;
}

function safeName(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'import';
}

const SEASON_RANK = { spring: 0, summer: 1, autumn: 2, winter: 3 };

function compareSeason(a, b) {
  const partsA = String(a.id).split('-');
  const partsB = String(b.id).split('-');
  const yearA = Number(partsA[0]) || 0;
  const yearB = Number(partsB[0]) || 0;
  const rankA = SEASON_RANK[partsA[1]] ?? 9;
  const rankB = SEASON_RANK[partsB[1]] ?? 9;
  return yearA - yearB || rankA - rankB || String(a.id).localeCompare(String(b.id));
}

function extFor(url, contentType) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.webm', '.mp4'].includes(ext)) return ext;
  const type = (contentType || '').split(';')[0].toLowerCase();
  return ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'video/webm': '.webm', 'video/mp4': '.mp4' })[type] || '.bin';
}

const SOURCE_FIELDS = new Set(['src', 'pic', 'litpic', 'logo']);

function eachSource(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((item) => eachSource(item, visit));
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'split_layer') continue;
    if (SOURCE_FIELDS.has(key) && typeof value === 'string' && value) {
      visit(value, node, key);
      continue;
    }
    eachSource(value, visit);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'local-bili-header-importer/1.0' } });
  if (!response.ok) throw new Error(`接口请求失败: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0) throw new Error(`接口返回错误: ${payload.code} ${payload.message || ''}`.trim());
  if (!payload.data || typeof payload.data !== 'object') throw new Error('接口响应中没有 data');
  return payload;
}

async function readInput(input) {
  let url;
  try { url = new URL(input); } catch (_) { url = null; }
  if (url) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('只支持 HTTP(S) URL');
    return { payload: await fetchJson(url.href), baseUrl: url.href };
  }
  let source;
  try { source = await fs.readFile(input, 'utf8'); }
  catch (error) { throw new Error(`无法读取 JSON 文件: ${input} (${error.code || error.message})`); }
  let payload;
  try { payload = JSON.parse(source); }
  catch (error) { throw new Error(`输入不是有效 JSON: ${error.message}`); }
  const data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
  if (!data || typeof data !== 'object') throw new Error('JSON 中没有有效数据对象');
  if (!data.split_layer && !data.timeLayers && !data.timeGroups) throw new Error('JSON 中没有 split_layer、timeLayers 或 timeGroups');
  return { payload: payload.data ? payload : { code: 0, message: '0', ttl: 1, data }, baseUrl: `file://${path.resolve(input)}` };
}

async function download(url, target, force) {
  try {
    if (!force) await fs.access(target);
    return false;
  } catch (_) { /* target does not exist */ }
  const response = await fetch(url, { headers: { 'User-Agent': 'local-bili-header-importer/1.0' } });
  if (!response.ok) throw new Error(`资源下载失败: HTTP ${response.status} ${url}`);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  return true;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.input) { usage(); return; }
  const input = await readInput(options.input);
  const payload = input.payload;
  const data = payload.data;
  const id = safeName(options.id || `import-${data.id || Date.now()}`);
  const seasonDir = path.resolve(ROOT, options.output || path.join('seasons', id));
  if (seasonDir !== ROOT && !seasonDir.startsWith(`${ROOT}${path.sep}`)) throw new Error('输出目录必须位于项目目录内');
  const bannerDir = path.join(seasonDir, 'banner');
  const assetDir = path.join(bannerDir, 'data');
  if (!options.force) {
    try {
      await fs.access(path.join(bannerDir, 'header.json'));
      throw new Error(`输出已存在: ${path.relative(ROOT, bannerDir)}，如需更新请加 --force`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await fs.mkdir(assetDir, { recursive: true });

  const sources = new Set();
  eachSource(data, (source) => sources.add(source));
  let split;
  try { split = typeof data.split_layer === 'string' ? JSON.parse(data.split_layer) : data.split_layer; }
  catch (_) { throw new Error('split_layer 不是有效 JSON'); }
  if (split) eachSource(split, (source) => sources.add(source));

  const localBySource = new Map();
  let downloaded = 0;
  for (const source of sources) {
    if (source.startsWith('/banner/')) { localBySource.set(source, source); continue; }
    let absolute;
    try { absolute = new URL(source, input.baseUrl).href; }
    catch (_) { throw new Error(`资源 URL 无效: ${source}`); }
    const response = await fetch(absolute, { method: 'HEAD', headers: { 'User-Agent': 'local-bili-header-importer/1.0' } }).catch(() => null);
    const ext = extFor(absolute, response?.headers.get('content-type'));
    const filename = `${crypto.createHash('sha1').update(absolute).digest('hex')}${ext}`;
    const target = path.join(assetDir, filename);
    if (await download(absolute, target, options.force)) downloaded += 1;
    localBySource.set(source, `/banner/data/${filename}`);
  }

  const localData = JSON.parse(JSON.stringify(data));
  eachSource(localData, (source, holder, key) => { holder[key] = localBySource.get(source) || source; });
  if (split) {
    eachSource(split, (source, holder, key) => { holder[key] = localBySource.get(source) || source; });
    localData.split_layer = JSON.stringify(split);
  }
  const header = { ...payload, data: localData };
  await fs.writeFile(path.join(bannerDir, 'header.json'), `${JSON.stringify(header)}\n`, 'utf8');

  if (options.register) {
    const configPath = path.join(ROOT, 'config/seasons.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    const season = { id, label: options.label || data.name || id, dataUrl: `${path.relative(ROOT, bannerDir)}/header.json`, assetBase: path.relative(ROOT, seasonDir) };
    config.seasons = (config.seasons || []).filter((item) => item.id !== id);
    config.seasons.push(season);
    config.seasons.sort(compareSeason);
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }
  console.log(`已导入: ${path.relative(ROOT, bannerDir)}/header.json`);
  console.log(`资源: ${sources.size} 个，新增下载 ${downloaded} 个${options.register ? '，已登记季节配置' : ''}`);
}

main().catch((error) => { console.error(`导入失败: ${error.message}`); process.exitCode = 1; });
