# Household Management System — Scope

**Status:** Scope only. Nothing built yet.
**Owner:** Tiara
**Users:** 1 owner (you) + 2 workers (cleaner, maintenance worker)
**Worker interface:** Facebook Messenger, Taglish
**Owner interface:** a database/dashboard (Airtable or Notion) + Messenger

---

## 1. The job to be done

Three things, in priority order:

1. **You know what got done.** A dated, per-task record you can look at without asking anyone.
2. **She knows what to do today.** A short daily list pushed to her, not a document she has to go find.
3. **She can tell you what the house needs.** Report a problem or a supply request in under 30 seconds, from Messenger, with a photo.

Everything else (payouts, maintenance schedule) hangs off those three.

**Non-goals:** time tracking / clock-in, surveillance, performance scoring, anything that requires either worker to install an app or make an account.

---

## 2. Design constraints (these drive every decision)

| Constraint | Consequence |
|---|---|
| Workers are not tech people | No logins, no apps, no forms with more than one field at a time. Reply-to-a-message is the only interaction pattern. |
| They already use Messenger and GCash | Those two are the entire worker-facing surface. Nothing else. |
| Phones may be low-end, data may be limited | Text-first. Photos optional, never required to complete a task. |
| Taglish | All worker-facing copy in Taglish. Owner-facing stays English. |
| One household, low volume | ~15–40 events/day. Any tool handles this. Optimize for *zero maintenance*, not scale. |

---

## 3. System shape

```
                  ┌──────────────────────────┐
   Worker         │  FB Messenger (Page)     │        Owner
   (phone)  ◄────►│  daily list / replies    │◄────►  (phone + laptop)
                  └───────────┬──────────────┘
                              │ webhook
                  ┌───────────▼──────────────┐
                  │  Automation layer        │
                  │  (Make.com / n8n / code) │
                  │  - sends daily list      │
                  │  - parses replies        │
                  │  - routes issues         │
                  └───────────┬──────────────┘
                              │
                  ┌───────────▼──────────────┐
                  │  Database (Airtable)     │
                  │  5 tables, 1 dashboard   │
                  └──────────────────────────┘
```

Three moving parts. The database is the source of truth; Messenger is a dumb pipe; the automation layer is glue.

---

## 4. Data model (5 tables)

### `Tasks` — the master list of everything that can be done
| Field | Type | Notes |
|---|---|---|
| Task name (EN) | text | for you |
| Task name (TL) | text | what she sees |
| Area | select | Kitchen, CR, Sala, Bedrooms, Laundry, Outdoor, Whole house |
| Frequency | select | Daily, Mon/Wed/Fri, Weekly, Fortnightly, Monthly, Quarterly, Annual |
| Day(s) | multi-select | which weekday(s) it lands on |
| Assigned to | link → People | cleaner or maintenance |
| Est. minutes | number | used to sanity-check the daily load |
| Photo required | checkbox | default off; on for things like "linen changed" |
| Active | checkbox | lets you retire a task without deleting history |

This is where your existing Cowork day-by-day cleaning list gets loaded. **Paste it in and I'll convert it into rows.**

### `Task Log` — one row per task per day
| Field | Type |
|---|---|
| Date | date |
| Task | link → Tasks |
| Person | link → People |
| Status | Done / Not done / Partial / Skipped (with reason) |
| Reported at | timestamp |
| Photo | attachment |
| Note | text (her words, verbatim) |

Generated fresh each morning by the automation. This table *is* your answer to "what has she done".

### `Issues` — her inbox to you
| Field | Type |
|---|---|
| Reported | timestamp |
| Reporter | link → People |
| Type | Broken / Needs repair / Supply low / Other |
| Description | text (verbatim, Taglish) |
| Photo | attachment |
| Urgency | Now / This week / Whenever — *she* sets this, one tap |
| Status | New / Acknowledged / Scheduled / Done / Won't fix |
| Your note | text |
| Cost | currency |
| Linked payout | link → Payouts |

