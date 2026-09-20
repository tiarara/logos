/**
 * Rosie — household bot for the Cemento house.
 * Runs as a Google Apps Script bound to the "Bahay Cemento" sheet.
 * The Cloudflare Worker (worker.js) calls doPost() with each inbound message and
 * relays the returned messages. Time-driven triggers handle the morning list, the arrival
 * check, the noon nudge, and the end-of-day close.
 *
 * Script Properties (File > Project properties > Script properties):
 *   PAGE_TOKEN       Messenger Page access token (from the Meta app)
 *   ANTHROPIC_API_KEY  optional — enables the learning layer; without it Rosie just forwards what rules miss
 *   LLM_MODEL / LLM_URL  optional — override the model or endpoint without touching code
 *   TIARA_EMAIL      where silence alerts go
 *   SHARED_SECRET    must match the header ManyChat sends
 *   MESSAGE_TAG      optional; leave blank unless Meta policy needs one
 */

const BOT_NAME = 'Rosie';
const TZ = 'Asia/Manila';
// Tier 3 is one HTTP call — swap provider by changing these two script properties,
// no code edit. Defaults to Claude; any OpenAI-compatible endpoint works the same way.
function llmCfg() {
  const P = PropertiesService.getScriptProperties();
  return { url: P.getProperty('LLM_URL') || 'https://api.anthropic.com/v1/messages',
           model: P.getProperty('LLM_MODEL') || 'claude-opus-5',
           key: P.getProperty('ANTHROPIC_API_KEY') || P.getProperty('LLM_KEY') };
}
const BLOCKS = {
  A: { name: 'Kusina', page: 3, floor: 'down' },
  B: { name: 'Mga Banyo', page: 4, floor: 'up' },
  C: { name: 'Buwanan', page: 5, floor: 'down' },
  D: { name: 'Mga Kwarto at Deck', page: 6, floor: 'up' },
  E: { name: 'Sala at Porch', page: 7, floor: 'down' },
};
const ORDER = ['A', 'B', 'C', 'D', 'E'];
const C_OVERDUE_DAYS = 35;
const OT_RATE = 60;
const RATE_HALF = 300;
const RATE_WHOLE = 500;

// ---------- sheet helpers ----------

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tab(name) { return ss().getSheetByName(name); }
function today() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function now() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'); }
function hourNow() { return Number(Utilities.formatDate(new Date(), TZ, 'H')); }
function isWorkday(d) { const w = (d || new Date()).getDay(); return w >= 1 && w <= 5; }

function rows(name) {
  const s = tab(name); const v = s.getDataRange().getValues();
  const h = v.shift();
  return v.map((r, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => o[k] = r[j]); return o; });
}
function append(name, obj) {
  const s = tab(name); const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  s.appendRow(h.map(k => obj[k] === undefined ? '' : obj[k]));
}
function setCell(name, row, col, val) {
  const s = tab(name); const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  s.getRange(row, h.indexOf(col) + 1).setValue(val);
}

// Queue tab is key/value: column A key, column B value.
function q(key) {
  const v = tab('Queue').getDataRange().getValues();
  for (const r of v) if (r[0] === key) return r[1];
  return '';
}
function setQ(key, val) {
  const s = tab('Queue'); const v = s.getDataRange().getValues();
  for (let i = 0; i < v.length; i++) if (v[i][0] === key) { s.getRange(i + 1, 2).setValue(val); return; }
  s.appendRow([key, val]);
}
function qSet(key) { return String(q(key) || '').split(',').filter(Boolean).map(Number); }

function person(psid) { return rows('People').find(p => String(p.psid) === String(psid)); }
function personByRole(role) { return rows('People').find(p => p.role === role); }
function setState(p, st) { setCell('People', p._row, 'state', st); }
function tasks(block) { return rows('Tasks').filter(t => t.block === block).sort((a, b) => a.no - b.no); }

// ---------- ManyChat I/O ----------

function reply(texts) {
  const msgs = [].concat(texts).map(t => ({ type: 'text', text: t }));
  return ContentService.createTextOutput(JSON.stringify({ version: 'v2', content: { messages: msgs } }))
    .setMimeType(ContentService.MimeType.JSON);
}
function push(psid, texts) {
  // Sends via the Messenger Send API directly (PAGE_TOKEN). With ManyChat instead, swap for its sendContent endpoint.
  const props = PropertiesService.getScriptProperties();
  const tag = props.getProperty('MESSAGE_TAG');
  [].concat(texts).forEach(t => {
    const body = { recipient: { id: psid }, message: { text: t }, messaging_type: tag ? 'MESSAGE_TAG' : 'UPDATE' };
    if (tag) body.tag = tag;
    UrlFetchApp.fetch('https://graph.facebook.com/v21.0/me/messages?access_token=' + props.getProperty('PAGE_TOKEN'), {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify(body),
    });
  });
}
function tellTiara(subject, body) {
  MailApp.sendEmail(PropertiesService.getScriptProperties().getProperty('TIARA_EMAIL'), 'Bahay: ' + subject, body);
  const admin = personByRole('admin'); if (admin) push(admin.psid, subject + '\n' + body);
}

