import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function parseUserCommand(userMessage) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
