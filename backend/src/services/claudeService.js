import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPLOADS_BASE } from './fileService.js';

// 手动加载 .env 文件（ES Module 导入顺序问题）
const __dirname = dirname(fileURLToPath(import.meta.url));
const __envPath = join(__dirname, '../../.env');
if (existsSync(__envPath)) {
  const envContent = readFileSync(__envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      const trimmedKey = key.trim();
      // 只覆盖尚未设置的变量
      if (!process.env[trimmedKey]) {
        process.env[trimmedKey] = vals.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

// MiniMax Anthropic 兼容 API 配置
// 如果设置了 MINIMAX_API=true，则使用 MiniMax 的 Anthropic 兼容端点
const isMiniMax = process.env.MINIMAX_API === 'true';
const apiHost = isMiniMax
  ? (process.env.MINIMAX_API_HOST || 'https://api.minimaxi.com')
  : 'https://api.anthropic.com';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: apiHost + (isMiniMax ? '/anthropic' : ''),
});

console.log(`[Claude] 使用 AI 提供商: ${isMiniMax ? 'MiniMax' : 'Anthropic'}, API Host: ${apiHost}`);

const SYSTEM_PROMPT = `你是一个文件操作助手。用户会用自然语言描述他们想要的文件操作，你需要将其转换为结构化的 JSON 命令。

支持的命令类型：
1. ls - 列出目录内容
   - action: "ls"
   - path: 目录路径

2. cat - 读取文件内容
   - action: "cat"
   - path: 文件路径

3. tree - 显示目录树结构
   - action: "tree"
   - path: 目录路径

4. search - 搜索文件
   - action: "search"
   - path: 搜索的目录
   - keyword: 搜索关键词

5. pwd - 获取当前目录
   - action: "pwd"

6. cd - 切换目录
   - action: "cd"
   - path: 目标目录

注意：
- path 可以是绝对路径或相对路径
- 如果用户想查看当前目录，直接用 "ls" 或 "查看当前目录"
- 如果无法理解用户的意图，返回 action: "unknown"

请直接返回 JSON，不要有其他文字：
{"action": "ls", "path": "/uploads"}`;

// 获取配置的模型名称
const getModel = (fallback = 'claude-sonnet-4-20250514') =>
  process.env.ANTHROPIC_MODEL || (isMiniMax ? 'MiniMax-M2.7' : fallback);

export async function parseUserCommand(userMessage) {
  try {
    const msg = await anthropic.messages.create({
      model: getModel(),
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const responseText = msg.content[0].text.trim();
    console.log('[Claude] 解析结果:', responseText);

    // 尝试解析 JSON
    try {
      // 移除可能的 markdown 代码块
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      console.error('[Claude] JSON 解析失败:', responseText);
      return { action: 'unknown', raw: responseText };
    }
  } catch (error) {
    console.error('[Claude] API 调用失败:', error.message);
    return { action: 'error', message: error.message };
  }
}

/**
 * 使用 Claude Vision 分析图片内容
 * @param {string} relativePath - 素材相对路径
 * @returns {Promise<{description: string, tags: string[], colors: string[]}>}
 */
export async function analyzeImage(relativePath) {
  const enableAutoTag = process.env.ENABLE_AUTO_TAG === 'true';
  if (!enableAutoTag) {
    console.log('[Claude] AI 自动标签未启用 (ENABLE_AUTO_TAG=false)');
    return null;
  }

  const imagePath = join(UPLOADS_BASE, relativePath);
  if (!existsSync(imagePath)) {
    console.error('[Claude] 图片文件不存在:', imagePath);
    return null;
  }

  try {
    const imageData = readFileSync(imagePath, { encoding: 'base64' });
    const mediaType = relativePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const language = process.env.AUTO_TAG_LANGUAGE || 'zh';
    const languagePrompt = language === 'en'
      ? 'Please analyze this image and return JSON format:'
      : '请分析这张图片，返回 JSON 格式：';

    const msg = await anthropic.messages.create({
      model: getModel('claude-3-5-sonnet-20241022'),
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageData }
          },
          {
            type: 'text',
            text: `${languagePrompt}
{
  "description": "${language === 'en' ? 'A brief description within 30 characters' : '一段30字以内的图片描述'}",
  "tags": ["${language === 'en' ? 'tag1' : '标签1'}", "${language === 'en' ? 'tag2' : '标签2'}", "${language === 'en' ? 'tag3' : '标签3'}", "${language === 'en' ? 'tag4' : '标签4'}", "${language === 'en' ? 'tag5' : '标签5'}"],
  "colors": ["${language === 'en' ? 'main color' : '主色调'}", "${language === 'en' ? 'secondary color' : '副色调'}"]
}
${language === 'en' ? 'Return JSON only, no other text.' : '只返回 JSON，不要其他文字。'}`
          }
        ]
      }]
    });

    const responseText = msg.content?.[0]?.text?.trim();
    if (!responseText) {
      console.error('[Claude Vision] 响应内容为空:', msg.content);
      return null;
    }
    console.log('[Claude Vision] 分析结果:', responseText);

    // 移除可能的 markdown 代码块
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      description: result.description || '',
      tags: Array.isArray(result.tags) ? result.tags.filter(t => t && typeof t === 'string' && t.trim()) : [],
      colors: Array.isArray(result.colors) ? result.colors.filter(c => c && c.trim()) : []
    };
  } catch (error) {
    console.error('[Claude Vision] 分析失败:', error.message);
    return null;
  }
}