// ---------- queue logic ----------

function blockForToday() {
  let b = q('next_block') || 'A';
  const last = q('c_last_done');
  if (b !== 'C' && last) {
    const age = (new Date() - new Date(last)) / 86400000;
    if (age > C_OVERDUE_DAYS) b = 'C';
  }
  return b;
}
function cWeek() { return Number(q('c_week') || 1); }
function focusBlockKey(b) { return b === 'C' ? 'C' + cWeek() : b; }
function wholeDay(b) { return b === 'C' && cWeek() >= 3; }

function advanceQueue(b) {
  if (b === 'C') { setQ('c_last_done', today()); setQ('c_week', (cWeek() % 4) + 1); }
  if (b === 'E') setQ('e_count', Number(q('e_count') || 0) + 1);
  setQ('next_block', ORDER[(ORDER.indexOf(b) + 1) % ORDER.length]);
}

// ---------- message builders ----------

function listText(block, done) {
  return tasks(block).map(t => (done.includes(t.no) ? '✅ ' : '') + t.no + ' ' + t.line).join('\n');
}
function morningText(ruby) {
  const b = blockForToday();
  const head = 'Magandang umaga ' + ruby.name + '! ☀️ Si ' + BOT_NAME + ' po ito.\nNgayon: BLOCK ' + b + ' — ' + BLOCKS[b].name + ' (page ' + BLOCKS[b].page + ')'
    + (b === 'C' ? ' — Week ' + cWeek() : '')
    + (wholeDay(b) ? '\n⚠️ BUONG ARAW po ngayon.' : '');
  const over = q('override_today');
  const adds = q('pending_adds');
  let extra = '';
  if (over) extra += '\n\n⚠️ Ibang gawain ngayon (mula kay Tiara):\n' + over + '\nAng Block ' + b + ' ay bukas na lang.';
  if (adds) extra += '\n\nDagdag ni Tiara:\n' + adds;
  const away = q('tiara_away') === 'yes' ? '\n\nPadala ng litrato ng banyo at kama bago umalis. 📷' : '';
  return head + '\n\nEVERYDAY muna:\n' + listText('EVERYDAY', []) + extra + away
    + '\n\nReply ng numero pag tapos, hal: 1 3 5\nTAPOS LAHAT · REPORT · WALA · OT';
}
function focusText(b) {
  const key = focusBlockKey(b);
  let t = 'Tapos na ang everyday — salamat! 🙌\nBLOCK ' + b + ' — ' + BLOCKS[b].name + (b === 'C' ? ' Week ' + cWeek() : '') + ':\n' + listText(key, []);
  if (b === 'E' && Number(q('e_count') || 0) % 2 === 1) t += '\n\nSCREENS ngayon:\n' + listText('E_SCREENS', []);
  return t + '\n\nReply ng numero pag tapos.';
}
function openItems(block, done) { return tasks(block).filter(t => !done.includes(t.no)); }

// ---------- day lifecycle ----------

function startDay(ruby) {
  const b = blockForToday();
  setQ('today', today()); setQ('block_today', b); setQ('phase', q('override_today') ? 'override' : 'everyday');
  setQ('everyday_done', ''); setQ('focus_done', ''); setQ('focus_sent', ''); setQ('wala', '');
  append('Log', { date: today(), time: now(), person: ruby.name, event: 'START', block: b, item: wholeDay(b) ? 'whole' : 'half' });
  return morningText(ruby);
}
function tick(ruby, nums) {
  const phase = q('phase'); const b = q('block_today');
  if (phase === 'everyday' || phase === 'override') {
    const done = Array.from(new Set(qSet('everyday_done').concat(nums))).filter(n => n >= 1 && n <= 8).sort((a, b2) => a - b2);
    setQ('everyday_done', done.join(','));
    nums.forEach(n => { const t = tasks('EVERYDAY').find(x => x.no === n); if (t) append('Log', { date: today(), time: now(), person: ruby.name, event: 'ROOM', block: 'EVERYDAY', item_no: n, item: t.line.split(' — ')[0], done: 'yes' }); });
    if (done.length >= 8) {
      if (phase === 'override') { setQ('phase', 'closed'); return closeText(ruby); }
      setQ('phase', 'focus'); setQ('focus_sent', 'yes'); return focusText(b);
    }
    return 'Salamat! Natitira: ' + openItems('EVERYDAY', done).map(t => t.no).join(' ');
  }
  if (phase === 'focus') {
    const key = focusBlockKey(b); const all = tasks(key).map(t => t.no);
    const done = Array.from(new Set(qSet('focus_done').concat(nums))).filter(n => all.includes(n)).sort((a, b2) => a - b2);
    setQ('focus_done', done.join(','));
    nums.forEach(n => { const t = tasks(key).find(x => x.no === n); if (t) append('Log', { date: today(), time: now(), person: ruby.name, event: 'TASK', block: b, item_no: n, item: t.line.slice(0, 60), done: 'yes' }); });
    if (done.length >= all.length) { setQ('phase', 'closed'); advanceQueue(b); return closeText(ruby); }
    return 'Salamat! Natitira: ' + openItems(key, done).map(t => t.no).join(' ');
  }
  return 'Tapos na po ang araw ngayon. ✅';
}
function closeText(ruby) {
  const away = q('tiara_away') === 'yes';
  setQ('override_today', ''); setQ('pending_adds', '');
  return 'Tapos na lahat — salamat ' + ruby.name + '! ✅' + (away ? '\nPadala na po ng litrato ng banyo at kama. Kung wala, reply WALANG LITRATO.' : '');
}

