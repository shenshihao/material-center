#!/usr/bin/env node
/**
 * 飞书-Claude 消息桥梁
 * 接收飞书消息，转发给 Claude API，返回回复
 */

const https = require('https');

// ============ 配置（从环境变量读取）============
const APP_ID = process.env.FEISHU_APP_ID || 'cli_a95242164df89cb5';
const APP_SECRET = process.env.FEISHU_APP_SECRET || 'wDfnXqwSCrKDh0mvz47bTfHUmMozvQJU';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-cp-4i8e04zgEXEN2pCEp6RjYVpRzv9gaLvUh0kHaVtCoHhSeIQNiZBR3d4lKXQUQVFl7iS56cQW35sjnf1nuvexZTwSzem3U5_SXM2WgHO-eoTxBeWZIeaUDmw';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'MiniMax-M2.7';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '2048', 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '3000', 10); // 轮询间隔 ms
const HISTORY_LIMIT = parseInt(process.env.HISTORY_LIMIT || '20', 10); // 对话历史条数
const MAX_MSG_AGE_MS = parseInt(process.env.MAX_MSG_AGE_MS || '120000', 10); // 只处理 2 分钟内的消息

// ============ 日志 ================
const log = {
  info: (...a) => console.log(`[${ts()}] [INFO]`, ...a),
  warn: (...a) => console.warn(`[${ts()}] [WARN]`, ...a),
  error: (...a) => console.error(`[${ts()}] [ERROR]`, ...a),
};
const ts = () => new Date().toISOString();

// ============ HTTP 工具 ================
function httpReq(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname, path, method, headers };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(d); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ============ 飞书 API ================
let _token = null;
let _tokenExpiresAt = 0;

async function getToken() {
  const now = Date.now();
  // 提前 5 分钟刷新，避免临界过期
  if (_token && now < _tokenExpiresAt - 5 * 60 * 1000) {
    return _token;
  }

  log.info('刷新飞书 access_token...');
  const res = await httpReq(
    'open.feishu.cn',
    '/open-apis/auth/v3/app_access_token/internal',
    'POST',
    { 'Content-Type': 'application/json' },
    { app_id: APP_ID, app_secret: APP_SECRET }
  );

  if (!res.tenant_access_token) {
    throw new Error(`获取 token 失败: ${JSON.stringify(res)}`);
  }

  _token = res.tenant_access_token;
  // 飞书 token 有效期 2 小时
  _tokenExpiresAt = now + (res.expire || 7200) * 1000;
  log.info('token 刷新成功');
  return _token;
}

async function replyMessage(messageId, text, token) {
  return httpReq(
    'open.feishu.cn',
    `/open-apis/im/v1/messages/${messageId}/reply`,
    'POST',
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    { msg_type: 'text', content: JSON.stringify({ text }) }
  );
}

async function getChats(token) {
  const res = await httpReq(
    'open.feishu.cn',
    '/open-apis/im/v1/chats?page_size=50',
    'GET',
    { 'Authorization': `Bearer ${token}` }
  );
  return res.data?.items || [];
}

async function getMessages(chatId, token) {
  const res = await httpReq(
    'open.feishu.cn',
    `/open-apis/im/v1/messages?container_id_type=chat&container_id=${chatId}&page_size=20&sort_type=ByCreateTimeDesc`,
    'GET',
    { 'Authorization': `Bearer ${token}` }
  );
  return res.data?.items || [];
}

