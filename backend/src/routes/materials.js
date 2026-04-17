import { Router } from 'express';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renameSync, existsSync, readFileSync } from 'node:fs';
import db from '../db.js';
import upload from '../middleware/upload.js';
import { hashFile, deleteFile, getMimeCategory, UPLOADS_BASE, getRelativePath } from '../services/fileService.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== ZIP 打包工具 =====
function crc32(data) {
  let crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  for (let i = 0; i < data.length; i++) crc = (table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipEntry(name, data, localOffset) {
  const nameBuf = Buffer.from(name, 'utf8');
  const nameLen = nameBuf.length;
  const dataLen = data.length;
  const crc = crc32(data);

  // Local file header
  const header = Buffer.alloc(30 + nameLen);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);   // UTF-8 filename flag (EFS)
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(dataLen, 18);
  header.writeUInt32LE(dataLen, 22);
  header.writeUInt16LE(nameLen, 26);
  header.writeUInt16LE(0, 28);
  nameBuf.copy(header, 30);

  // Central directory header
  const cdHeader = Buffer.alloc(46 + nameLen);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(0x800, 8);  // UTF-8 filename flag (EFS)
  cdHeader.writeUInt16LE(0, 10);
  cdHeader.writeUInt16LE(0, 12);
  cdHeader.writeUInt16LE(0, 14);
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(dataLen, 20);
  cdHeader.writeUInt32LE(dataLen, 24);
  cdHeader.writeUInt16LE(nameLen, 28);
  cdHeader.writeUInt16LE(0, 30);
  cdHeader.writeUInt16LE(0, 32);
  cdHeader.writeUInt16LE(0, 34);
  cdHeader.writeUInt16LE(0, 36);
  cdHeader.writeUInt32LE(0, 38);
  cdHeader.writeUInt32LE(localOffset, 42);
  nameBuf.copy(cdHeader, 46);

  return { header, data, cdHeader };
}

function createZip(files) {
  // files: [{ name: string, data: Buffer }]
  let offset = 0;
  const entries = [];
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    entries.push(createZipEntry(f.name, f.data, offset));
    offset += 30 + nameBuf.length + f.data.length;
  }

  const cdParts = entries.map(e => e.cdHeader);
  const cd = Buffer.concat(cdParts);
  const cdOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const parts = [];
  for (const e of entries) parts.push(e.header, e.data);
  parts.push(cd, eocd);
  return Buffer.concat(parts);
}

