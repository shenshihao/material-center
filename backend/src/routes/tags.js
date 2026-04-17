import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/v1/tags
router.get('/', (req, res) => {
  const tags = db.prepare(`
    SELECT t.*, COUNT(mt.material_id) as usage_count
    FROM tags t
    LEFT JOIN material_tags mt ON mt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name ASC
  `).all();
  res.json({ success: true, data: tags });
});

// POST /api/v1/tags
router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: '标签名称不能为空' } });
  const result = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)').run(name.trim(), color || '#94a3b8');
  const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(name.trim());
  res.status(201).json({ success: true, data: tag });
});

// DELETE /api/v1/tags/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tags WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, data: null });
});

export default router;