### `Payouts` — GCash and cash out the door
| Field | Type |
|---|---|
| Date | date |
| Person | link → People |
| Type | Salary / Advance / Reimbursement / Supply money / Bonus / 13th month |
| Amount | currency |
| Method | GCash / Cash |
| GCash ref no. | text |
| Covers period | text |
| Linked issue | link → Issues |
| Receipt | attachment |
| Confirmed by worker | checkbox — she replies "received" in Messenger, automation ticks it |

That last field is the one that prevents arguments. Every peso has a two-sided record.

### `People`
Name, role, Messenger PSID, GCash number, GCash name, start date, rate, pay schedule, emergency contact, active.

---

## 5. Worker flows (Messenger, Taglish)

### 5.1 Morning list — 7:00 AM daily

```
Magandang umaga, Ate! 🌞
Ito ang listahan para ngayong Lunes:

1. Walisin at mapin lahat ng kwarto
2. Linisin CR sa taas
3. Labhan ang bed sheets (kunan ng litrato pagkatapos)
4. Punasan ang mga bintana sa sala

Reply "TAPOS 1" kapag tapos na ang #1.
Reply "TAPOS LAHAT" kapag tapos na lahat.
Kung may problema, reply "REPORT".
```

Numbered, max ~8 items, one screen. Numbers are how she reports — she never types a task name.

### 5.2 Reporting done

Accepted (all parsed case-insensitively, with typo tolerance):
- `TAPOS 1` / `tapos 1 2 4` / `done 3` → marks those items done
- `TAPOS LAHAT` / `done all` → marks everything done
- `HINDI 3 — walang tubig` → marks #3 not done with her reason
- A photo sent right after a `TAPOS n` attaches to that task
- Anything unrecognized → bot replies *"Pasensya Ate, hindi ko naintindihan. Reply po ng numero, hal. TAPOS 2"* and forwards the raw text to you anyway, so nothing is lost

**Design rule: the bot never blocks her.** If parsing fails, the message still lands in your inbox as a raw note. She is never stuck in a dead end.

### 5.3 Reporting an issue

```
She: REPORT
Bot: Ano po ang problema?
     1 — May sira
     2 — Kailangan ayusin
     3 — Kulang na ang gamit (sabon, bleach, etc.)
     4 — Iba pa

She: 3
Bot: Ano pong kulang? Pwede ring litrato.
She: Ubos na ang Zonrox at dishwashing liquid
Bot: Gaano kadali kailangan?
     1 — Ngayon na
     2 — Ngayong linggo
     3 — Kahit kailan
She: 2
Bot: Salamat Ate! Na-record na po. ✅
```

Four taps, plain language, no forms. Lands in `Issues` as a new row and pings you.

### 5.4 End of day — 6:00 PM

If anything is still unmarked:
```
Ate, may 2 pang hindi naka-check:
3. Labhan ang bed sheets
4. Punasan ang mga bintana

Tapos na po ba? Reply TAPOS 3 4, o HINDI kung hindi natapos.
```
One nudge, then it closes the day. Unmarked items log as **Not reported** — distinct from *Not done*, so your data stays honest.

### 5.5 Payout confirmation
After you log a GCash payout: *"Ate, na-send ko na po ang ₱3,500 sa GCash ninyo para sa Nov 1–15. Reply RECEIVED kapag na-receive niyo na po."* → ticks the confirmation box.

---

## 6. Owner flows

- **Daily digest, 7:00 PM** (Messenger to you, or email): done / not done / not reported counts, new issues, anything urgent.
- **Issues inbox** — a filtered view: New first, sorted by urgency. Two-tap actions: Acknowledge, Schedule, Done.
- **Week view** — grid of task × day, green/red/grey. This is the "what has she actually done" picture, at a glance.
- **Payout ledger** — running total per person per month, unconfirmed payouts flagged.
- **Maintenance calendar** — the low-frequency recurring stuff surfaces as a task on its due day like anything else (pest control, aircon cleaning, water tank, filters, gutter, termite inspection, fire extinguisher check).

