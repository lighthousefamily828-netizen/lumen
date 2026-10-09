exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'method_not_allowed' }) };
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'missing_api_key', message: 'Add ANTHROPIC_API_KEY in Netlify environment variables, then redeploy.' }) };
  const ip = String(event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'x').split(',')[0].trim();
  if (limited(ip)) return { statusCode: 429, headers, body: JSON.stringify({ error: 'rate_limited', message: 'Too many requests. Please wait and try again.' }) };

  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'bad_request' }) }; }
  const mode = MODES[b.mode] ? b.mode : 'ask';
  const st = b.settings || {};
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-12)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 6000) }))
    .filter(m => m.content);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return { statusCode: 400, headers, body: JSON.stringify({ error: 'bad_request' }) };
  const casual = mode === 'ask' && CASUAL.test(msgs[msgs.length - 1].content);

  const system = 'You are Lumen, a professional AI search assistant. ' + MODES[mode] +
    (casual ? ' This message is casual small talk: reply briefly and do NOT search.' : '') +
    '\nTone: ' + (['friendly', 'professional', 'casual'].includes(st.tone) ? st.tone : 'friendly') + '. ' + (LEN[st.len] || LEN.balanced) +
    ' Reply in ' + String(st.lang || "the user's language").slice(0, 30) + '. Use simple markdown.' +
    '\nAt the very end, on their own lines, add exactly:\nSOURCES: Title | https://url ;; Title | https://url   (only real URLs you used; omit the line if none)\nFOLLOWUPS: question one | question two | question three';

  const body = { model: MODEL, max_tokens: 2500, system, messages: msgs };
  if (!casual) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: mode === 'deep' ? 8 : 3 }];

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!r.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: 'ai_failed', message: (j.error && j.error.message || 'The AI provider request failed.').slice(0, 200) }) };
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'ai_failed', message: 'The AI request failed. Check the Netlify function logs and API key.' }) };
  }
};
