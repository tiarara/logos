// Rosie — Cloudflare Worker: Messenger webhook ⇄ Apps Script.
// Meta requires a fast 200 or it retries and eventually unsubscribes the webhook,
// so we answer immediately and finish the work in the background.
// Env vars: VERIFY_TOKEN, PAGE_TOKEN, SCRIPT_URL, SHARED_SECRET
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'GET') {                     // Meta webhook verification
      return url.searchParams.get('hub.verify_token') === env.VERIFY_TOKEN
        ? new Response(url.searchParams.get('hub.challenge')) : new Response('no', { status: 403 });
    }
    let body;
    try { body = await req.json(); } catch { return new Response('ok'); }
    ctx.waitUntil(handle(body, env));               // don't make Meta wait on Claude
    return new Response('ok');
  },
};

async function handle(body, env) {
  for (const entry of body.entry || []) for (const ev of entry.messaging || []) {
    const m = ev.message; if (!m || m.is_echo) continue;
    const psid = ev.sender.id;
    const attachment_url = (m.attachments || []).find(a => a.type === 'image')?.payload?.url || '';
    let out = null;
    try {
      const r = await fetch(env.SCRIPT_URL, {        // follows Apps Script's redirect
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: env.SHARED_SECRET, psid, name: '', text: m.text || '', attachment_url }),
      });
      out = await r.json();
    } catch (e) {
      await send(env, psid, 'Pasensya po, may problema sa sistema. Sinabi ko na kay Tiara.');
      continue;
    }
    for (const msg of out?.content?.messages || []) if (msg.text) await send(env, psid, msg.text);
  }
}

function send(env, psid, text) {
  return fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${env.PAGE_TOKEN}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text } }),
  });
}
