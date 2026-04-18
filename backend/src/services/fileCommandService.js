import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const ALLOWED_ROOT = process.env.ALLOWED_ROOT_DIR || 'C:/Users/Administrator';

// 禁止访问的系统目录
const FORBIDDEN_PATHS = [
  '/etc',
  '/root',
  '/proc',
  '/sys',
  '/boot',
  '/dev',
  '/var/log',
  '/var/cache',
  '/.ssh',
  '/.aws',
  'C:/Windows',
  'C:/Program Files',
  'C:/Program Files (x86)',
  'C:/ProgramData',
  'C:/$Recycle.Bin',
  'C:/System Volume Information',
];

// 危险命令关键词
const DANGEROUS_PATTERNS = [
  'rm -rf',
  'rm -r /',
  'format',
  'del /f /s',
  'shutdown',
  'reboot',
  'mkfs',
  'dd if=',
  '> /dev/',
  '| sh',
  '&& rm',
  '; rm',
];

function isPathAllowed(filePath) {
  const absPath = path.resolve(filePath);
  const absRoot = path.resolve(ALLOWED_ROOT);

  // 检查是否在允许的根目录下
  if (!absPath.startsWith(absRoot)) {
    return false;
  }

  // 检查是否在禁止目录内
  for (const forbidden of FORBIDDEN_PATHS) {
    const absForbidden = path.resolve(forbidden);
    if (absPath.startsWith(absForbidden)) {
      return false;
    }
  }

  return true;
}

function sanitizeCommand(raw) {
  const lower = raw.toLowerCase();
  for (const pattern of DANGEROUS_PATTERNS) {
    if (lower.includes(pattern)) {
      return false;
    }
  }
  return true;
}

export async function executeFileCommand(command) {
  const { action, path: filePath, keyword } = command;

  // 安全检查
  if (action !== 'pwd' && action !== 'unknown' && action !== 'error') {
    if (filePath && !isPathAllowed(filePath)) {
      return {
        success: false,
        error: '禁止访问此路径，仅允许在指定目录内操作',
      };
    }
  }

  try {
    switch (action) {
      case 'ls':
        return await listDirectory(filePath || '.');

      case 'cat':
        return await readFile(filePath);

      case 'tree':
        return await treeDirectory(filePath || '.');

      case 'search':
        return await searchFiles(filePath || '.', keyword || '');

      case 'pwd':
        return { success: true, result: ALLOWED_ROOT };

      case 'cd':
        const newPath = path.resolve(filePath || '.');
        if (!isPathAllowed(newPath)) {
          return { success: false, error: '禁止访问此目录' };
        }
        return { success: true, result: `已切换到: ${newPath}` };

      case 'unknown':
        return { success: false, error: '无法理解您的请求，请尝试更清晰描述您想要的操作' };

      case 'error':
        return { success: false, error: command.message || 'Claude API 调用失败' };

      default:
        return { success: false, error: `不支持的操作: ${action}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function listDirectory(dirPath) {
  const absPath = path.resolve(dirPath || '.');
  if (!fs.existsSync(absPath)) {
    return { success: false, error: '目录不存在' };
  }

  const stat = fs.statSync(absPath);
  if (!stat.isDirectory()) {
    return { success: false, error: '路径不是目录' };
  }

  const entries = fs.readdirSync(absPath, { withFileTypes: true });
  const items = entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? 'dir' : 'file',
    size: entry.isFile() ? fs.statSync(path.join(absPath, entry.name)).size : null,
  }));

  return { success: true, result: items };
}

async function readFile(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    return { success: false, error: '文件不存在' };
  }

  const stat = fs.statSync(absPath);
  if (!stat.isFile()) {
    return { success: false, error: '路径不是文件' };
  }

  // 限制文件大小 1MB
  if (stat.size > 1024 * 1024) {
    return { success: false, error: '文件过大（超过 1MB），无法读取' };
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  return { success: true, result: content };
}

async function treeDirectory(dirPath, depth = 2) {
  const absPath = path.resolve(dirPath || '.');
  if (!fs.existsSync(absPath)) {
    return { success: false, error: '目录不存在' };
  }

  function buildTree(dir, prefix = '', currentDepth = 0) {
    if (currentDepth > depth) return [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const result = [];

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const entryPath = path.join(dir, entry.name);

      result.push({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : 'file',
      });

      if (entry.isDirectory() && currentDepth < depth) {
        const children = buildTree(entryPath, prefix + (isLast ? '  ' : '│ '), currentDepth + 1);
        result.push(...children.map((c, i, arr) => ({
          ...c,
          name: (i === 0 ? prefix + (isLast ? '└── ' : '├── ') : prefix + (isLast ? '   ' : '│  ')) + c.name,
        })));
      }
    });

    return result;
  }

  const tree = buildTree(absPath);
  return { success: true, result: tree };
}

async function searchFiles(dirPath, keyword) {
  const absPath = path.resolve(dirPath || '.');
  if (!fs.existsSync(absPath)) {
    return { success: false, error: '目录不存在' };
  }

  const results = [];

  function search(dir, keyword, maxDepth = 3, currentDepth = 0) {
    if (currentDepth > maxDepth) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.name.toLowerCase().includes(keyword.toLowerCase())) {
          results.push({
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'dir' : 'file',
          });
        }

        if (entry.isDirectory() && currentDepth < maxDepth) {
          search(fullPath, keyword, maxDepth, currentDepth + 1);
        }
      }
    } catch (e) {
      // 忽略无权限目录
    }
  }

  search(absPath, keyword);

  return { success: true, result: results.slice(0, 50) }; // 最多返回50个结果
}
