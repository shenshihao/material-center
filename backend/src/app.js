// Suppress experimental warnings
const originalEmit = process.emit.bind(process);
process.emit = function (name, data, ...args) {
  if (name === 'warning' && data?.name === 'ExperimentalWarning') return false;
  return originalEmit(name, data, ...args);
};

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

import categoriesRouter from './routes/categories.js';
import materialsRouter from './routes/materials.js';
import tagsRouter from './routes/tags.js';
import statsRouter from './routes/stats.js';
import larkRouter from './routes/lark.js';
import errorHandler from './middleware/errorHandler.js';
import { UPLOADS_BASE } from './services/fileService.js';

// 加载 .env 环境变量
const __envPath = join(dirname(fileURLToPath(import.meta.url)), '../.env');
if (existsSync(__envPath)) {
  const envContent = readFileSync(__envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure upload dirs exist
['originals', 'thumbnails'].forEach(d => mkdirSync(join(UPLOADS_BASE, d), { recursive: true }));

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
const ALLOWED_ORIGINS = [
  'http://localhost:3001',
  `http://${HOST}:${PORT}`,
];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/files', express.static(UPLOADS_BASE, { maxAge: '7d' }));

// API routes
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/materials', materialsRouter);
app.use('/api/v1/tags', tagsRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/lark', larkRouter);

// Serve frontend in production
const publicDir = join(__dirname, '../public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, HOST, async () => {
  console.log(`\n✓ 素材管理中心后端启动成功`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  外网访问: http://${HOST === '0.0.0.0' ? '你的服务器IP' : HOST}:${PORT}`);
  console.log(`  API 文档: http://localhost:${PORT}/api/v1/stats`);
  console.log(`  飞书回调: http://${HOST === '0.0.0.0' ? '你的服务器IP' : HOST}:${PORT}/lark/event`);
  console.log(`  飞书机器人: ${process.env.LARK_APP_ID ? '已配置' : '未配置 (请设置 .env)'}\n`);
});