// ---------- learning layer ----------
// Three tiers: rules (free) -> Phrasebook (free) -> Claude (paid, and it teaches the Phrasebook).
// Claude only ever CLASSIFIES. The deterministic handlers below still do the acting,
// so no money or task row is ever written on a guess.

function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }

function phrasebookHit(text) {
  const n = norm(text); if (!n) return null;
  const r = rows('Phrasebook').find(x => norm(x.phrase) === n);
  return r ? { intent: r.intent, numbers: [], amount: 0, detail: r.note || '', confidence: 'high', source: 'phrasebook' } : null;
}
function learnPhrase(text, intent, note) {
  const n = norm(text);
  if (!n || n.length > 120) return;                       // long one-offs aren't reusable
  if (rows('Phrasebook').some(x => norm(x.phrase) === n)) return;
  append('Phrasebook', { phrase: text, intent: intent, note: note || '', added: today(), source: 'rosie' });
}

const INTENTS = ['done_all', 'done_some', 'not_done', 'absent', 'overtime', 'issue', 'expense', 'laundry', 'confirm_tally', 'dispute_tally', 'question', 'other'];

function askClaude(text, p) {
  const cfg = llmCfg();
  if (!cfg.key) return null;                                // no key = tier 3 off, rules + phrasebook only
  const book = rows('Phrasebook').slice(-40).map(x => '- "' + x.phrase + '" = ' + x.intent).join('\n');
  const sys = [
    'You classify one Messenger message from a Filipino household worker to her employer.',
    'She writes casual Taglish: heavy "po"/"opo", abbreviations (kc=kasi, cge=sige, di=hindi), run-on sentences, trailing commas.',
    'Her role: ' + (p.role === 'ron' ? 'maintenance, closes repair tasks he was sent' : 'cleaner, works through a numbered task list each morning'),
    'Today she is on: ' + (q('phase') === 'focus' ? 'the focus block, items 1-' + phaseMax() : 'the everyday list, rooms 1-8'),
    '',
    'Intents: done_all (everything finished) · done_some (specific numbered items done) · not_done (something was NOT finished) ·',
    'absent (cannot come to work) · overtime (worked extra hours) · issue (something broken, or supplies low) ·',
    'expense (she spent her own money on supplies) · laundry (laba charge) · confirm_tally (agrees with a pay summary) ·',
    'dispute_tally (disagrees with a pay summary) · question (asking her employer something) · other (anything else).',
    '',
    'Set confidence "low" whenever you are unsure, when money is involved and the amount is not explicit,',
    'or when acting on it wrongly would cost someone money or a day of work. Low confidence is forwarded to a human, which is always safe.',
    book ? '\nPhrases already learned:\n' + book : '',
  ].join('\n');

  const body = {
    model: cfg.model,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system: sys,
    tools: [{
      name: 'classify', description: 'Record the classification of this message.', strict: true,
      input_schema: {
        type: 'object', additionalProperties: false,
        required: ['intent', 'numbers', 'amount', 'detail', 'confidence'],
        properties: {
          intent: { type: 'string', enum: INTENTS },
          numbers: { type: 'array', items: { type: 'integer' }, description: 'Task numbers she says are done. Empty if none.' },
          amount: { type: 'number', description: 'Pesos, if she names an amount. 0 if none.' },
          detail: { type: 'string', description: 'The substance in her own words: the reason, the item, what is broken.' },
          confidence: { type: 'string', enum: ['high', 'low'] },
        },
      },
    }],
    tool_choice: { type: 'tool', name: 'classify' },
    messages: [{ role: 'user', content: text }],
  };
  try {
    const res = UrlFetchApp.fetch(cfg.url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify(body),
    });
    if (res.getResponseCode() !== 200) { Logger.log('claude ' + res.getResponseCode() + ' ' + res.getContentText()); return null; }
    const j = JSON.parse(res.getContentText());
    if (j.stop_reason === 'refusal') return null;
    const tu = (j.content || []).filter(c => c.type === 'tool_use')[0];
    if (!tu) return null;
    const out = tu.input; out.source = 'claude';
    return out;
  } catch (e) { Logger.log('claude error ' + e); return null; }
}

