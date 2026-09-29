# Call Prep: Marlston Forrest (Ryan Pitts): Evidence Pack + Strategy Paper install

**Client:** Marlston Forrest (ryan.pitts@marlstonforrest.com.au), WA, GMT+8
**Call:** Thursday 1 Oct 2026, 11:00–11:45 Perth time (from Google Calendar). Invite title: "Marlston Forrest x NxtLayr: Advice drafter feedback + Strategy Paper & Evidence Pack".
**Invite status:** Chris has accepted. Ryan and Tiara haven't responded yet. Confirm with Ryan.
**Prompts from Ryan:** Not received. We're presenting what we built from his sample Evidence Pack and Strategy Paper docs.

---

## 1. Goal of the call

1. Show and install the **Evidence Pack** skill, plus the **Strategy Paper** if it's ready (see check below).
2. Get his feedback on the output. Since we don't have his prompts, use this call to gather the requirements they would have given us.
3. Check in on the **Advice Drafter (SOA)** he installed on 22 Sep and on the AIOS in general.
4. Book the next follow-up 1–2 weeks out.

> ⚠️ **Check before the call:** On 25 Sep Chris asked if *both* the evidence and strategy packs were done. Tiara's notes only confirm the **Evidence Pack skill** ("the one I built earlier this week"). If the Strategy Paper skill isn't ready, demo the Evidence Pack and present the Strategy Paper as the next build. Use this call to gather its requirements.

---

## 2. How Ryan's advice workflow runs (his words, 22 Sep)

```
Fact find + product research + RetireMap modelling
            │
            ▼
   STRATEGY PAPER   ← he talks to Claude: which strategies are we considering?
            │          one (or more) becomes the recommendation, the rest are listed as alternatives
            ▼
   EVIDENCE PACK    ← pulls client data, product, fees, the strategy paper and the modelling
            │          into one pack that "substantiates the advice"
            ▼
   SOA (Advice Drafter)  ← "all that has to do is draft from the evidence pack and the strategy paper"
```

- He said: *"I can't provide the SOA… without the Evidence Pack and the Strategy Work Paper."* These two come first in his process.
- The samples he sent us are *"pretty much what I would use as a template for the evidence pack."*
- He wants, for each document, *"the template and then the skill"* that pulls from the fact find, product research and RetireMap.

---

## 3. Background (what's happened so far)

| Date | What happened |
|---|---|
| 10–14 Sep | Diagnostic priorities: **1. advice production, 2. client files & records, 3. meetings & follow-ups.** Advice production costs him about 50 hrs/month (about $150k/yr in productivity). He does 2–3 SOAs a month, up to 5. The SOA agent was blocked until he sent a blank SOA template and a cash-flow workbook. |
| 17 Sep | Build unblocked (factory script fix). Decided to ship the SOA agent inside the wider **Advisor Workflow Pack** plugin, with the extra skills as a bonus. Ryan's de-identified docs still had client names in them. |
| 21 Sep | Walkthrough rescheduled to 22 Sep, so he had time to review the template questions and the draft SOA. |
| 22 Sep | **SOA template approved**: *"template looks good… great start."* He liked that it flags missing info. Plugin installed. He hadn't tested it on a real client file yet (no new advice in progress). Fixed the repeated RetireMap authorisation prompts (Customize → Connectors → allow all). **He switched priority to the Evidence Pack and Strategy Paper** ahead of the document filing agent. He said he'd send his prompts and the RetireMap table output by Thursday. He was unwell. |
| 23 Sep | Chris and Tiara agreed on the Evidence Pack build. Built from his samples (de-identified) and tested against the Whitfields dummy client. Claude flagged that the Whitfields profile didn't fit Marlston Forrest's clients and adapted it. |
| 28 Sep | No reply from Ryan yet. Plan: *"go with what I've built… get his feedback… go on from there."* Chris: he might push the call if he's still sick. That's fine as long as **we're waiting on him, not the other way round.** |

---

## 4. Agenda (about 30 min)

**0–3 min: Open**
- Ask how he's feeling (sick last week, drove to Perth).
- Set the frame: *"You haven't had a chance to send your prompts, so we built this from the Evidence Pack and Strategy Paper samples you gave us. Today's about seeing the output and getting your feedback so we can tune it."*

**3–8 min: Quick check-in**
- Has he run the **Advice Drafter** on a real client yet? What worked and what didn't?
- AIOS: is he still using Chat for brainstorming and Cowork for tasks? Any problems?
- Is RetireMap still asking for authorisation, or did the connector fix work?

**8–18 min: Demo (show the output first, then install)**
- Show a generated **Evidence Pack**, using de-identified or Whitfields data only. Never show real client names.
- If ready, show the **Strategy Paper**, including the recommended strategy and the alternatives.
- Walk through how it links to the SOA: Strategy Paper → Evidence Pack → `/advice` Advice Drafter.
- Point out it produces **.docx** so he can edit it by hand.

