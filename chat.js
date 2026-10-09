// Vercel serverless function. Requires env var ANTHROPIC_API_KEY.
const MODES = {
  ask: 'Answer directly. Search the web only if the question needs current or specific facts.',
  web: 'Search the web first and ground the answer in what you find. Always cite sources.',
  deep: 'Do thorough multi-step web research across several sources. Structure the answer with short headings, note disagreements and uncertainty.',
  write: 'Help with writing: drafts, emails, rewriting, editing. Output text that is ready to use.',
  code: 'Help with programming. Give correct, tidy code in fenced blocks with a brief explanation.'
};
const LEN = { short: 'Keep it under 120 words.', balanced: 'Be concise but complete.', detailed: 'Be thorough and detailed.' };
const CASUAL = /^\s*(hi+|hello+|hey+|yo|sup|salut|bonjour|good (morning|afternoon|evening|night)|thanks?( you)?|ok(ay)?|cool|bye|goodbye|how are you\??|who are you\??|what'?s up\??)[\s!.?]*$/i;
const MODEL = process.env.LUMEN_MODEL || 'claude-sonnet-5-5';
const LIMIT = Number(process.env.LUMEN_HOURLY_LIMIT || 30); // requests per IP per hour (best effort)
const hits = new Map();

function limited(ip) {
  const now = Date.now(), win = 3600000;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > LIMIT;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'missing_api_key' });
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });

  const b = req.body || {};
  const mode = MODES[b.mode] ? b.mode : 'ask';
  const st = b.settings || {};
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-12)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 6000) }))
    .filter(m => m.content);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' });
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
    if (!r.ok) return res.status(502).json({ error: 'ai_failed', message: (j.error && j.error.message || '').slice(0, 200) });
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: 'ai_failed' });
  }
};