/** Last resort for Ruby: phrasebook, then Claude, then a human. */
function interpret(p, text) {
  const c = phrasebookHit(text) || askClaude(text, p);
  if (!c || c.confidence !== 'high') {
    tellTiara('Rosie could not read this from ' + p.name, text + (c ? '\n\n(best guess: ' + c.intent + ')' : ''));
    return 'Naipasa ko po kay Tiara. 🙏';
  }
  if (c.source === 'claude') learnPhrase(text, c.intent, c.detail);

  switch (c.intent) {
    case 'done_all': return tickAll(p);
    case 'done_some': {
      const n = (c.numbers || []).filter(x => x >= 1 && x <= phaseMax());
      if (n.length) return tick(p, n);
      break;
    }
    case 'not_done':
      append('Log', { date: today(), time: now(), person: p.name, event: 'NOTE', item: c.detail || text, done: 'no' });
      tellTiara(p.name + " says something wasn't finished", text);
      return 'Salamat sa pagsabi po, na-record ko at sinabi ko na kay Tiara. 🙏';
    case 'absent':
      append('Log', { date: today(), time: now(), person: p.name, event: 'WALA', item: c.detail || text });
      setQ('wala', 'yes'); tellTiara(p.name + ' is out today', text);
      return 'Sige po, ingat. Bukas na lang ang block. 🙏';
    case 'overtime':
      if (!c.detail) { setState(p, 'ot:hours'); return 'Ilang oras po ang OT?'; }
      break;                                            // hours+reason both needed — fall through to a human
    case 'issue':
      append('Issues', { id: Utilities.getUuid().slice(0, 8), reported: now(), person: p.name, type: 'Mula sa chat', description: c.detail || text, urgency: 'This week', status: 'New' });
      tellTiara('Issue from ' + p.name, c.detail || text);
      return 'Na-record ko po at sinabi kay Tiara. Salamat! ✅';
    case 'expense':
      if (c.amount > 0) {
        append('Log', { date: today(), time: now(), person: p.name, event: 'GASTOS', amount: c.amount, item: c.detail || '' });
        return 'Na-record po: ' + money(c.amount) + (c.detail ? ' — ' + c.detail : '') + '. Idadagdag sa sahod. ✅';
      }
      break;
    case 'laundry':
      if (c.amount > 0) { append('Log', { date: today(), time: now(), person: p.name, event: 'LABA', amount: c.amount, item: c.detail || '' }); return 'Na-record ang laba: ' + money(c.amount) + '. ✅'; }
      break;
  }
  tellTiara('From ' + p.name + ' (' + c.intent + ')', text);
  return 'Naipasa ko po kay Tiara. 🙏';
}

// ---------- inbound ----------

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const body = JSON.parse(e.postData.contents || '{}');
  if (body.secret !== props.getProperty('SHARED_SECRET')) return reply('');
  const p = person(body.psid);
  if (!p) { tellTiara('Unknown sender', body.name + ' (' + body.psid + '): ' + body.text); return reply('Salamat! Ipapaalam ko kay Tiara.'); }
  const text = String(body.text || '').trim();
  const photo = body.attachment_url || '';
  if (photo) { append('Log', { date: today(), time: now(), person: p.name, event: 'PHOTO', photo_url: photo }); if (!text) return reply('Salamat sa litrato! 📷'); }
  if (p.role === 'admin') return reply(handleAdmin(p, text));
  if (p.state) return reply(handleState(p, text));
  if (p.role === 'ruby') return reply(handleRuby(p, text));
  if (p.role === 'ron') return reply(handleRon(p, text));
  return reply('Salamat!');
}

// Ruby writes in full Taglish sentences, not keywords. Numbers are the happy path;
// these catch the way she actually talks. Anything unmatched is forwarded to Tiara.
const NUMS = /^[\d\s,]+$/;
const YES = /\b(opo|oo|tapos na|tapos po|tapos na po|ayos na|lahat na|ok na|okay na|done na|natapos)\b/i;
const NOPE = /\b(hindi|hindi ko|di|di ko|wala|hindi po)\b[^.]{0,30}\b(tapos|natapos|nagawa|nalinis|nagawa ko)\b/i;
function upper(t) { return t.toUpperCase().replace(/\s+/g, ' ').trim(); }
function phaseMax() { return q('phase') === 'focus' ? tasks(focusBlockKey(q('block_today'))).length : 8; }
function tickAll(p) {
  const key = q('phase') === 'focus' ? focusBlockKey(q('block_today')) : 'EVERYDAY';
  return tick(p, tasks(key).map(t => t.no));
}
function money(n) { return '₱' + Number(n).toLocaleString('en-PH'); }

