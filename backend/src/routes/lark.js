import express from 'express';
import { Client } from '@larksuiteoapi/node-sdk';
import { parseUserCommand } from '../services/claudeService.js';
import { executeFileCommand } from '../services/fileCommandService.js';

const router = express.Router();

let larkClient = null;

// 初始化飞书客户端
function getLarkClient() {
  if (!process.env.LARK_APP_ID || !process.env.LARK_APP_SECRET) {
    return null;
  }

  if (!larkClient) {
    larkClient = new Client({
      appId: process.env.LARK_APP_ID,
      appSecret: process.env.LARK_APP_SECRET,
      loggerLevel: 4,
    });
  }

  return larkClient;
}

// 飞书事件回调接口 (用于接收消息)
router.post('/event', express.json(), async (req, res) => {
  console.log('[飞书] 收到回调:', JSON.stringify(req.body));

  // 验证 Challenge
  const { challenge } = req.body;
  if (challenge) {
    console.log('[飞书] 验证 Challenge');
    return res.json({ challenge });
  }

  // 处理消息事件
  const { object: msgObject } = req.body || {};
  if (!msgObject || msgObject.message_type !== 'text') {
    return res.json({ code: 0 });
  }

  const message = msgObject;
  const userId = message.sender?.sender_id?.open_id;
  const chatId = message.chat_id;
  const textContent = message.content ? JSON.parse(message.content).text : '';

  console.log(`[飞书] 用户 ${userId} 说: ${textContent}`);

  // 立即返回成功，避免超时
  res.json({ code: 0 });

  // 异步处理命令
  try {
    const parsed = await parseUserCommand(textContent);
    console.log('[飞书] 解析命令:', parsed);

    const result = await executeFileCommand(parsed);

    // 发送回复
    await sendLarkMessage(chatId, userId, result, textContent);
  } catch (error) {
    console.error('[飞书] 处理消息失败:', error.message);
  }
});

// 发送消息给用户
async function sendLarkMessage(chatId, openId, result, originalCommand) {
  const client = getLarkClient();
  if (!client) {
    console.error('[飞书] 客户端未初始化');
    return;
  }

  try {
    let replyText = '';

    if (!result.success) {
      replyText = `❌ 执行失败\n\n命令: ${originalCommand}\n错误: ${result.error}`;
    } else {
      replyText = formatResult(result.result, originalCommand);
    }

    // 发送消息
    await client.im.message.create({
      data: {
        receive_id: openId,
        msg_type: 'text',
        content: JSON.stringify({ text: replyText }),
      },
    });

    console.log('[飞书] 已发送回复');
  } catch (error) {
    console.error('[飞书] 发送消息失败:', error.message);
  }
}

function formatResult(result, originalCommand) {
  if (Array.isArray(result)) {
    if (result.length === 0) {
      return '📂 目录为空';
    }

    const header = `📂 执行: ${originalCommand}\n\n`;
    const lines = result.slice(0, 20).map((item) => {
      if (item.type === 'dir') {
        return `📁 ${item.name}/`;
      } else {
        const size = item.size ? ` (${formatSize(item.size)})` : '';
        return `📄 ${item.name}${size}`;
      }
    });

    const more = result.length > 20 ? `\n... 还有 ${result.length - 20} 项` : '';
    return header + lines.join('\n') + more;
  }

  if (typeof result === 'string') {
    if (result.length > 2000) {
      return `📄 文件内容 (前 2000 字符):\n\n${result.substring(0, 2000)}\n\n... (已截断)`;
    }
    return `📄 执行: ${originalCommand}\n\n${result}`;
  }

  return `✅ 执行成功\n\n${JSON.stringify(result, null, 2)}`;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    lark_configured: !!(process.env.LARK_APP_ID && process.env.LARK_APP_SECRET),
    callback_url: `http://你的服务器IP:3001/lark/event`,
  });
});

export default router;
