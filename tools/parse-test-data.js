#!/usr/bin/env node

/* Parse the object fragment exported in test.data.txt into header.json. */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function usage() {
  console.log(`用法:
  node tools/parse-test-data.js <输入文件> [输出文件]

默认输出到同目录的 header.json。工具只解析和规范化数据，不下载资源。

示例:
  node tools/parse-test-data.js test.data.txt seasons/2024-winter-2025-spring/banner/header.json`);
}

function field(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*:\\s*([\\s\\S]*?)(?=,\\s*(?:[a-zA-Z_$][\\w$]*)\\s*:|\\n\\s*})`));
  if (!match) return undefined;
  const value = match[1].trim().replace(/,$/, '').trim();
  if (value === 'b') return '';
  if (value === 'd') return 1;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try { return JSON.parse(value); } catch (_) { return value.slice(1, -1); }
  }
  return value;
}

function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/\\u002F/g, '/');
}

function parse(source) {
  const data = {
    name: field(source, 'name') || '',
    pic: normalizeUrl(field(source, 'pic')),
    litpic: normalizeUrl(field(source, 'litpic')),
    url: field(source, 'url') || '',
    is_split_layer: Number(field(source, 'is_split_layer')) || 0,
    split_layer: field(source, 'split_layer')
  };
  if (!data.split_layer) throw new Error('没有找到 split_layer 字段');
  try {
    const split = JSON.parse(data.split_layer);
    for (const layer of split.layers || []) for (const resource of layer.resources || []) {
      if (resource.src) resource.src = normalizeUrl(resource.src);
    }
    data.split_layer = JSON.stringify(split);
  } catch (error) {
    throw new Error(`split_layer 解析失败: ${error.message}`);
  }
  return { code: 0, message: '0', ttl: 1, data };
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || input === '--help' || input === '-h') { usage(); return; }
  const source = await fs.readFile(input, 'utf8');
  const payload = parse(source);
  const target = output || path.join(path.dirname(input), 'header.json');
  await fs.mkdir(path.dirname(path.resolve(target)), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(payload)}\n`, 'utf8');
  const split = JSON.parse(payload.data.split_layer);
  console.log(`已解析: ${target}`);
  console.log(`分层: ${(split.layers || []).length} 个`);
  console.log(`主图: ${[payload.data.pic, payload.data.litpic].filter(Boolean).length} 个`);
}

main().catch((error) => { console.error(`解析失败: ${error.message}`); process.exitCode = 1; });
