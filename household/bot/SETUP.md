# Rosie — build guide

Rosie is the household bot: she sends the day's list, takes the replies, keeps the pay record, and learns how Ruby and Ron actually write.

Stack: Facebook Page → Meta app (dev mode) → Cloudflare Worker (glue) → Google Apps Script (bound to the sheet) → Google Sheet → morning brief.
Cost: ₱0. (ManyChat alternative at the end, ≈ US$15/mo, if you'd rather not touch the Meta developer console.)

## 1. The sheet (15 min)

Create a Google Sheet named **Bahay Cemento** on the `personal` account (the brief reads that account). Tabs and header rows, exactly:

| Tab | Headers (row 1) |
|---|---|
| `People` | `psid` · `name` · `role` · `gcash` · `state` |
| `Tasks` | `block` · `no` · `line` — import `tasks.csv` |
| `Queue` | `key` · `value` — seed rows below |
| `Log` | `date` · `time` · `person` · `event` · `block` · `item_no` · `item` · `done` · `hours` · `amount` · `reason` · `photo_url` |
| `Issues` | `id` · `reported` · `person` · `type` · `description` · `urgency` · `status` · `note` · `photo_url` |
| `Retainer` | `date` · `person` · `kind` · `source_or_description` · `due` · `completed` · `parts_cost` · `photo_url` — Ron's tasks from you; add `DAY` rows by hand if you want to count his retainer days |
| `Payouts` | `date` · `person` · `type` · `amount` · `method` · `ref` · `confirmed` · `period` |
| `Laundry` | `date` · `sent_by` · `items` · `kilo` · `charged` · `per_kilo` · `note` |
| `Phrasebook` | `phrase` · `intent` · `note` · `added` · `source` — starts empty; Rosie fills it as she learns. **Edit or delete rows to correct her.** |

`Queue` seed:
```
next_block    A
c_week        1
c_last_done   (blank)
e_count       0
tiara_away    (blank)
```
`People` roles: `ruby`, `ron`, `admin` (you). PSIDs come from ManyChat's contact view after each person messages the Page once.

## 2. Apps Script (10 min)

Extensions → Apps Script. Paste `Code.gs`. Project properties → Script properties:
- `PAGE_TOKEN` — from step 3
- `ANTHROPIC_API_KEY` — optional, turns on the learning layer (see §7). Without it Rosie forwards anything the rules miss, which is safe but never improves.
- `TIARA_EMAIL` — tiaramejos@gmail.com
- `SHARED_SECRET` — any long random string
- `MESSAGE_TAG` — leave blank

Deploy → New deployment → Web app → Execute as **me**, access **Anyone**. Copy the URL.

Triggers (clock icon), all time-driven, timezone Asia/Manila:

| Function | When |
|---|---|
| `morningPush` | Mon–Fri 7:55 |
| `arrivalCheck` | Mon–Fri 8:20 |
| `noonNudge` | Mon–Fri 12:00 |
| `closeDay` | Mon–Fri 18:00 |

## 3. Meta app + Worker (45 min)

**Meta app** — developers.facebook.com → Create app → Business type. Add the **Messenger** product.
1. Messenger settings → connect the Page → generate a **Page access token**. Save as `PAGE_TOKEN` in both the script properties and the Worker.
2. App roles → **Testers** → add Ruby's and Ron's Facebook accounts. They each accept the invite (Facebook → Settings → Apps/Developer notifications). You're an admin already. *The app stays in development mode — no review needed for people with roles.*
3. Leave the webhook for after the Worker exists.

**Cloudflare Worker** — dash.cloudflare.com → Workers → Create → paste `worker.js`. Settings → Variables:
- `VERIFY_TOKEN` — any string
- `PAGE_TOKEN` — same token as above
- `SCRIPT_URL` — the Apps Script web app URL
- `SHARED_SECRET` — same as the script property

Deploy; copy the Worker URL.

**Back in Meta** — Messenger → Webhooks → Add callback URL = the Worker URL, verify token = `VERIFY_TOKEN`. Subscribe the Page to `messages`. Done.

The Worker has no logic. It receives the Messenger event, POSTs it to the script, and relays whatever text the script returns. Everything editable lives in the sheet.

**Daily 7:55 push:** in dev mode the Page can message testers directly, but Meta's 24-hour window still applies to unprompted sends. If the 7:55 message fails on days after Ruby was silent, set `MESSAGE_TAG` to `CONFIRMED_EVENT_UPDATE` in script properties — a scheduled work day is a confirmed event. The 8:20 `arrivalCheck` email to you works regardless.

### ManyChat instead (if preferred)
Skip the Meta app and Worker. ManyChat Pro → one Catch-all flow → External Request to the script URL with body `{"secret":…,"psid":"{{user_id}}","text":"{{last_input_text}}","attachment_url":…}` → Dynamic Content from the same URL. Swap `push()` in `Code.gs` for ManyChat's `sendContent` endpoint. ManyChat bills per Page; if you buy it anywhere, Kahana Baler's page is where it earns its keep.

## 4. First day

1. You, Ruby, Ron each message the Page once. The Worker logs each event; PSIDs appear in the Worker's live logs (or in the Apps Script "Unknown sender" email you'll get). Copy them into `People`.
2. Message the Page `STATUS` — you should get today's block and Ron's balance.
3. Have Ruby send `LISTA`. She should get the everyday list. She replies `1`. She should get *"Salamat! Natitira: 2 3 4 5 6 7 8"*.
4. Send `RON test lang` from your account. Ron should receive it; he replies `TAPOS`; you get an email.
5. `AWAY` / `BALIK` from you — confirm the reply.

