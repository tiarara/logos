# Household Management System — Scope

**Property:** Cemento, Baler, Aurora · **Owner:** Tiara · **Helper:** Ruby (Mon–Fri, 8:00–12:00)
**Status:** Scope only. The printed checklist (`CHECKLIST.md`) is the first deliverable and can ship now.

---

## 1. The core decision

**The laminated checklist is the operating system. The digital layer is reporting only.**

The earlier draft of this scope had a Messenger bot pushing a 30-item task list every morning. With the real task inventory in hand, that is clearly wrong: the everyday block alone is 25+ items, and no one reads that on a phone at 8 AM. Ruby already has a better interface for *what to do* — a laminated page on the wall she can tick with a marker.

So the split is:

| Question | Answered by |
|---|---|
| What do I do today? | The laminated page (physical, offline, zero friction) |
| Did it get done? | Messenger — 4 checkpoints, not 30 |
| What does the house need? | Messenger — `REPORT` flow |
| Was I paid? | Messenger — `RECEIVED` confirmation |

This collapses the build considerably and makes it far more likely to survive past week three.

---

## 2. What ships first (no build required)

`CHECKLIST.md` — the merged artifact. The August 2026 day structure and bilingual tick-box format, carrying the full approved task inventory. 8 pages:

1. Rules + safety + product guide
2. EVERY DAY block (identical all five days)
3. Monday — Kitchen week
4. Tuesday — Bathrooms week
5. Wednesday — Monthly rotation block (Weeks 1–4)
6. Thursday — Bedrooms + yoga deck
7. Friday — Living room + porch
8. Calendar page (wet-erase date boxes)

Print once, laminate all eight, wet-erase marker. Nothing in it needs reprinting.

**Next step:** regenerate as `.docx` via the existing Node + `docx` script pattern, replacing the stale MWF header. Say the word and I'll write the script.

---

## 3. The load problem — read this before printing

Every task from the inventory is placed, but the arithmetic does not fit a 4-hour day on two of the four monthly weeks.

**Every-day block: ~150 min** (vacuum 25, mop 25, kitchen 30, master bath 12, guest bath 10, living/stairs 10, porch 8, deck 5, cobwebs 5, sills/tracks 8, plants 5, dog bowls 3, bins 5)

With ~15 min setup and pack-up, that leaves **roughly 75 minutes per day for focus work.**

| Day | Focus block | Est. | Verdict |
|---|---|---|---|
| Mon — Kitchen | 9 tasks | ~82 min | Tight but fine |
| Tue — Bathrooms | 13 tasks | ~83 min | Tight but fine |
| Thu — Bedrooms + deck | 10 tasks | ~82 min | Tight; bedding runs in the machine in background |
| Fri — Living + porch | 8 tasks | ~73 min | Fine (~98 on screen weeks — Weeks 1 and 3) |
| **Wed — Week 1** | Air + fans | ~60 min | Fine |
| **Wed — Week 2** | Bathrooms deep | ~85 min | Tight but fine |
| **Wed — Week 3** | Kitchen deep | **~120 min** | ❌ Does not fit |
| **Wed — Week 4** | Move everything | **~225 min** | ❌ Does not fit, not even close |

**Recommendation: Weeks 3 and 4 Wednesdays become whole days (8:00–4:00).** Your brief already anticipated this for Week 4; Week 3 needs it too, driven almost entirely by the fridge interior (~45 min) plus pulling the fridge and cart out (~20 min).

If a whole day isn't possible in a given month, split rather than rush — a Week 4 done badly is worse than a Week 4 done over two half-days, because the failure mode you're defending against is exactly "cleaned around it, not under it."

Both weeks are marked ⚠️ **WHOLE DAY / BUONG ARAW** on the Wednesday page so the expectation is visible to Ruby, not just to you.

---

## 4. Three structural changes I made to the inventory

Everything is placed, nothing reworded. Three allocation decisions worth knowing:

1. **"Wipe walls room by room" split across four days instead of one weekly block.** Kitchen walls Monday, bathroom walls Tuesday, bedroom walls Thursday, living room + porch walls Friday — ~10 min each. The inventory says *room by room*; doing it as one 40-minute house-wide sweep would have broken Wednesday, which already carries the monthly block.

2. **Yoga deck weekly work split Tue/Thu.** Rattan furniture and railings went to Tuesday (upstairs day, and the bathroom block finished under budget); floor mop, gym gear, and mats stayed on Thursday. Keeps both upstairs days near 82 min instead of Thursday running to 100+.

3. **Fortnightly screens pinned to Fridays of Weeks 1 and 3.** Deliberately away from Week 4, which is already the heaviest week of the month.

---

## 5. The digital layer (phase 2 — after the checklist has run for a month)

