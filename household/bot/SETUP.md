# Bahay Cemento bot — build guide

Stack: Facebook Page → ManyChat Pro → Google Apps Script (bound to the sheet) → Google Sheet → morning brief.
Cost: ManyChat Pro ≈ US$15/mo. Everything else ₱0.

## 1. The sheet (15 min)

Create a Google Sheet named **Bahay Cemento** on the `personal` account (the brief reads that account). Tabs and header rows, exactly:

| Tab | Headers (row 1) |
|---|---|
| `People` | `psid` · `name` · `role` · `gcash` · `state` |
| `Tasks` | `block` · `no` · `line` — import `tasks.csv` |
| `Queue` | `key` · `value` — seed rows below |
| `Log` | `date` · `time` · `person` · `event` · `block` · `item_no` · `item` · `done` · `hours` · `reason` · `photo_url` |
| `Issues` | `id` · `reported` · `person` · `type` · `description` · `urgency` · `status` · `note` · `photo_url` |
| `Retainer` | `date` · `person` · `kind` · `source_or_description` · `due` · `completed` · `parts_cost` · `photo_url` |
| `Payouts` | `date` · `person` · `type` · `amount` · `method` · `ref` · `confirmed` · `period` |

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
- `MANYCHAT_TOKEN` — ManyChat → Settings → API
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
| `monthlyRon` | Daily 8:00 (exits unless it's the 1st) |

## 3. ManyChat (30 min)

1. Connect the Page. Settings → Growth Tools → **Ref URL** — the link you'll send Ruby and Ron to open the chat.
2. One flow, **Catch-all**, set as the Default Reply for any message:
   - **External Request** → POST to the web app URL, JSON body:
     ```json
     {"secret":"<SHARED_SECRET>","psid":"{{user_id}}","name":"{{full_name}}",
      "text":"{{last_input_text}}","attachment_url":"{{last_input_attachment_url}}"}
     ```
     (if your ManyChat version lacks the attachment field, map the last attachment via a custom field and pass that)
   - **Dynamic Content** step → same URL, same body. The script's JSON reply renders as the message.
   - That's the whole flow. All logic lives in the sheet.
3. Settings → Messenger → enable the opt-in for daily messages (ManyChat labels it under Recurring/Marketing messages; follow their current wizard). Send the opt-in to Ruby once; she taps once. Without it, the 7:55 push only works inside 24h of her last message — the `arrivalCheck` email still fires either way, so silence is never invisible.

## 4. First day

1. You, Ruby, Ron each message the Page once. Copy PSIDs into `People`.
2. Message the Page `STATUS` — you should get today's block and Ron's balance.
3. Have Ruby send `LISTA`. She should get the everyday list. She replies `1`. She should get *"Salamat! Natitira: 2 3 4 5 6 7 8"*.
4. Have Ron send `4`. He should get his balance.
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

Ruby's words: numbers · `TAPOS LAHAT` · `REPORT` · `WALA` · `OT 2` · `LISTA` (resend) · `WALANG LITRATO`. Anything else is forwarded to you.

**Ron**: `1 PICKUP` · `2 TAPOS` · `3 PROBLEMA` · `4 BALANCE` · `FULL DAY`. Anything else forwarded to you.

**You**: `ADD …` · `OVERRIDE …` · `RON …` · `AWAY` · `BALIK` · `STATUS` · `RUBY …` (relay). Plain text is relayed to Ruby.

**Your email/Messenger gets**: no check-in by 8:20 · any `WALA` with its reason · any urgent `REPORT` · anything unrecognised.

## 6. Editing later

- Task wording: edit the `Tasks` tab. Takes effect next message.
- Rates: `OT_RATE` at the top of `Code.gs`.
- Block C overdue threshold: `C_OVERDUE_DAYS`.
- Skipping the queue by hand: edit `Queue.next_block`.
