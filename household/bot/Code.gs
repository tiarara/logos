/**
 * Bahay Cemento — household bot logic.
 * Runs as a Google Apps Script bound to the "Bahay Cemento" sheet.
 * The Cloudflare Worker (worker.js) calls doPost() with each inbound message and
 * relays the returned messages. Time-driven triggers handle the morning list, the arrival
 * check, the noon nudge, the end-of-day close, and Ron's monthly balance.
 *
 * Script Properties (File > Project properties > Script properties):
 *   PAGE_TOKEN       Messenger Page access token (from the Meta app)
 *   TIARA_EMAIL      where silence alerts go
 *   SHARED_SECRET    must match the header ManyChat sends
 *   MESSAGE_TAG      optional; leave blank unless Meta policy needs one
 */

const TZ = 'Asia/Manila';
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
  const head = 'Magandang umaga ' + ruby.name + '! ☀️\nNgayon: BLOCK ' + b + ' — ' + BLOCKS[b].name + ' (page ' + BLOCKS[b].page + ')'
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
  append('Log', { date: today(), time: now(), person: ruby.name, event: 'START', block: b });
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

const NUMS = /^(\d+[\s,]*)+$/;
function upper(t) { return t.toUpperCase().replace(/\s+/g, ' '); }

function handleRuby(p, text) {
  const u = upper(text);
  if (q('today') !== today()) return startDay(p);
  if (NUMS.test(u)) return tick(p, u.split(/[\s,]+/).map(Number));
  if (/^(TAPOS LAHAT|DONE ALL|LAHAT)$/.test(u)) {
    const phase = q('phase'); const key = phase === 'focus' ? focusBlockKey(q('block_today')) : 'EVERYDAY';
    return tick(p, tasks(key).map(t => t.no));
  }
  if (/^(REPORT|3)$/.test(u)) { setState(p, 'issue:type'); return issueTypePrompt(); }
  if (/^(WALA|WALA AKO|4)$/.test(u)) { setState(p, 'wala:reason'); return 'Salamat sa pagsabi. Bakit po?'; }
  if (/^OT\s*(\d+(\.\d+)?)?$/.test(u)) {
    const h = (u.match(/\d+(\.\d+)?/) || [])[0];
    if (!h) { setState(p, 'ot:hours'); return 'Ilang oras po ang OT?'; }
    setState(p, 'ot:reason:' + h); return 'Bakit po kailangan ng overtime?';
  }
  if (/^WALANG LITRATO$/.test(u)) { append('Log', { date: today(), time: now(), person: p.name, event: 'PHOTO', done: 'no' }); return 'Sige po, na-record. ✅'; }
  if (/^(LISTA|LIST|ULIT)$/.test(u)) return q('phase') === 'focus' ? focusText(q('block_today')) : morningText(p);
  tellTiara('Note from ' + p.name, text);
  return 'Naipasa ko kay Tiara. Para sa listahan, reply LISTA.';
}

function handleRon(p, text) {
  const u = upper(text);
  if (/^(PICKUP|1)$/.test(u)) { setState(p, 'pickup:source'); return 'Saan po galing?'; }
  if (/^(TAPOS|2)$/.test(u)) {
    const open = rows('Retainer').filter(r => r.kind === 'REPAIR' && !r.completed).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!open.length) { setState(p, 'day:desc'); return 'Walang nakalistang repair. Full day po ba ngayon? Ano ang ginawa?'; }
    setCell('Retainer', open[0]._row, 'completed', today());
    return 'Tapos na: ' + open[0].source_or_description + ' ✅ Salamat Ron!';
  }
  if (/^(FULL DAY|DAY)$/.test(u)) { setState(p, 'day:desc'); return 'Ano po ang ginawa ngayong full day?'; }
  if (/^(REPORT|PROBLEMA|MAY PROBLEMA|3)$/.test(u)) { setState(p, 'issue:type'); return issueTypePrompt(); }
  if (/^(BALANCE|4)$/.test(u)) return ronBalance();
  tellTiara('Note from ' + p.name, text);
  return 'Naipasa ko kay Tiara.\n1 PICKUP · 2 TAPOS · 3 PROBLEMA · 4 BALANCE';
}