function handleRuby(p, text) {
  const u = upper(text);
  if (q('today') !== today()) return startDay(p);

  // money and supplies — she already reports these unprompted
  let m = text.match(/^GASTOS\s*([\d,.]+)\s*(.*)$/i);
  if (m) {
    const amt = parseFloat(m[1].replace(/,/g, ''));
    append('Log', { date: today(), time: now(), person: p.name, event: 'GASTOS', amount: amt, item: m[2] || '' });
    return 'Na-record po: ' + money(amt) + (m[2] ? ' — ' + m[2] : '') + '. Idadagdag sa sahod. ✅';
  }
  m = text.match(/^LABA\s*([\d,.]+)\s*(.*)$/i);
  if (m) return chargeLaundry(p, parseFloat(m[1].replace(/,/g, '')), m[2] || '');

  if (/^(REPORT|PROBLEMA|MAY PROBLEMA)$/.test(u)) { setState(p, 'issue:type'); return issueTypePrompt(); }
  if (/^(WALA|WALA AKO|WALA PO AKO)$/.test(u)) { setState(p, 'wala:reason'); return 'Salamat sa pagsabi. Bakit po?'; }
  if (/^OT\s*([\d.]+)?$/.test(u)) {
    const h = (u.match(/[\d.]+/) || [])[0];
    if (!h) { setState(p, 'ot:hours'); return 'Ilang oras po ang OT?'; }
    setState(p, 'ot:reason:' + h); return 'Bakit po kailangan ng overtime?';
  }
  if (/^WALANG LITRATO$/.test(u)) { append('Log', { date: today(), time: now(), person: p.name, event: 'PHOTO', done: 'no' }); return 'Sige po, na-record. ✅'; }
  if (/^(LISTA|LIST|ULIT)$/.test(u)) return q('phase') === 'focus' ? focusText(q('block_today')) : morningText(p);
  if (/^(SAHOD|BAYAD)$/.test(u)) return tallyText(p, '');
  if (/^(TAPOS LAHAT|DONE ALL|LAHAT|TAPOS NA LAHAT)$/.test(u)) return tickAll(p);

  if (NUMS.test(text.trim())) {
    const max = phaseMax();
    const nums = text.trim().split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= max);
    if (nums.length) return tick(p, nums);
    tellTiara('Number from ' + p.name + " that isn't a task", text);   // e.g. a peso total
    return 'Pasensya po, hindi ko masyadong naintindihan — pero naipasa ko na kay Tiara. 🙏';
  }
  if (NOPE.test(text)) {                                   // "di ko po natapos yung CR kasi..."
    append('Log', { date: today(), time: now(), person: p.name, event: 'NOTE', item: text, done: 'no' });
    tellTiara(p.name + " says something wasn't finished", text);
    return 'Salamat sa pagsabi po, na-record ko at sinabi ko na kay Tiara. 🙏';
  }
  if (YES.test(text)) return tickAll(p);

  return interpret(p, text);
}

function handleRon(p, text) {
  // Ron reports nothing on a schedule. He only closes tasks Tiara sent him.
  const u = upper(text);
  const open = rows('Retainer').filter(r => r.kind === 'REPAIR' && !r.completed).sort((a, b) => new Date(a.date) - new Date(b.date));
  if ((/\b(TAPOS|DONE|OK|AYOS|NATAPOS)\b/.test(u) || YES.test(text)) && open.length) {
    const n = Number((u.match(/\d+/) || [])[0]);
    const target = n && open[n - 1] ? open[n - 1] : open[0];
    setCell('Retainer', target._row, 'completed', today());
    tellTiara('Ron finished: ' + target.source_or_description, 'Sent ' + target.date + ', due ' + target.due + '.');
    return 'Tapos na: ' + target.source_or_description + ' ✅ Salamat Ron!';
  }
  if (/^(LISTA|LIST)$/.test(u)) return open.length ? 'Mga naka-linya:\n' + open.map((r, i) => (i + 1) + ' ' + r.source_or_description + ' (hanggang ' + r.due + ')').join('\n') + '\nReply TAPOS 1, TAPOS 2...' : 'Wala pong naka-linya ngayon. 👍';
  return interpret(p, text);
}

