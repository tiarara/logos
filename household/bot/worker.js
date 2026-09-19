// Cloudflare Worker: Messenger webhook ⇄ Apps Script.
// Env vars: VERIFY_TOKEN, PAGE_TOKEN, SCRIPT_URL, SHARED_SECRET
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'GET') {                     // Meta webhook verification
      return url.searchParams.get('hub.verify_token') === env.VERIFY_TOKEN
        ? new Response(url.searchParams.get('hub.challenge')) : new Response('no', { status: 403 });
    }
    const body = await req.json();
    for (const entry of body.entry || []) for (const ev of entry.messaging || []) {
      const m = ev.message; if (!m || m.is_echo) continue;
      const psid = ev.sender.id;
      const attachment_url = (m.attachments || []).find(a => a.type === 'image')?.payload?.url || '';
      const r = await fetch(env.SCRIPT_URL, {           // follows Apps Script's redirect
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: env.SHARED_SECRET, psid, name: '', text: m.text || '', attachment_url }),
      });
      const out = await r.json().catch(() => null);
      for (const msg of out?.content?.messages || []) if (msg.text) {
        await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${env.PAGE_TOKEN}`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text: msg.text } }),
        });
      }
    }
    return new Response('ok');                        // Meta needs a fast 200
  },
};
