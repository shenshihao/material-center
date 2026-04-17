#!/usr/bin/env node
const https = require('https');
const APP_ID = 'cli_a95242164df89cb5';
const APP_SECRET = 'wDfnXqwSCrKDh0mvz47bTfHUmMozvQJU';
const ANTHROPIC_API_KEY = 'sk-cp-4i8e04zgEXEN2pCEp6RjYVpRzv9gaLvUh0kHaVtCoHhSeIQNiZBR3d4lKXQUQVFl7iS56cQW35sjnf1nuvexZTwSzem3U5_SXM2WgHO-eoTxBeWZIeaUDmw';

function log(...a) { console.log(`[${new Date().toISOString()}]`, ...a); }

function req(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname, path, method, headers };
    const r = https.request(opts, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d));}catch{resolve(d);} }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let _token = null;
async function getToken() {
  if (_token) return _token;
  _token = (await req('open.feishu.cn', '/open-apis/auth/v3/app_access_token/internal', 'POST', {'Content-Type':'application/json'}, {app_id:APP_ID,app_secret:APP_SECRET})).tenant_access_token;
  return _token;
}

async function reply(msgId, text, token) {
  return req('open.feishu.cn', `/open-apis/im/v1/messages/${msgId}/reply`, 'POST', {'Content-Type':'application/json','Authorization':'Bearer '+token}, {msg_type:'text',content:JSON.stringify({text})});
}

async function claude(prompt, history = []) {
  return new Promise((resolve, reject) => {
    const msgs = [...history, {role:'user',content:prompt}];
    const data = JSON.stringify({model:'MiniMax-M2.7',max_tokens:2048,messages:msgs});
    const opts = {hostname:'api.minimaxi.com',path:'/anthropic/v1/messages',method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ANTHROPIC_API_KEY,'Content-Length':Buffer.byteLength(data),'anthropic-version':'2023-06-01'}};
    const r = https.request(opts, res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>{
      try {
        const j = JSON.parse(b);
        if (j.error) reject(new Error(j.error.message));
        else {
          // content 是数组，第一个是 thinking，第二个是 text
          const textBlock = (j.content || []).find(c => c.type === 'text');
          resolve(textBlock?.text || '');
        }
      } catch(e) { reject(new Error(b.slice(0,200))); }
    }); });
    r.on('error', reject);
    r.write(data); r.end();
  });
}

function parseMsg(body) {
  try {
    const c = JSON.parse(body);
    if (c.text) return c.text;
    if (c.content) {
      let t = '';
      for (const p of c.content) for (const g of p) {
        if (g.tag === 'text') t += g.text;
        else if (g.tag === 'at') t += `@${g.uid||''} `;
      }
      t += '\n';
      return t.trim();
    }
  } catch {}
  return '';
}

async function getChats(token) {
  const r = await req('open.feishu.cn', '/open-apis/im/v1/chats?page_size=50', 'GET', {'Authorization':'Bearer '+token});
  return (r.data?.items || []);
}

async function getMsgs(chatId, token) {
  const r = await req('open.feishu.cn', `/open-apis/im/v1/messages?container_id_type=chat&container_id=${chatId}&page_size=20&sort_type=ByCreateTimeDesc`, 'GET', {'Authorization':'Bearer '+token});
  return (r.data?.items || []);
}

async function main() {
log('飞书-Claude 消息服务启动');
  const processed = new Set();
  const knownChats = new Set();
  const chatHistory = new Map();

  async function poll() {
    const token = await getToken();
    const chats = await getChats(token);
    const now = Date.now();

    for (const chat of chats) {
      if (!knownChats.has(chat.chat_id)) {
        log('[新群]', chat.name || chat.chat_id);
        knownChats.add(chat.chat_id);
      }

      const msgs = await getMsgs(chat.chat_id, token);
      for (const msg of msgs.reverse()) {
        const {message_id, sender, body, msg_type, create_time} = msg;
        if (msg_type === 'system' || msg_type === 'policy') continue;
        if (sender?.sender_type === 'app' || sender?.sender_type === 'bot') continue;
        if (msg_type !== 'text' && msg_type !== 'post') continue;
        if (processed.has(message_id)) continue;
        if (now - Number(create_time)*1000 > 2*60*1000) continue;

        const text = parseMsg(body?.content || '');
        if (!text?.trim()) continue;

        processed.add(message_id);
        log('[收到]', text.slice(0,60));

        const history = chatHistory.get(chat.chat_id) || [];
        try {
          const ans = await claude(`助手，请简洁回复：\n\n"${text}"`, history);
          log('[Claude]', ans.slice(0,60));
          await reply(message_id, ans.slice(0,6000), token);
          log('[已回复]');
          // 维护历史：用户消息 + 助手回复（各算一条）
          history.push({role:'user', content:text}, {role:'assistant', content:ans});
          if (history.length > 20) history.splice(0, history.length - 20);
          chatHistory.set(chat.chat_id, history);
        } catch (e) {
          log('[错误]', e.message);
          try { await reply(message_id, `错误：${e.message.slice(0,200)}`, token); } catch {}
        }
      }
    }
  }

  await poll();
  setInterval(async () => { try { await poll(); } catch (e) { log('[轮询错误]', e.message); } }, 2000);
  process.on('SIGINT', () => { log('关闭中...'); process.exit(0); });
}

main().catch(e => { log('[致命]', e.message); process.exit(1); });