// GET /api/v1/materials
router.get('/', (req, res) => {
  const {
    page = 1, limit = 40,
    category_id, search, type, sort = 'created_at', order = 'desc',
    favorite
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [];
  const params = [];

  if (category_id !== undefined && category_id !== '') {
    conditions.push('m.category_id = ?');
    params.push(Number(category_id));
  }
  if (favorite !== undefined) {
    conditions.push('m.is_favorite = ?');
    params.push(Number(favorite));
  }
  if (type && type !== 'all') {
    switch (type) {
      case 'image':   conditions.push("m.mime_type LIKE 'image/%'"); break;
      case 'video':   conditions.push("m.mime_type LIKE 'video/%'"); break;
      case 'pdf':     conditions.push("m.mime_type = 'application/pdf'"); break;
      case 'doc':     conditions.push("(m.mime_type LIKE '%word%' OR m.mime_type LIKE '%document%' OR m.mime_type LIKE '%text%')"); break;
      case 'other':   conditions.push("m.mime_type NOT LIKE 'image/%' AND m.mime_type NOT LIKE 'video/%' AND m.mime_type != 'application/pdf'"); break;
    }
  }

  let whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const allowedSort = { created_at: 'm.created_at', name: 'm.name', file_size: 'm.file_size', sort_order: 'm.sort_order' };
  const sortCol = allowedSort[sort] || 'm.sort_order';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  let items, total;

  if (search && search.trim()) {
    // FTS search
    const ftsQuery = search.trim().split(/\s+/).map(w => `"${w.replace(/"/g, '')}"`).join(' OR ');
    try {
      const ftsIds = db.prepare(`SELECT rowid FROM materials_fts WHERE materials_fts MATCH ?`).all(ftsQuery).map(r => r.rowid);
      if (ftsIds.length === 0) {
        return res.json({ success: true, data: [], meta: { page: Number(page), limit: Number(limit), total: 0 } });
      }
      const inClause = ftsIds.join(',');
      const ftsWhere = `WHERE m.id IN (${inClause})` + (conditions.length ? ' AND ' + conditions.join(' AND ') : '');
      total = db.prepare(`SELECT COUNT(*) as cnt FROM materials m ${ftsWhere}`).get(...params).cnt;
      items = db.prepare(`
        SELECT m.*, c.name as category_name
        FROM materials m
        LEFT JOIN categories c ON c.id = m.category_id
        ${ftsWhere}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT ? OFFSET ?
      `).all(...params, Number(limit), offset);
    } catch {
      // fallback to LIKE
      const likeQ = `%${search}%`;
      const likeCond = `(m.name LIKE ? OR m.original_name LIKE ? OR m.description LIKE ?)`;
      const likeParams = [likeQ, likeQ, likeQ, ...params];
      const likeWhere = 'WHERE ' + likeCond + (conditions.length ? ' AND ' + conditions.join(' AND ') : '');
      total = db.prepare(`SELECT COUNT(*) as cnt FROM materials m ${likeWhere}`).get(...likeParams).cnt;
      items = db.prepare(`
        SELECT m.*, c.name as category_name
        FROM materials m
        LEFT JOIN categories c ON c.id = m.category_id
        ${likeWhere}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT ? OFFSET ?
      `).all(...likeParams, Number(limit), offset);
    }
  } else {
    total = db.prepare(`SELECT COUNT(*) as cnt FROM materials m ${whereClause}`).get(...params).cnt;
    items = db.prepare(`
      SELECT m.*, c.name as category_name
      FROM materials m
      LEFT JOIN categories c ON c.id = m.category_id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);
  }

  res.json({ success: true, data: items, meta: { page: Number(page), limit: Number(limit), total } });
});

// POST /api/v1/materials/upload
router.post('/upload', upload.array('files', 50), async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILES', message: '请选择文件' } });
    }

    const { category_id } = req.body;
    const results = [];

    // 获取当前分类下的最大 sort_order，新上传的排到最后
    const catId = category_id ? Number(category_id) : null;
    const maxRow = db.prepare(
      catId !== null
        ? 'SELECT MAX(sort_order) as max_order FROM materials WHERE category_id = ?'
        : 'SELECT MAX(sort_order) as max_order FROM materials WHERE category_id IS NULL'
    ).get(catId);
    let nextOrder = (maxRow?.max_order ?? 0) + 1;

    for (const file of req.files) {
      const relativePath = getRelativePath(file.path).replace(/\\/g, '/');
      let fileHash = null;
      try { fileHash = await hashFile(file.path); } catch {}

      // Check duplicate
      let duplicate = null;
      if (fileHash) {
        duplicate = db.prepare('SELECT id, name FROM materials WHERE file_hash = ?').get(fileHash);
      }

      const name = file.originalname.replace(/\.[^.]+$/, ''); // strip extension
      const stmt = db.prepare(`
        INSERT INTO materials (name, original_name, category_id, file_path, mime_type, file_size, file_hash, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        name,
        file.originalname,
        catId,
        relativePath,
        file.mimetype,
        file.size,
        fileHash,
        nextOrder++
      );
      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid);
      results.push({ ...material, duplicate: duplicate ? { id: duplicate.id, name: duplicate.name } : null });
    }

    res.status(201).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/materials/:id
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const material = db.prepare(`
    SELECT m.*, c.name as category_name
    FROM materials m
    LEFT JOIN categories c ON c.id = m.category_id
    WHERE m.id = ?
  `).get(id);
  if (!material) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '素材不存在' } });

  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN material_tags mt ON mt.tag_id = t.id
    WHERE mt.material_id = ?
  `).all(id);

  res.json({ success: true, data: { ...material, tags } });
});

// PUT /api/v1/materials/:id
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '素材不存在' } });

  const { name, description, category_id, is_favorite } = req.body;
  db.prepare(`
    UPDATE materials SET
      name = ?, description = ?, category_id = ?, is_favorite = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    name !== undefined ? name : existing.name,
    description !== undefined ? description : existing.description,
    category_id !== undefined ? (category_id === null ? null : Number(category_id)) : existing.category_id,
    is_favorite !== undefined ? Number(is_favorite) : existing.is_favorite,
    id
  );
  const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  res.json({ success: true, data: updated });
});

// DELETE /api/v1/materials/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  if (!material) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '素材不存在' } });

  deleteFile(material.file_path);
  if (material.thumbnail_path) deleteFile(material.thumbnail_path);
  db.prepare('DELETE FROM materials WHERE id = ?').run(id);
  res.json({ success: true, data: null });
});

