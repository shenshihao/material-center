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
import { existsSync, mkdirSync } from 'node:fs';

import categoriesRouter from './routes/categories.js';
import materialsRouter from './routes/materials.js';
import tagsRouter from './routes/tags.js';
import statsRouter from './routes/stats.js';
import errorHandler from './middleware/errorHandler.js';
import { UPLOADS_BASE } from './services/fileService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure upload dirs exist
['originals', 'thumbnails'].forEach(d => mkdirSync(join(UPLOADS_BASE, d), { recursive: true }));

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
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

// Serve frontend in production
const publicDir = join(__dirname, '../public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, HOST, () => {
  console.log(`\n✓ 素材管理中心后端启动成功`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  外网访问: http://${HOST === '0.0.0.0' ? '你的服务器IP' : HOST}:${PORT}`);
  console.log(`  API 文档: http://localhost:${PORT}/api/v1/stats\n`);
});