function handleAdmin(p, text) {
  const u = upper(text); const ruby = personByRole('ruby'); const ron = personByRole('ron');
  if (/^ADD /.test(u)) {
    const what = text.slice(4).trim();
    if (q('today') === today() && q('phase') !== 'closed' && hourNow() < 12) {
      setQ('pending_adds', (q('pending_adds') ? q('pending_adds') + '\n' : '') + what);
      append('Log', { date: today(), time: now(), person: ruby.name, event: 'ADD', item: what });
      push(ruby.psid, 'Dagdag ni Tiara: ' + what);
      return 'Sent to Ruby.' + (hourNow() >= 10 ? ' She is ' + (hourNow() - 8) + 'h in — this may run past 12.' : '');
    }
    setQ('pending_adds', (q('pending_adds') ? q('pending_adds') + '\n' : '') + what);
    append('Log', { date: q('today') === today() ? today() : 'next', time: now(), person: ruby.name, event: 'ADD', item: what });
    return 'Held for tomorrow\'s morning list.';
  }
  if (/^OVERRIDE /.test(u)) { setQ('override_today', text.slice(9).trim()); if (q('today') === today() && q('phase') !== 'closed') push(ruby.psid, '⚠️ Ibang gawain ngayon (mula kay Tiara):\n' + text.slice(9).trim() + '\nAng block ngayon ay bukas na lang.'); return 'Override set. Block deferred.'; }
  if (/^RON /.test(u)) {
    const what = text.slice(4).trim(); const due = Utilities.formatDate(new Date(Date.now() + 7 * 86400000), TZ, 'yyyy-MM-dd');
    append('Retainer', { date: today(), person: ron.name, kind: 'REPAIR', source_or_description: what, due: due });
    push(ron.psid, 'Mula kay Tiara: ' + what + '\nHanggang ' + due + ' po. Reply TAPOS pag tapos na.');
    return 'Sent to Ron, due ' + due + '.';
  }
  if (u === 'AWAY') { setQ('tiara_away', 'yes'); return 'Away mode on — photos required.'; }
  if (u === 'BALIK') { setQ('tiara_away', ''); return 'Home — photos off.'; }
  if (u === 'STATUS') return statusText();
  if (/^RUBY /.test(u)) { push(ruby.psid, text.slice(5)); return 'Relayed to Ruby.'; }
  if (ruby) push(ruby.psid, text);
  return 'Relayed to Ruby. (ADD / OVERRIDE / RON / AWAY / BALIK / STATUS)';
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
  if (st[0] === 'pickup') { append('Retainer', { date: today(), person: p.name, kind: 'PICKUP', source_or_description: text }); setState(p, ''); return 'Salamat Ron! Na-record: ' + text + ' ✅'; }
  if (st[0] === 'day') { append('Retainer', { date: today(), person: p.name, kind: 'DAY', source_or_description: text, completed: today() }); setState(p, ''); return 'Na-record ang full day. ' + ronBalance(); }
  setState(p, ''); return 'Sige po.';
}

function issueTypePrompt() { return 'Ano po ang problema?\n1 May sira\n2 Kailangan ayusin\n3 Kulang na gamit (sabon, bleach...)\n4 Iba pa'; }

function ronBalance() {
  const m = today().slice(0, 7); const r = rows('Retainer').filter(x => String(x.date).slice(0, 7) === m);
  const days = r.filter(x => x.kind === 'DAY').length, pick = r.filter(x => x.kind === 'PICKUP').length;
  const open = rows('Retainer').filter(x => x.kind === 'REPAIR' && !x.completed);
  return 'Ngayong buwan: ' + days + ' of 4 full days · ' + pick + ' pickups · ' + open.length + ' open repair' + (open.length === 1 ? '' : 's')
    + (open.length ? ':\n' + open.map(x => '• ' + x.source_or_description + ' (hanggang ' + x.due + ')').join('\n') : '');
}
function statusText() {
  const b = q('block_today') || blockForToday();
  return 'Today: Block ' + b + (b === 'C' ? ' wk' + cWeek() : '') + ' · phase ' + (q('phase') || 'not started')
    + '\nEveryday ' + qSet('everyday_done').length + '/8 · focus ' + qSet('focus_done').length + '/' + tasks(focusBlockKey(b)).length
    + '\nNext: ' + q('next_block') + ' · C last ' + (q('c_last_done') || 'never') + ' · away ' + (q('tiara_away') || 'no')
    + '\nRon — ' + ronBalance();
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
}
function monthlyRon() {            // 08:00 on the 1st
  if (today().slice(8) !== '01') return; const ron = personByRole('ron'); if (!ron) return;
  push(ron.psid, 'Bagong buwan po Ron — 4 full days at ~8 pickups ulit. Kailan po kayo pwede sa first full day?\n1 PICKUP · 2 TAPOS · 3 PROBLEMA · 4 BALANCE');
}
