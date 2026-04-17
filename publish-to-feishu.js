#!/usr/bin/env node
/**
 * publish-to-feishu.js — 素材库图片发布到飞书文档（图文混排）
 *
 * 工作原理：
 *  1. 从素材库获取图片列表并下载到本地临时目录
 *  2. 创建飞书文档（首个文字段落作为初始 markdown）
 *  3. 交替追加文字（+update --mode append）和插入图片（+media-insert）
 *     → 自然形成"文字-图片-文字-图片"的图文混排效果
 *
 * 用法:
 *   node publish-to-feishu.js --category-id <id> --folder-token <token> [options]
 *
 * 参数:
 *   --category-id    素材库分类 ID（必填）
 *   --folder-token   飞书目标文件夹 token（必填）
 *   --text-mode      文本来源: auto(默认) | file | inline
 *   --markdown-file  text-mode=file 时，指定本地 .md 文件路径
 *   --inline-text    text-mode=inline 时，指定正文（支持 @file 语法读取文件）
 *   --base-url       素材库 API 地址（默认 http://localhost:3001）
 *   --doc-title      文档标题（默认使用分类名称）
 *   --dry-run        只打印内容，不创建文档
 */

import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '.feishu-publish-tmp');
const LARK_CLI = 'C:/Users/Administrator/AppData/Roaming/npm/lark-cli.cmd';

// ===== Lark CLI helpers =====

function lark(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', ['/c', LARK_CLI, ...args], { encoding: 'utf8', ...opts });
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err || out)));
    child.on('error', reject);
  });
}

function larkJSON(args, opts) {
  return lark(args, opts).then(s => {
    try { return JSON.parse(s); }
    catch { return { ok: false, error: { message: `Invalid JSON: ${s.slice(0, 200)}` } }; }
  });
}

// ===== 本地下载 =====

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ===== 解析 markdown 为 sections =====
// 每个 section: { heading: string|null, body: string, imagePath: string|null }