### 5.1 What Ruby sends

Four checkpoints a day, not thirty. The page holds the detail; Messenger holds the receipt.

```
7:55 AM — Magandang umaga Ruby! ☀️
HUWEBES ngayon — Bedrooms + Yoga Deck (page 6).

Reply:
  EVERYDAY — pag tapos na ang everyday block
  FOCUS — pag tapos na ang focus block
  REPORT — kung may sira o kulang na gamit
```

Plus the two photos she already sends (finished bathroom, made bed) — those attach automatically to the day's log.

Wednesday's message names the week: *"MIYERKULES — Week 3, Kitchen deep. BUONG ARAW po ngayon."*

**Design rule: the bot never blocks her.** Unparsed text still lands in your inbox as a raw note. She is never stuck in a dead end, and the laminated page works with or without the bot — so a dead phone, a brownout, or no signal costs you the log, never the cleaning.

### 5.2 What you get
- **Daily log** — everyday done / focus done / photos / anything she flagged
- **Issue inbox** — `REPORT` → 4-tap Taglish menu (sira / kailangan ayusin / kulang na gamit / iba pa) + urgency + optional photo
- **Monthly rotation tracker** — which week was last done, and when. This is the one that silently rots; a date on a laminated calendar page is good, a queryable record is better.
- **Payouts** — GCash log with her `RECEIVED` reply as the second side of the record

### 5.3 Data model
Five tables: `Tasks` (loaded from the inventory, tagged by day and frequency), `Task Log`, `Issues`, `Payouts`, `People`. Airtable + Make.com, ~2 days of build, ~$20–35/mo. Details available on request — but don't build this until the paper version has run a full monthly cycle and you know which tasks are actually wrong.

### 5.4 The Messenger constraint
A Facebook Page can only message someone freely within 24 hours of *their* last message, so an unprompted 7:55 AM push isn't automatically permitted. Cleanest fix: Ruby sends `GM` when she arrives, the bot replies with the day's line. One message from her, no Meta app review, fully compliant. Viber is the fallback if that chafes — widely used here and with easier template messaging.

---

## 6. Failure modes and how each is defended

| Failure | Defence in the artifact |
|---|---|
| Skipped a workday for another client | Rule 1, page 1, stated plainly |
| Bed left unmade | Thursday's BEFORE YOU GO leads with *"Are BOTH beds made — main bed AND floor bed?"* + daily photo |
| Bathroom left dirty in a "clean" bedroom | Rule 3 + separate tick box per fixture + Thursday check block asks it directly |
| Didn't scrub — scrubber flat | Rule on page 1 + *"Scrubber on charge"* on every single day's check block |
| **Surfaces left wet** | Rule #1 of three, top of page 1 + a DRY question in four of the five daily check blocks |
| **Cleans around furniture, never under** | Rule #2 of three + PULL OUT / MOVE in caps in the Week 3 and Week 4 blocks + Wednesday's check block asks *"Did you PULL THINGS OUT?"* |
| Skips sills and door tracks | Promoted into the EVERY DAY block |
| Wipes the shelf, not the bottles | Task text says *"and the bottles on them"* in master bath, master bedroom drawer unit |

---

## 7. Open questions

1. **Weeks 3 and 4 as whole days — can you commit to that monthly?** If not, tell me and I'll rebalance by moving work out of Week 4 into the weekly blocks. This is the single biggest open item.
2. **Is the maintenance worker in this system?** Your earlier answer assumed a second person. Nothing in the house data mentions one. If he's ad-hoc/on-call, his flow is issue-driven only — no daily list, no checklist page.
3. **Is Bedroom 1 usually occupied or usually empty?** It changes Thursday's load by ~10 min and whether "change sheets when occupied" needs a clearer trigger.
4. **Pay cadence and rate** — weekly / fortnightly / monthly, fixed or per-day? Needed for the Payouts table.
5. **Pressure washer** — buy or not? If yes, "pressure wash deck + exteriors" joins Week 4, which is already the overloaded week. It would need to displace something.
6. **Should Ruby be able to check her own payout history** (`SAHOD` → last 3 payouts)? Trivial to add, good for trust.

---

## 8. Recommended sequence

1. **Now:** review `CHECKLIST.md`, resolve the Week 3/4 whole-day question, generate the `.docx`, print, laminate.
2. **Month 1:** run it on paper. Ruby ticks the page, sends the two photos she already sends. Watch for tasks that are wrong, missing, or consistently skipped. Log her actual Messenger phrasing — every parsing rule in phase 2 should come from her real messages, not from my guesses.
3. **Month 2:** build the Airtable base and the reporting layer, if month 1 shows you still want it. You may find the paper version plus two photos is genuinely enough.