function handleAdmin(p, text) {
  const u = upper(text); const ruby = personByRole('ruby'); const ron = personByRole('ron');
  if (/^ADD /i.test(text)) {
    const what = text.slice(4).trim();
    if (q('today') === today() && q('phase') !== 'closed' && hourNow() < 12) {
      setQ('pending_adds', (q('pending_adds') ? q('pending_adds') + '\n' : '') + what);
      append('Log', { date: today(), time: now(), person: ruby.name, event: 'ADD', item: what });
      push(ruby.psid, 'Dagdag ni Tiara: ' + what);
      return 'Sent to Ruby.' + (hourNow() >= 10 ? ' She is ' + (hourNow() - 8) + 'h in — this may run past 12.' : '');
    }
    setQ('pending_adds', (q('pending_adds') ? q('pending_adds') + '\n' : '') + what);
    append('Log', { date: today(), time: now(), person: ruby.name, event: 'ADD', item: what });
    return 'Held for tomorrow\'s morning list.';
  }
  if (/^OVERRIDE /i.test(text)) { setQ('override_today', text.slice(9).trim()); if (q('today') === today() && q('phase') !== 'closed') push(ruby.psid, '⚠️ Ibang gawain ngayon (mula kay Tiara):\n' + text.slice(9).trim() + '\nAng block ngayon ay bukas na lang.'); return 'Override set. Block deferred.'; }
  if (/^RON /i.test(text)) {
    const what = text.slice(4).trim(); const due = Utilities.formatDate(new Date(Date.now() + 7 * 86400000), TZ, 'yyyy-MM-dd');
    append('Retainer', { date: today(), person: ron.name, kind: 'REPAIR', source_or_description: what, due: due });
    push(ron.psid, 'Mula kay Tiara: ' + what + '\nHanggang ' + due + ' po. Reply TAPOS pag tapos na. 🙏');
    return 'Sent to Ron, due ' + due + '.';
  }
  if (u === 'WHOLE') {                       // mark today a whole day (₱500)
    const r = rows('Log').filter(x => String(x.date) === today() && x.event === 'START').pop();
    if (r) { setCell('Log', r._row, 'item', 'whole'); return 'Today logged as a whole day (' + money(RATE_WHOLE) + ').'; }
    return 'No day started yet.';
  }
  if (/^LABA SENT/i.test(text)) return sendLaundry(text.replace(/^LABA SENT\s*/i, ''));
  let m = text.match(/^LABA\s*([\d,.]+)\s*(.*)$/i);
  if (m) return chargeLaundry(ruby, parseFloat(m[1].replace(/,/g, '')), m[2] || '');
  if (/^LAUNDRY$/i.test(text)) return laundryReport();
  m = text.match(/^EXTRA\s*([\d,.]+)\s*(.*)$/i);   // one-off helper, e.g. an extra hand for Ron
  if (m) { append('Log', { date: today(), time: now(), person: 'Extra', event: 'EXTRA', amount: parseFloat(m[1].replace(/,/g, '')), item: m[2] || '' }); return 'One-off helper logged: ' + money(parseFloat(m[1].replace(/,/g, ''))) + (m[2] ? ' — ' + m[2] : '') + '.'; }
  if (/^SAHOD/i.test(text)) {                // SAHOD  or  SAHOD 2026-09-08  or  SAHOD SEND
    const send = /SEND/i.test(text); const from = (text.match(/\d{4}-\d{2}-\d{2}/) || [])[0] || '';
    const t = tallyText(ruby, from);
    if (send) { push(ruby.psid, t + '\n\nTama po ba? Reply TAMA, o sabihin niyo kung ano ang mali.'); setState(ruby, 'tally:' + t.replace(/[:\n]/g, ' ')); return 'Sent to Ruby for confirmation:\n\n' + t; }
    return t;
  }
  if (u === 'AWAY') { setQ('tiara_away', 'yes'); return 'Away mode on — photos required.'; }
  if (u === 'BALIK') { setQ('tiara_away', ''); return 'Home — photos off.'; }
  if (u === 'STATUS') return statusText();
  if (/^RUBY /i.test(text)) { push(ruby.psid, text.slice(5)); return 'Relayed to Ruby.'; }
  if (ruby) push(ruby.psid, text);
  return 'Relayed to Ruby. (ADD / OVERRIDE / RON / WHOLE / LABA SENT / LABA / LAUNDRY / EXTRA / SAHOD / AWAY / BALIK / STATUS)';
}

// ---------- laundry ----------
// Price alone can't be judged. Every charge is tied to what was actually sent,
// so ₱/kilo is a real number and drift is visible rather than remembered.

function kilosFrom(txt) {
  const m = String(txt).match(/([\d.]+)\s*(kilo|kilos|kg|k)\b/i);
  return m ? parseFloat(m[1]) : 0;
}

/** Tiara logs what went out. */
function sendLaundry(desc) {
  const kilo = kilosFrom(desc);
  append('Laundry', { date: today(), sent_by: 'Tiara', items: desc, kilo: kilo || '', charged: '', per_kilo: '' });
  return 'Laundry logged as sent' + (kilo ? ' (' + kilo + ' kilo)' : ' — no weight given, so ₱/kilo will be blank') + '.';
}

/** The charge attaches to the most recent uncharged load. */
function chargeLaundry(p, amt, note) {
  const open = rows('Laundry').filter(x => !x.charged).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  let kilo = 0, row;
  if (open) {
    kilo = Number(open.kilo || 0) || kilosFrom(note);
    setCell('Laundry', open._row, 'charged', amt);
    if (kilo) { setCell('Laundry', open._row, 'kilo', kilo); setCell('Laundry', open._row, 'per_kilo', Math.round(amt / kilo)); }
    if (note) setCell('Laundry', open._row, 'note', note);
    row = open;
  } else {
    kilo = kilosFrom(note);
    append('Laundry', { date: today(), sent_by: p.name, items: note, kilo: kilo || '', charged: amt, per_kilo: kilo ? Math.round(amt / kilo) : '', note: note });
  }
  append('Log', { date: today(), time: now(), person: p.name, event: 'LABA', amount: amt, item: note || (kilo ? kilo + ' kilo' : '') });

  // compare against the trailing average, and say so plainly
  const priced = rows('Laundry').filter(x => x.charged && x.per_kilo).slice(-6, -1).map(x => Number(x.per_kilo));
  let flag = '';
  if (kilo && priced.length >= 2) {
    const avg = priced.reduce((a, b) => a + b, 0) / priced.length;
    const rate = amt / kilo;
    if (rate > avg * 1.25) flag = ' ⚠️ ' + Math.round(rate) + '/kilo vs ' + Math.round(avg) + '/kilo average';
  }
  if (p.role !== 'admin') tellTiara('Laundry charge: ' + money(amt) + (kilo ? ' for ' + kilo + ' kilo' : ' (no weight recorded)'), (note || '') + flag);
  return 'Na-record ang laba: ' + money(amt) + (kilo ? ' para sa ' + kilo + ' kilo' : '') + '. ✅';
}