**18–24 min: Install (same steps as 22 Sep)**
- Send the plugin zip and **don't unzip it**.
- Claude → **Customize → Plugins → Add → Upload Plugin** and select the zip.
  - If this replaces the existing Advisor Workflow Pack, confirm the old version is replaced or removed so he doesn't end up with duplicate skills.
- Open **Customize → Skills** to check the new skills are listed.
- Run it in **Cowork**: type `/` and pick the skill (or just describe the task), point it at the client folder, use **Opus 5**.
- Kick off one run live if he has a client folder handy. You don't need to wait for it to finish.

**24–30 min: Requirements + next steps** (questions below)

---

## 5. Questions to ask (these fill the gap left by the missing prompts)

**Strategy Paper**
- When you talk it through with Claude, what do you usually ask it? (Ask him to paste one prompt from memory, or send it after the call.)
- How many strategies do you usually consider, and how is the recommended one chosen and justified?
- What must appear in it every time? Anything licensee or compliance-driven?

**Evidence Pack**
- Go through the sections: client data, product research, fees, strategy paper, modelling. Is anything missing? Any fixed order?
- Where does each input live (folder or file names)? Is it the same structure for every client?
- Does the RetireMap modelling go in as tables or as screenshots?

**Chaining**
- Should the skills run one after another (Strategy → Evidence → SOA) or separately with a check between each?
- Does he want the skill to ask all its clarifying questions **in one batch** rather than one at a time? (Chris's standard. Confirm it works that way.)

**RetireMap / charts (open from 22 Sep)**
- He was going to send the table output and prompt he used (super balances, year ending 30 June). For now, charts stay **copy-paste**. Once we have his prompt we'll add it to the Advice Drafter and send him an updated file.

**Value baseline (for the client value ledger; keep it casual)**
- *"Remind me, how long does a Strategy Paper and an Evidence Pack take you by hand right now?"* Note the numbers so we can show hours saved against the ~50 hrs/month figure from the diagnostic.

---

## 6. Things not to miss

- **Prompts:** Ask for them again at the close, without pushing: *"Once you've run it on a real client, send the prompts you'd normally use and we'll fold them in."*
- **Prompt library:** Last time he said he writes good prompts but never saves them. Remind him he can ask Claude to save a prompt to memory. Check he got the **bonus-skills prompt pack** email (action from 22 Sep).
- **Formatting:** Check table heading and text contrast before demoing. White headings looked washed out, and advisers with licensees can be strict about readability.
- **Privacy:** If he raises client data, AI can't de-identify data without reading it. Recommend a manual **find-and-replace in Word with a key spreadsheet** to swap names back. A local tool like Presidio is an option later.
- **Document filing agent:** He took it off the list. Don't push it. Chris expects he'll come back to it.
- **Platform stack:** If he asks whether to keep Marlu or the other advice platform (transcribed as "Paradino"), Chris's position: *don't cancel anything yet*, see how the Claude agents perform first. A likely end state is Marlu for meeting notes plus Claude.
- **Timelines:** If he asks for the next thing quickly, **up to 2 weeks per skill** is reasonable. It's fine to say *"let me scope it and come back to you."*
- **Expectations:** It's a first pass. Revisions are normal and expected. He's easy-going on design with no fixed template, so feedback will likely be about content and wording, not layout.
- **Fathom:** Make sure it joins the call. Chris wants every client call recorded.

---

## 7. Close / next steps (confirm out loud)

- [ ] Ryan: test the Evidence Pack (and Strategy Paper) on a real client file, then send feedback, prompts, and the RetireMap table output and prompt.
- [ ] Tiara: update the skills from his feedback and send the updated plugin zip.
- [ ] Book the next catch-up **1–2 weeks** out (his time zone).
- [ ] Tiara: log time-saved numbers for the client value ledger and brief Chris afterwards.

> **Internal only, not for the call:** Chris and Tiara expect Marlston Forrest to be a shorter engagement (25 Sep). Aim to deliver clean wins and leave the door open.

---

### Sources (Fathom)
- [Ryan call, 22 Sep: SOA review + Evidence Pack/Strategy Paper priority](https://fathom.video/calls/832161960)
- [Ryan call, 21 Sep: reschedule](https://fathom.video/calls/828989074)
- [Chris sync, 28 Sep](https://fathom.video/calls/837165646) · [25 Sep](https://fathom.video/calls/835143933) · [23 Sep](https://fathom.video/calls/831512474) · [21 Sep](https://fathom.video/calls/828015683) · [17 Sep](https://fathom.video/calls/824760026) · [14 Sep](https://fathom.video/calls/818709023) · [15 Sep](https://fathom.video/calls/821345646)
