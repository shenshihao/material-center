import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/v1/stats
router.get('/', (req, res) => {
  const totals = db.prepare('SELECT COUNT(*) as total_count, SUM(file_size) as total_size FROM materials').get();
  const byCategory = db.prepare(`
    SELECT c.id, c.name, c.color, COUNT(m.id) as count
    FROM categories c
    LEFT JOIN materials m ON m.category_id = c.id
    GROUP BY c.id ORDER BY count DESC LIMIT 10
  `).all();
  const uncategorized = db.prepare('SELECT COUNT(*) as count FROM materials WHERE category_id IS NULL').get();
  const byType = db.prepare(`
    SELECT
      CASE
        WHEN mime_type LIKE 'image/%' THEN 'image'
        WHEN mime_type LIKE 'video/%' THEN 'video'
        WHEN mime_type = 'application/pdf' THEN 'pdf'
        WHEN mime_type LIKE '%word%' OR mime_type LIKE '%document%' THEN 'doc'
        ELSE 'other'
      END as type,
      COUNT(*) as count,
      SUM(file_size) as size
    FROM materials
    GROUP BY type
    ORDER BY count DESC
  `).all();
  const recent = db.prepare(`
    SELECT id, name, original_name, mime_type, file_size, created_at
    FROM materials ORDER BY created_at DESC LIMIT 10
  `).all();
  const favorites = db.prepare('SELECT COUNT(*) as count FROM materials WHERE is_favorite = 1').get();

  res.json({
    success: true,
    data: {
      total_count: totals.total_count,
      total_size: totals.total_size || 0,
      favorites_count: favorites.count,
      uncategorized_count: uncategorized.count,
      by_category: byCategory,
      by_type: byType,
      recent_uploads: recent,
    }
  });
});

export default router;