function laundryReport() {
  const L = rows('Laundry').filter(x => x.charged).slice(-10);
  if (!L.length) return 'No laundry logged yet.';
  const total = L.reduce((n, x) => n + Number(x.charged || 0), 0);
  const weighed = L.filter(x => x.per_kilo);
  const lines = L.map(x => x.date + ' — ' + money(x.charged) + (x.kilo ? ' / ' + x.kilo + 'kg = ' + money(x.per_kilo) + 'per kg' : ' (no weight)') + (x.items ? ' · ' + x.items : ''));
  let out = 'Last ' + L.length + ' loads — ' + money(total) + ' total:\n' + lines.join('\n');
  if (weighed.length >= 2) {
    const rates = weighed.map(x => Number(x.per_kilo));
    out += '\n\n₱/kilo: low ' + Math.min.apply(null, rates) + ' · high ' + Math.max.apply(null, rates)
         + ' · avg ' + Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }
  const unweighed = L.length - weighed.length;
  if (unweighed) out += '\n' + unweighed + ' load' + (unweighed === 1 ? '' : 's') + ' had no weight — send LABA SENT <n> kilo when you hand it over.';
  return out;
}

/** Builds the pay tally in the shape Ruby already sends it herself. */
function tallyText(ruby, from) {
  if (!from) {
    const last = rows('Payouts').filter(x => x.person === ruby.name && x.date).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    from = last ? Utilities.formatDate(new Date(new Date(last.date).getTime() + 86400000), TZ, 'yyyy-MM-dd')
                : Utilities.formatDate(new Date(Date.now() - 14 * 86400000), TZ, 'yyyy-MM-dd');
  }
  const L = rows('Log').filter(x => String(x.date) >= from && String(x.date) <= today());
  const starts = L.filter(x => x.event === 'START' && x.person === ruby.name);
  const half = starts.filter(x => x.item !== 'whole').length, whole = starts.filter(x => x.item === 'whole').length;
  const ot = L.filter(x => x.event === 'OT').reduce((n, x) => n + Number(x.hours || 0), 0);
  const laba = L.filter(x => x.event === 'LABA').reduce((n, x) => n + Number(x.amount || 0), 0);
  const gastos = L.filter(x => x.event === 'GASTOS');
  const gTotal = gastos.reduce((n, x) => n + Number(x.amount || 0), 0);
  const extra = L.filter(x => x.event === 'EXTRA').reduce((n, x) => n + Number(x.amount || 0), 0);
  const lines = []; let total = 0;
  if (half) { lines.push(half + ' half day — ' + money(half * RATE_HALF)); total += half * RATE_HALF; }
  if (whole) { lines.push(whole + ' whole day — ' + money(whole * RATE_WHOLE)); total += whole * RATE_WHOLE; }
  if (ot) { lines.push(ot + ' oras OT — ' + money(ot * OT_RATE)); total += ot * OT_RATE; }
  if (laba) { lines.push('Laba — ' + money(laba)); total += laba; }
  if (extra) { lines.push('Dagdag na tulong — ' + money(extra)); total += extra; }
  if (gTotal) { lines.push('Gamit na binili niyo — ' + money(gTotal) + (gastos.length ? ' (' + gastos.map(x => x.item).filter(Boolean).join(', ') + ')' : '')); total += gTotal; }
  if (!lines.length) return 'Wala pang record simula ' + from + '.';
  return 'Record ko po simula ' + from + ':\n' + lines.join('\n') + '\n————————\nTOTAL — ' + money(total);
}

function handleState(p, text) {
  const st = p.state.split(':'); const u = upper(text);
  if (st[0] === 'issue') {
    if (st[1] === 'type') { const t = ({ 1: 'Sira', 2: 'Kailangan ayusin', 3: 'Kulang na gamit', 4: 'Iba pa' })[u]; if (!t) return issueTypePrompt(); setState(p, 'issue:desc:' + t); return 'Ano po? Pwede ring litrato.'; }
    if (st[1] === 'desc') { setState(p, 'issue:urg:' + st[2] + ':' + text.replace(/:/g, ' ')); return 'Gaano kadali kailangan?\n1 Ngayon na\n2 Ngayong linggo\n3 Kahit kailan'; }
    if (st[1] === 'urg') {
      const urg = ({ 1: 'Now', 2: 'This week', 3: 'Whenever' })[u]; if (!urg) return '1, 2, o 3 po.';
      append('Issues', { id: Utilities.getUuid().slice(0, 8), reported: now(), person: p.name, type: st[2], description: st.slice(3).join(':'), urgency: urg, status: 'New' });
      setState(p, ''); if (urg === 'Now') tellTiara('URGENT from ' + p.name, st[2] + ': ' + st.slice(3).join(':'));
      return 'Salamat! Na-record na po. ✅';
    }
  }
  if (st[0] === 'tally') {
    if (/\b(TAMA|OPO|OO|TAMA PO|OK)\b/i.test(text)) { setState(p, ''); tellTiara(p.name + ' confirmed the tally', st.slice(1).join(':')); return 'Salamat po! ✅'; }
    setState(p, ''); tellTiara(p.name + ' disputes the tally', 'Bot said: ' + st.slice(1).join(':') + '\n\nShe says: ' + text);
    return 'Sige po, sinabi ko na kay Tiara para matingnan. 🙏';
  }
  if (st[0] === 'wala') {
    append('Log', { date: today(), time: now(), person: p.name, event: 'WALA', item: text });
    setQ('wala', 'yes'); setState(p, ''); tellTiara(p.name + ' is out today', text);
    return 'Sige po, ingat. Bukas na lang ang block. 🙏';
  }
  if (st[0] === 'ot') {
    if (st[1] === 'hours') { const h = parseFloat(u); if (!h) return 'Ilang oras po? hal. 2'; setState(p, 'ot:reason:' + h); return 'Bakit po kailangan ng overtime?'; }
    const h = parseFloat(st[2]);
    append('Log', { date: today(), time: now(), person: p.name, event: 'OT', hours: h, reason: text });
    setState(p, ''); return 'Na-record po. ' + h + ' oras OT — ₱' + (h * OT_RATE) + '. ✅';
  }
  setState(p, ''); return 'Sige po.';
}