## 5. What each person sees

**Ruby, 7:55**
```
Magandang umaga Ruby! ☀️
Ngayon: BLOCK B — Mga Banyo (page 4)

EVERYDAY muna:
1 SAHIG — vacuum LAHAT muna (buhok ng aso) tapos mop: …
2 BUONG BAHAY — sapot sa kisame; window sills at door tracks; …
3 KUSINA — …
4 MASTER CR — …
5 GUEST CR — …
6 SALA at HAGDAN — …
7 YOGA DECK — walisin; pagpagin ang mats
8 PORCH — walisin; doormat; sapatos; mesa bench stool

Reply ng numero pag tapos, hal: 1 3 5
TAPOS LAHAT · REPORT · WALA · OT
```
Then, when all 8 are in: the Block B list, numbered 1–12. Then *"Tapos na lahat — salamat Ruby! ✅"* (plus the photo line if you're away).

Ruby's words: numbers · `TAPOS LAHAT` · `REPORT` · `WALA` · `OT 2` · `GASTOS 100 Zonrox` · `LABA 700` · `SAHOD` · `LISTA` · `WALANG LITRATO`. She also writes in full sentences — `opo / tapos na po` ticks everything, and *"di ko po natapos yung…"* is logged and forwarded. Anything else goes to you.

**Ron**: nothing on a schedule. When you send `RON …` he gets it with a due date; he replies `TAPOS` (or `TAPOS 2` if several are open) to close it, `LISTA` to see what's open. Anything else is forwarded to you.

**You**: `ADD …` · `OVERRIDE …` · `RON …` · `WHOLE` (mark today ₱500) · `LABA 700` · `ASAWA 500` · `LABA SENT 5 kilo` (log what you hand over) · `LAUNDRY` (last 10 loads + ₱/kilo range) · `SAHOD` (see the tally) · `SAHOD SEND` (send it to Ruby to confirm) · `AWAY` · `BALIK` · `STATUS` · `RUBY …`. Plain text is relayed to Ruby.

**Your email/Messenger gets**: no check-in by 8:20 · any `WALA` with its reason · any urgent `REPORT` · anything unrecognised.

## 6. Editing later

- Task wording: edit the `Tasks` tab. Takes effect next message.
- Rates: `OT_RATE` at the top of `Code.gs`.
- Block C overdue threshold: `C_OVERDUE_DAYS`.
- Skipping the queue by hand: edit `Queue.next_block`.


## 7. The learning layer

Every inbound message goes through three tiers:

1. **Rules** — numbers, `TAPOS`, `REPORT`, `OT 2`. Free, instant, deterministic. Most messages stop here.
2. **Phrasebook** — a sheet tab of phrase → intent, matched on normalised text. Free. Grows over time.
3. **Claude** — only when the first two miss. It *classifies*; the same deterministic handlers still do the acting, so no task or peso is ever written on a guess. Low confidence always goes to you instead.

When Claude resolves something, Rosie writes the phrasing into `Phrasebook`, so **that phrasing is free forever after.** The bill shrinks as she learns.

**Correcting her:** open the `Phrasebook` tab and fix or delete the row. That's the whole training loop — readable, editable, no black box.

**Cost:** `claude-opus-5` at $5/$25 per million tokens, ~1K in and a few hundred out per call, firing only on messages the rules miss. Expect roughly **₱150–350/month at first, falling** as the phrasebook fills. Leave `ANTHROPIC_API_KEY` unset to run at ₱0 with tier 3 off.

**Safety:** Claude sees only the one message plus the phrasebook — never your calendar, email or the rest of the sheet. It cannot send messages or write rows itself; it returns a classification and Rosie's own code decides what happens.