---

## 7. Risks and honest caveats

**The big one: Messenger Platform messaging rules.** A Facebook Page can only message a person freely within 24 hours of *their* last message. A 7 AM daily push, unprompted, is outside that window. Real options:

1. **She opens the window.** She sends a quick `GM` each morning; the bot replies with the list. Costs one message from her, fully compliant, zero approvals. **Recommended.**
2. **Recurring Notifications API** — she opts in once by tapping a button, you then get a daily send permission. Cleaner UX, requires app setup and the opt-in to be renewed.
3. **Human Agent tag** — extends the window to 7 days for genuine customer-service replies. Applies to *replies*, not scheduled broadcasts. Don't lean on it.
4. **Switch channel.** Viber and WhatsApp both have cleaner template messaging in PH. If Messenger's rules bite, Viber is the pragmatic fallback and is widely used by household staff here.

Decide this before building. It determines whether you need a Meta app review at all.

**Other risks:**
- *She stops replying.* Expect this in week 2–3. Mitigation: the system must be visibly useful to *her* (she gets supplies faster, gets paid on a record, stops being asked to repeat herself). Frame it that way when you introduce it, not as monitoring.
- *Photo fatigue.* Keep `Photo required` on fewer than 5 tasks total.
- *Over-scoping the task list.* If the daily list runs past 8 items she will stop reading it. Group into one line where possible.
- *Two workers, one Page.* The bot must identify who's messaging by PSID and serve the right list. Trivial, but easy to forget.
- *GCash has no API for personal accounts.* Payouts are logged manually by you; her `RECEIVED` reply is the second side of the record. Don't plan on automation here.

---

## 8. Build options

| | Effort | Monthly | Notes |
|---|---|---|---|
| **A. Airtable + Make.com + Messenger bot** | 2–3 days | ~$20–35 | Recommended. Airtable for data/views, Make for the flows, one Meta app for the Page. Everything visual, you can edit it yourself. |
| **B. Notion + n8n (self-hosted)** | 4–5 days | ~$5 | Cheaper, more fiddly. Notion is worse than Airtable at this shape of data. |
| **C. Custom app in this repo** | 2–3 weeks | ~$10 hosting | Full control, you maintain it forever. Not worth it for one household. |
| **D. Manual v0 — no bot** | 1 hour | ₱0 | You paste the day's list into Messenger each morning yourself; she replies in plain text; you log it. **Run this for two weeks first.** |

**Strong recommendation: do D before A.** Two weeks of manual operation tells you whether she'll reply at all, what she actually types, and which tasks are wrong — for the price of five minutes a morning. Every parsing rule in section 5.2 should be written from her real messages, not guessed.

---

## 9. Phasing

- **Phase 0 (2 weeks, manual):** Daily list pasted by hand. Log replies in a spreadsheet. Collect her actual phrasing. Fix the task list.
- **Phase 1 (build, ~2 days):** Airtable base + the five tables + your three views. Still manual sending.
- **Phase 2 (~1 day):** Messenger bot — morning list, `TAPOS` parsing, evening nudge.
- **Phase 3 (~half day):** `REPORT` flow, issues inbox, your daily digest.
- **Phase 4 (~half day):** Payouts + `RECEIVED` confirmation + maintenance schedule rows.

---

## 10. Open questions for you

1. **Your day-by-day cleaning list** — paste it and it becomes the `Tasks` table.
2. Two separate workers, or is the cleaner also the maintenance person? (Changes routing and whether you need two daily lists.)
3. Does she work 7 days or 6? Live-in or come-in? What time does she start?
4. Is she paid weekly, fortnightly, or monthly — and is the rate fixed or does it move with days worked?
5. Do you want the maintenance worker in the same system at all, or is he ad-hoc/on-call? (On-call changes his flow to issue-driven, no daily list.)
6. Messenger vs Viber — any preference, given section 7?
7. Do you want her to see her own payout history on request (`SAHOD` → last 3 payouts)? Good for trust, trivial to add.
