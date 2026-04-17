import { createHash } from 'node:crypto';
import { createReadStream, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_BASE = join(__dir, '../../../uploads');

export function getRelativePath(absolutePath) {
  return absolutePath.replace(UPLOADS_BASE + '/', '').replace(UPLOADS_BASE + '\\', '');
}

export function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function deleteFile(relativePath) {
  if (!relativePath) return;
  const abs = join(UPLOADS_BASE, relativePath);
  if (existsSync(abs)) {
    try { unlinkSync(abs); } catch {}
  }
}

export function getMimeCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ppt';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.includes('zip')) return 'zip';
  return 'other';
}
