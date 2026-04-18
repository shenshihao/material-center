import db from '../db.js';

/**
 * 确保标签存在，不存在则创建
 * @param {string[]} tagNames - 标签名称数组
 * @returns {number[]} 标签 ID 数组
 */
export function ensureTags(tagNames) {
  if (!tagNames || tagNames.length === 0) return [];

  const stmt = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  tagNames.forEach(name => {
    if (name && name.trim()) {
      stmt.run(name.trim());
    }
  });

  return tagNames
    .map(name => {
      if (!name || !name.trim()) return null;
      return db.prepare('SELECT id FROM tags WHERE name = ?').get(name.trim())?.id;
    })
    .filter(Boolean);
}

/**
 * 将标签关联到素材
 * @param {number} materialId - 素材 ID
 * @param {number[]} tagIds - 标签 ID 数组
 */
export function linkTagsToMaterial(materialId, tagIds) {
  if (!tagIds || tagIds.length === 0) return;

  const stmt = db.prepare('INSERT OR IGNORE INTO material_tags (material_id, tag_id) VALUES (?, ?)');
  tagIds.forEach(tagId => stmt.run(materialId, tagId));
}

/**
 * 获取素材的所有标签
 * @param {number} materialId - 素材 ID
 * @returns {object[]} 标签列表
 */
export function getMaterialTags(materialId) {
  return db.prepare(`
    SELECT t.* FROM tags t
    JOIN material_tags mt ON mt.tag_id = t.id
    WHERE mt.material_id = ?
  `).all(materialId);
}