// POST /api/v1/materials/batch
router.post('/batch', (req, res) => {
  const { ids, action, category_id } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ success: false, error: { code: 'INVALID', message: 'ids 不能为空' } });
  }

  switch (action) {
    case 'delete': {
      const placeholders = ids.map(() => '?').join(',');
      const items = db.prepare(`SELECT * FROM materials WHERE id IN (${placeholders})`).all(...ids);
      items.forEach(m => {
        deleteFile(m.file_path);
        if (m.thumbnail_path) deleteFile(m.thumbnail_path);
      });
      db.prepare(`DELETE FROM materials WHERE id IN (${placeholders})`).run(...ids);
      break;
    }
    case 'move': {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE materials SET category_id = ? WHERE id IN (${placeholders})`).run(
        category_id === null ? null : Number(category_id), ...ids
      );
      break;
    }
    case 'favorite':
    case 'unfavorite': {
      const val = action === 'favorite' ? 1 : 0;
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE materials SET is_favorite = ? WHERE id IN (${placeholders})`).run(val, ...ids);
      break;
    }
    case 'download': {
      const placeholders = ids.map(() => '?').join(',');
      const items = db.prepare(`
        SELECT m.*, c.name as category_name
        FROM materials m
        LEFT JOIN categories c ON c.id = m.category_id
        WHERE m.id IN (${placeholders})
        ORDER BY m.sort_order ASC, m.created_at ASC
      `).all(...ids);
      if (!items.length) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '没有找到要下载的素材' } });

      const zipFiles = [];
      const missing = [];
      for (const m of items) {
        const absPath = join(UPLOADS_BASE, m.file_path);
        if (!existsSync(absPath)) { missing.push(m.original_name); continue; }
        try {
          const data = readFileSync(absPath);
          // 按分类名建目录，文件名用 original_name
          const folder = m.category_name || '未分类';
          const zipName = `${folder}/${m.original_name}`;
          zipFiles.push({ name: zipName, data });
        } catch {}
      }

      if (!zipFiles.length) return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: `文件均不存在: ${missing.join(', ')}` } });

      const zip = createZip(zipFiles);
      const filename = encodeURIComponent(`素材_${Date.now()}.zip`);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
      res.setHeader('Content-Length', zip.length);
      res.end(zip);
      return;
    }
    default:
      return res.status(400).json({ success: false, error: { code: 'INVALID_ACTION', message: '未知操作' } });
  }

  res.json({ success: true, data: { affected: ids.length } });
});

// GET /api/v1/materials/:id/file — serve original file
router.get('/:id/file', (req, res, next) => {
  const id = Number(req.params.id);
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  if (!material) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '素材不存在' } });

  const filePath = join(UPLOADS_BASE, material.file_path);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.original_name)}"`);
  res.sendFile(filePath, (err) => { if (err) next(err); });
});

// POST /api/v1/materials/:id/tags
router.post('/:id/tags', (req, res) => {
  const id = Number(req.params.id);
  const { tag_ids } = req.body;
  if (!Array.isArray(tag_ids)) return res.status(400).json({ success: false, error: { code: 'INVALID', message: 'tag_ids 必须是数组' } });

  const stmt = db.prepare('INSERT OR IGNORE INTO material_tags (material_id, tag_id) VALUES (?, ?)');
  tag_ids.forEach(tid => stmt.run(id, tid));
  res.json({ success: true, data: null });
});

// DELETE /api/v1/materials/:id/tags/:tagId
router.delete('/:id/tags/:tagId', (req, res) => {
  db.prepare('DELETE FROM material_tags WHERE material_id = ? AND tag_id = ?').run(
    Number(req.params.id), Number(req.params.tagId)
  );
  res.json({ success: true, data: null });
});

// POST /api/v1/materials/rename — 序号重命名
router.post('/rename', (req, res) => {
  const { ids, category_id, start = 1, digits = 3, prefix = '' } = req.body;

  // 获取要重命名的素材
  let materials;
  if (Array.isArray(ids) && ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    materials = db.prepare(`
      SELECT * FROM materials WHERE id IN (${placeholders}) ORDER BY sort_order ASC, created_at ASC
    `).all(...ids);
  } else if (category_id !== undefined) {
    materials = db.prepare(`
      SELECT * FROM materials WHERE category_id = ? ORDER BY sort_order ASC, created_at ASC
    `).all(category_id === null ? null : Number(category_id));
  } else {
    materials = db.prepare(`
      SELECT * FROM materials ORDER BY sort_order ASC, created_at ASC
    `).all();
  }

  if (!materials.length) {
    return res.json({ success: true, data: [], message: '没有需要重命名的素材' });
  }

  const results = [];
  const updateStmt = db.prepare(`
    UPDATE materials SET name = ?, original_name = ?, file_path = ?,
      sort_order = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `);

  materials.forEach((m, i) => {
    const num = Number(start) + i;
    const paddedNum = String(num).padStart(Number(digits), '0');
    const ext = extname(m.original_name).toLowerCase();
    const newOriginalName = `${prefix}${paddedNum}${ext}`;
    const newName = `${prefix}${paddedNum}`;

    // 构建新的文件路径（保留原目录结构，只改文件名）
    const oldAbs = join(UPLOADS_BASE, m.file_path);
    const dir = oldAbs.substring(0, oldAbs.lastIndexOf('/'));
    const newAbs = `${dir}/${newOriginalName}`;

    if (existsSync(oldAbs)) {
      try {
        renameSync(oldAbs, newAbs);
      } catch (err) {
        results.push({ id: m.id, old: m.original_name, new: newOriginalName, error: err.message });
        return;
      }
    }

    // 新相对路径
    const pathParts = m.file_path.split('/');
    pathParts[pathParts.length - 1] = newOriginalName;
    const newRelativePath = pathParts.join('/');

    updateStmt.run(newName, newOriginalName, newRelativePath, i, m.id);
    results.push({ id: m.id, old: m.original_name, new: newOriginalName, sort_order: i });
  });

  res.json({ success: true, data: results });
});

export default router;
