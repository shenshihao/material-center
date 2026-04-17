import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/materials.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA cache_size = -32768');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT,
  color       TEXT    DEFAULT '#6366f1',
  icon        TEXT    DEFAULT 'folder',
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT    DEFAULT (datetime('now','localtime')),
  updated_at  TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS materials (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  original_name  TEXT    NOT NULL,
  description    TEXT,
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  file_path      TEXT    NOT NULL UNIQUE,
  thumbnail_path TEXT,
  mime_type      TEXT    NOT NULL,
  file_size      INTEGER NOT NULL,
  file_hash      TEXT,
  width          INTEGER,
  height         INTEGER,
  is_favorite    INTEGER DEFAULT 0,
  sort_order     INTEGER DEFAULT 0,
  created_at     TEXT    DEFAULT (datetime('now','localtime')),
  updated_at     TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#94a3b8'
);

CREATE TABLE IF NOT EXISTS material_tags (
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_created  ON materials(created_at);
CREATE INDEX IF NOT EXISTS idx_materials_favorite ON materials(is_favorite);
`);

// FTS5 virtual table
try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5(
      name,
      original_name,
      description,
      content='materials',
      content_rowid='id'
    );
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS materials_ai AFTER INSERT ON materials BEGIN
      INSERT INTO materials_fts(rowid, name, original_name, description)
      VALUES (new.id, new.name, new.original_name, COALESCE(new.description, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS materials_ad AFTER DELETE ON materials BEGIN
      INSERT INTO materials_fts(materials_fts, rowid, name, original_name, description)
      VALUES ('delete', old.id, old.name, old.original_name, COALESCE(old.description, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS materials_au AFTER UPDATE ON materials BEGIN
      INSERT INTO materials_fts(materials_fts, rowid, name, original_name, description)
      VALUES ('delete', old.id, old.name, old.original_name, COALESCE(old.description, ''));
      INSERT INTO materials_fts(rowid, name, original_name, description)
      VALUES (new.id, new.name, new.original_name, COALESCE(new.description, ''));
    END;
  `);
} catch {
  // triggers already exist, ignore
}

export default db;
