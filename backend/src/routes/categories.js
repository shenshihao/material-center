import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/v1/categories — 返回带素材数量的树形结构
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, COUNT(m.id) as material_count
    FROM categories c
    LEFT JOIN materials m ON m.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all();

  // Build tree
  const map = {};
  rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
  const tree = [];
  rows.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(map[r.id]);
    } else {
      tree.push(map[r.id]);
    }
  });

  res.json({ success: true, data: tree });
});

// POST /api/v1/categories
router.post('/', (req, res) => {
  const { name, description, color, icon, parent_id } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: '分类名称不能为空' } });
  }
  const stmt = db.prepare(`
    INSERT INTO categories (name, description, color, icon, parent_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name.trim(),
    description || null,
    color || '#6366f1',
    icon || 'folder',
    parent_id || null
  );
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: category });
});

// PUT /api/v1/categories/:id
router.put('/:id', (req, res) => {
  const { name, description, color, icon, parent_id, sort_order } = req.body;
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(req.params.id));
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '分类不存在' } });

  db.prepare(`
    UPDATE categories SET
      name = ?, description = ?, color = ?, icon = ?,
      parent_id = ?, sort_order = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    description ?? existing.description,
    color ?? existing.color,
    icon ?? existing.icon,
    parent_id !== undefined ? parent_id : existing.parent_id,
    sort_order !== undefined ? sort_order : existing.sort_order,
    existing.id
  );
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(existing.id);
  res.json({ success: true, data: updated });
});

// DELETE /api/v1/categories/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { reassign_to } = req.query;
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '分类不存在' } });

  if (reassign_to) {
    db.prepare('UPDATE materials SET category_id = ? WHERE category_id = ?').run(Number(reassign_to), id);
    db.prepare('UPDATE categories SET parent_id = ? WHERE parent_id = ?').run(Number(reassign_to), id);
  } else {
    db.prepare('UPDATE materials SET category_id = NULL WHERE category_id = ?').run(id);
    db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').run(id);
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ success: true, data: null });
});

// PUT /api/v1/categories/reorder
router.put('/reorder', (req, res) => {
  const { orders } = req.body; // [{ id, sort_order }]
  if (!Array.isArray(orders)) return res.status(400).json({ success: false, error: { code: 'INVALID', message: 'orders 必须是数组' } });
  const stmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  orders.forEach(({ id, sort_order }) => stmt.run(sort_order, id));
  res.json({ success: true, data: null });
});

export default router;