function parseMarkdownSections(mdContent, images) {
  const lines = mdContent.split('\n');
  const raw = []; // { heading, paragraphs[] }
  let cur = { heading: null, paragraphs: [] };

  for (const line of lines) {
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      if (cur.heading !== null || cur.paragraphs.length > 0) raw.push(cur);
      cur = { heading: hMatch[2].trim(), paragraphs: [] };
    } else if (line.trim()) {
      cur.paragraphs.push(line.replace(/^#+\s*/, '').trim());
    }
  }
  if (cur.heading !== null || cur.paragraphs.length > 0) raw.push(cur);

  return raw.map((s, i) => ({
    heading: s.heading,
    body: s.paragraphs.join('\n\n'),
    imagePath: images[i]?.local_path ?? null,
  }));
}

// ===== 构建 sections（auto 模式）=====

function buildAutoSections(images) {
  return images.map((img, i) => {
    const num = parseInt(String(img.name).match(/\d+/)?.[0] || String(i + 1));
    return {
      heading: `第 ${num} 步`,
      body: '',
      imagePath: img.local_path,
    };
  });
}

// ===== 将一个 section 转为 markdown 字符串 =====

function sectionToMarkdown(s) {
  const parts = [];
  if (s.heading) parts.push(`## ${s.heading}`);
  if (s.body) parts.push(s.body);
  return parts.join('\n\n');
}

// ===== 主流程 =====

async function main() {
  const { values } = parseArgs({
    options: {
      'category-id':   { type: 'string' },
      'folder-token':  { type: 'string' },
      'text-mode':     { type: 'string', default: 'auto' },
      'markdown-file': { type: 'string' },
      'inline-text':   { type: 'string' },
      'base-url':      { type: 'string', default: 'http://localhost:3001' },
      'doc-title':     { type: 'string' },
      'dry-run':       { type: 'boolean', default: false },
      'help':          { type: 'boolean', default: false },
    },
  });

  const {
    'category-id': catId, 'folder-token': folderToken,
    'text-mode': textMode = 'auto', 'markdown-file': mdFile,
    'inline-text': inlineText, 'base-url': baseUrl,
    'doc-title': docTitle, 'dry-run': dryRun,
  } = values;

  if (values.help) {
    console.log(`
publish-to-feishu.js — 素材库图片发布到飞书文档（图文混排）

用法:
  node publish-to-feishu.js --category-id <id> --folder-token <token> [options]

必填:
  --category-id    素材库分类 ID
  --folder-token   飞书目标文件夹 token

选项:
  --text-mode      auto(默认) | file | inline
  --markdown-file  text-mode=file 时指定本地 .md 路径
  --inline-text    text-mode=inline 时指定正文（支持 @file 读取文件）
  --base-url       素材库 API 地址（默认 http://localhost:3001）
  --doc-title      文档标题
  --dry-run        只打印，不创建文档

示例:
  node publish-to-feishu.js --category-id 3 --folder-token <token>
  node publish-to-feishu.js --category-id 3 --folder-token <token> \\
    --text-mode file --markdown-file ./content.md
`);
    process.exit(0);
  }

  if (!catId || !folderToken) {
    console.error('❌ 缺少必填参数：--category-id 和 --folder-token'); process.exit(1);
  }

  console.log('📦 开始发布到飞书（图文混排）...\n');

  // 1. 获取素材列表
  console.log('1️⃣ 获取素材列表...');
  const matsData = await fetch(`${baseUrl}/api/v1/materials?category_id=${catId}&type=image&limit=100&sort=sort_order&order=asc`).then(r => r.json());
  if (!matsData.success || !matsData.data.length) { console.error('❌ 该分类下没有找到图片'); process.exit(1); }
  const materials = matsData.data;
  console.log(`   找到 ${materials.length} 张图片`);

  // 2. 分类名称
  const catList = await fetch(`${baseUrl}/api/v1/categories`).then(r => r.json());
  const findCat = (nodes, id) => { for (const n of nodes) { if (n.id === Number(id)) return n; const f = n.children?.length ? findCat(n.children, id) : null; if (f) return f; } return null; };
  const category = findCat(catList.data, catId) || { name: `素材${catId}` };
  const title = docTitle || category.name;
  console.log(`   分类：「${category.name}」`);

  // 3. 下载图片
  console.log('\n2️⃣ 下载图片...');
  mkdirSync(TMP_DIR, { recursive: true });
  const downloaded = [];
  for (const m of materials) {
    const imgUrl = `${baseUrl}/files/${m.file_path}`;
    const ext = m.original_name.split('.').pop() || 'png';
    const localName = `${String(downloaded.length + 1).padStart(3, '0')}_${m.name}.${ext}`;
    const localPath = join(TMP_DIR, localName);
    process.stdout.write(`   ${m.original_name} ... `);
    try {
      await downloadFile(imgUrl, localPath);
      console.log('✓');
      downloaded.push({ ...m, local_path: localPath, local_name: localName });
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }
  if (!downloaded.length) { console.error('❌ 没有成功下载任何图片'); process.exit(1); }

  // 4. 构建 sections
  console.log('\n3️⃣ 构建图文结构...');
  let sections;
  if (textMode === 'inline' || textMode === 'file') {
    const mdContent = textMode === 'inline'
      ? (inlineText?.startsWith('@') ? readFileSync(inlineText.slice(1), 'utf8') : (inlineText || ''))
      : readFileSync(mdFile, 'utf8');
    sections = parseMarkdownSections(mdContent, downloaded);
  } else {
    sections = buildAutoSections(downloaded);
  }
  console.log(`   共 ${sections.length} 个段落，${downloaded.length} 张图片`);

  if (dryRun) {
    console.log('\n🟡 Dry-run，内容预览：\n');
    sections.forEach((s, i) => {
      console.log(`--- 段落 ${i + 1} ---`);
      console.log(sectionToMarkdown(s) || '（无文字）');
      if (s.imagePath) console.log(`[图片] ${s.imagePath}`);
      console.log();
    });
    downloaded.forEach(m => { try { unlinkSync(m.local_path); } catch {} });
    console.log('✅ 完成（dry-run）');
    process.exit(0);
  }

  // 5. 创建文档（用第一个 section 的文字作为初始 markdown）
  console.log('\n4️⃣ 创建飞书文档...');
  const firstMd = sectionToMarkdown(sections[0]) || title;
  let doc;
  try {
    const r = await larkJSON(['docs', '+create',
      '--folder-token', folderToken,
      '--title', title,
      '--markdown', firstMd,
    ]);
    if (!r.ok) throw new Error(r.error?.message || JSON.stringify(r));
    doc = {
      id: r.data?.doc_id || r.data?.document_id,
      url: r.data?.doc_url || r.data?.url,
    };
    if (!doc.id) throw new Error(`无法获取 doc id: ${JSON.stringify(r.data)}`);
  } catch (err) { console.error('❌ 创建文档失败:', err.message); process.exit(1); }
  console.log(`   ✅ 文档已创建: ${doc.id}`);

  // 6. 交替插入：第一个 section 的图片 → 后续 section 文字+图片
  console.log('\n5️⃣ 插入图文内容（交替追加）...');

  // 插入第一个 section 的图片
  if (sections[0]?.imagePath) {
    process.stdout.write(`   图片 [1] ... `);
    try {
      const relName = basename(sections[0].imagePath);
      const r = await larkJSON(['docs', '+media-insert', '--doc', doc.id, '--file', relName], { cwd: TMP_DIR });
      console.log(r.ok ? '✓' : `✗ ${JSON.stringify(r.error)}`);
    } catch (err) { console.log(`✗ ${err.message.split('\n')[0].slice(0, 100)}`); }
  }

  // 后续 sections：先追加文字，再插入图片
  for (let i = 1; i < sections.length; i++) {
    const s = sections[i];
    const md = sectionToMarkdown(s);

    if (md) {
      process.stdout.write(`   文字 [${i + 1}] ... `);
      try {
        const r = await larkJSON(['docs', '+update', '--doc', doc.id, '--mode', 'append', '--markdown', md]);
        console.log(r.ok ? '✓' : `✗ ${r.error?.message}`);
      } catch (err) { console.log(`✗ ${err.message.split('\n')[0].slice(0, 100)}`); }
    }

    if (s.imagePath) {
      process.stdout.write(`   图片 [${i + 1}] ... `);
      try {
        // +media-insert requires relative path within cwd
        const relName = basename(s.imagePath);
        const r = await larkJSON(['docs', '+media-insert', '--doc', doc.id, '--file', relName], { cwd: TMP_DIR });
        console.log(r.ok ? '✓' : `✗ ${JSON.stringify(r.error)}`);
      } catch (err) { console.log(`✗ ${err.message.split('\n')[0].slice(0, 100)}`); }
    }
  }

  // 7. 清理临时文件
  console.log('\n6️⃣ 清理临时文件...');
  downloaded.forEach(m => { try { unlinkSync(m.local_path); } catch {} });

  console.log(`\n✅ 发布完成！`);
  console.log(`   标题: ${title}`);
  console.log(`   图片: ${downloaded.length} 张`);
  if (doc.url) console.log(`   链接: ${doc.url}`);
  else console.log(`   文档 ID: ${doc.id}`);
}

main().catch(err => { console.error('\n❌ 错误:', err.message); process.exit(1); });