// ============ Claude API ================
async function claude(prompt, history = []) {
  const messages = [...history, { role: 'user', content: prompt }];
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    messages,
  };

  const data = JSON.stringify(body);
  const res = await httpReq(
    'api.minimaxi.com',
    '/anthropic/v1/messages',
    'POST',
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANTHROPIC_API_KEY}`,
      'anthropic-version': '2023-06-01',
    },
    body
  );

  if (res.error) {
    throw new Error(res.error.message || JSON.stringify(res.error));
  }

  const textBlock = (res.content || []).find(c => c.type === 'text');
  return textBlock?.text || '';
}

// ============ 消息解析 ================
function parseMessageContent(content) {
  try {
    const parsed = JSON.parse(content);

    // 纯文本消息
    if (parsed.text) return parsed.text;

    // 富文本消息（post）
    if (parsed.content) {
      let text = '';
      for (const paragraph of parsed.content) {
        for (const segment of paragraph) {
          if (segment.tag === 'text') text += segment.text;
          else if (segment.tag === 'at') text += `@${segment.uid || ''} `;
        }
        text += '\n';
      }
      return text.trim();
    }
  } catch {}

  return '';
}

// ============ 对话历史管理（内存存储，可扩展为 Redis/DB）============
class HistoryStore {
  constructor(limit = 20) {
    this.store = new Map();
    this.limit = limit;
  }

  get(chatId) {
    return this.store.get(chatId) || [];
  }

  add(chatId, userMsg, assistantMsg) {
    const history = this.store.get(chatId) || [];
    history.push({ role: 'user', content: userMsg }, { role: 'assistant', content: assistantMsg });

    // 保持历史条数限制（每条消息算一个 turn）
    if (history.length > this.limit) {
      history.splice(0, history.length - this.limit);
    }

    this.store.set(chatId, history);
  }

  clear(chatId) {
    this.store.delete(chatId);
  }
}

// ============ 消息处理器 ================
class MessageProcessor {
  constructor() {
    this.processedIds = new Set();
    this.history = new HistoryStore(HISTORY_LIMIT);
  }

  shouldProcess(msg, now) {
    const { message_id, sender, msg_type, create_time } = msg;

    // 跳过系统消息
    if (msg_type === 'system' || msg_type === 'policy') return false;

    // 跳过机器人自己的消息
    if (sender?.sender_type === 'app' || sender?.sender_type === 'bot') return false;

    // 只处理文本和富文本
    if (msg_type !== 'text' && msg_type !== 'post') return false;

    // 跳过已处理的消息
    if (this.processedIds.has(message_id)) return false;

    // 跳过太旧的消息
    if (now - Number(create_time) * 1000 > MAX_MSG_AGE_MS) return false;

    return true;
  }

  markProcessed(messageId) {
    // 防止 Set 无限膨胀
    if (this.processedIds.size > 10000) {
      this.processedIds.clear();
    }
    this.processedIds.add(messageId);
  }

  async handleMessage(msg, token) {
    const { message_id, chat_id, body } = msg;
    const text = parseMessageContent(body?.content || '');

    if (!text?.trim()) return;

    this.markProcessed(message_id);
    log.info(`[收到消息] ${text.slice(0, 60)}...`);

    const history = this.history.get(chat_id);
    const prompt = `助手，请简洁回复：\n\n"${text}"`;

    try {
      const answer = await claude(prompt, history);
      log.info(`[Claude 回复] ${answer.slice(0, 60)}...`);

      // 飞书消息有 6000 字符限制
      const truncated = answer.length > 6000 ? answer.slice(0, 6000) + '...(已截断)' : answer;
      await replyMessage(message_id, truncated, token);

      this.history.add(chat_id, text, answer);
      log.info('[已回复]');
    } catch (e) {
      log.error(`[处理错误] ${e.message}`);
      try {
        await replyMessage(message_id, `抱歉，发生了错误：${e.message.slice(0, 200)}`, token);
      } catch (replyErr) {
        log.error(`[回复失败] ${replyErr.message}`);
      }
    }
  }
}

// ============ 主程序 ================
async function main() {
  log.info('=================================');
  log.info('飞书-Claude 消息服务启动');
  log.info(`模型: ${CLAUDE_MODEL}, 轮询间隔: ${POLL_INTERVAL}ms`);
  log.info('=================================');

  const processor = new MessageProcessor();
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 10;

  // 初始化 token
  try {
    await getToken();
  } catch (e) {
    log.error(`初始 token 获取失败: ${e.message}`);
    process.exit(1);
  }

  async function poll() {
    try {
      const token = await getToken();
      const chats = await getChats(token);
      const now = Date.now();

      for (const chat of chats) {
        try {
          const messages = await getMessages(chat.chat_id, token);

          // 逆序处理（从旧到新）
          for (const msg of messages.reverse()) {
            if (processor.shouldProcess(msg, now)) {
              await processor.handleMessage({ ...msg, chat_id: chat.chat_id }, token);
            }
          }
        } catch (e) {
          log.warn(`[群 ${chat.chat_id}] 获取消息失败: ${e.message}`);
        }
      }

      consecutiveErrors = 0;
    } catch (e) {
      consecutiveErrors++;
      log.error(`[轮询错误] ${e.message} (连续错误: ${consecutiveErrors})`);

      // 连续错误过多，重置 token 强制刷新
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        log.warn('连续错误过多，重置 token...');
        _token = null;
        consecutiveErrors = 0;
      }
    }
  }

  // 立即执行一次，然后定时轮询
  await poll();

  const interval = setInterval(async () => {
    try {
      await poll();
    } catch (e) {
      log.error(`[轮询异常] ${e.message}`);
    }
  }, POLL_INTERVAL);

  process.on('SIGINT', () => {
    log.info('收到关闭信号...');
    clearInterval(interval);
    process.exit(0);
  });

  process.on('uncaughtException', (e) => {
    log.error(`[未捕获异常] ${e.message}`);
    clearInterval(interval);
    process.exit(1);
  });
}

main().catch(e => {
  log.error(`[致命错误] ${e.message}`);
  process.exit(1);
});