function issueTypePrompt() { return 'Ano po ang problema?\n1 May sira\n2 Kailangan ayusin\n3 Kulang na sa BODEGA (sabon, bleach...)\n4 Iba pa'; }

function statusText() {
  const b = q('block_today') || blockForToday();
  return 'Today: Block ' + b + (b === 'C' ? ' wk' + cWeek() : '') + ' · phase ' + (q('phase') || 'not started')
    + '\nEveryday ' + qSet('everyday_done').length + '/8 · focus ' + qSet('focus_done').length + '/' + tasks(focusBlockKey(b)).length
    + '\nNext: ' + q('next_block') + ' · C last ' + (q('c_last_done') || 'never') + ' · away ' + (q('tiara_away') || 'no')
    + '\nRon open: ' + rows('Retainer').filter(x => x.kind === 'REPAIR' && !x.completed).map(x => x.source_or_description + ' (due ' + x.due + ')').join('; ');
}

// ---------- scheduled ----------

function morningPush() {           // 07:55 Mon–Fri
  if (!isWorkday()) return; const ruby = personByRole('ruby'); if (!ruby) return;
  push(ruby.psid, startDay(ruby));
}
function arrivalCheck() {          // 08:20 Mon–Fri
  if (!isWorkday()) return;
  const seen = rows('Log').some(r => String(r.date) === today() && r.person === personByRole('ruby').name && r.event !== 'START' && r.event !== 'ADD');
  if (!seen && q('wala') !== 'yes') tellTiara('Ruby hasn\'t checked in', 'No reply by 8:20. Block ' + q('block_today') + ' today.');
}
function noonNudge() {             // 12:00 Mon–Fri
  if (!isWorkday() || q('today') !== today() || q('wala') === 'yes' || q('phase') === 'closed') return;
  const ruby = personByRole('ruby'); const b = q('block_today');
  const open = q('phase') === 'focus' ? openItems(focusBlockKey(b), qSet('focus_done')) : openItems('EVERYDAY', qSet('everyday_done'));
  if (open.length) push(ruby.psid, 'Ate, hindi pa naka-check: ' + open.map(t => t.no).join(' ') + '\n' + open.map(t => t.no + ' ' + t.line.split(' — ')[0]).join('\n') + '\nTapos na po ba?');
}
function closeDay() {              // 18:00 Mon–Fri
  if (q('today') !== today() || q('phase') === 'closed') return;
  const ruby = personByRole('ruby'); const b = q('block_today'); const key = focusBlockKey(b);
  openItems('EVERYDAY', qSet('everyday_done')).forEach(t => append('Log', { date: today(), time: now(), person: ruby.name, event: 'ROOM', block: 'EVERYDAY', item_no: t.no, item: t.line.split(' — ')[0], done: 'not reported' }));
  if (q('focus_sent')) { openItems(key, qSet('focus_done')).forEach(t => append('Log', { date: today(), time: now(), person: ruby.name, event: 'TASK', block: b, item_no: t.no, item: t.line.slice(0, 60), done: 'not reported' })); advanceQueue(b); }
  setQ('phase', 'closed'); setQ('override_today', ''); setQ('pending_adds', '');
  const startRow = rows('Log').filter(x => String(x.date) === today() && x.event === 'START').pop();
  const acted = rows('Log').filter(x => String(x.date) === today() && x.person === ruby.name && x.time);
  const lastHour = acted.length ? Math.max.apply(null, acted.map(x => Number(String(x.time).slice(11, 13)))) : 0;
  if (startRow && startRow.item !== 'whole' && lastHour >= 13) {
    tellTiara('Was today a whole day?', ruby.name + ' was still working at ' + lastHour + ':00. Logged as a half day (' + money(RATE_HALF) + '). Reply WHOLE to change it to ' + money(RATE_WHOLE) + '.');
  }
}
