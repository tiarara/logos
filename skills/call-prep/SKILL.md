---
name: call-prep
description: Prepare Tiara's NxtLayr AI client call prep, and the post-call wrap-up, by reviewing every relevant source before the call. Checks Baalda (the NxtLayr AI vault) first, then Fathom recordings of client calls and Tiara + Chris catch-ups, Google Calendar, Slack, Gmail and the latest project files. Publishes the result as a call prep page. Use this whenever Tiara asks to prep, prepare for, get ready for or brief her on a call or meeting with any client or contact (for example Ryan / Marlston Forrest, Zac / Jen / Ariane at Centra Wealth, Harriette / SafeSmart, Simon / Harding Wealth), even if she just says "call prep for X", "what do I need for my call with X" or "prep me for tomorrow". Also use it after a call when she asks for a wrap-up, recap, follow-up or next steps from a client call.
---

# Call prep

Tiara runs delivery calls for NxtLayr AI clients, usually with Chris (Chris Gulotta, founder) coaching her beforehand in their "Tiara + Chris Connect" syncs. A good prep means she walks into the call knowing everything that has been said, promised, built and changed. That includes things only mentioned in a Chris sync. The biggest risks are missing something and trusting a stale fact.

This skill has two modes:

- **Prep** (before a call): the default. Follow the steps below.
- **Wrap-up** (after a call): when she asks for a recap, follow-up or next steps. Read `references/wrap-up.md`.

Read `references/sources.md` before gathering anything. It covers how to query each source, the account to use, and the traps found in earlier runs.

## Step 1: Pin down the call

Identify the client and the specific meeting.

1. **Resolve the client name.** Tiara often uses a nickname, a person's first name or a phonetic spelling ("Marston Forest" is Marlston Forrest). Match it against the client folders in Baalda (`30 Clients/`) and the alias table in `references/sources.md`. Use the official spelling from the Baalda brief everywhere in the output.
2. **Find the meeting in Google Calendar (work account).** Take the date, time, time zone, title and attendees, including who has accepted, from the invite. Do not rely on what was said on an earlier call. A recording once said "Tuesday" while the invite was for Thursday, and the calendar was right. If no invite exists, say so at the top of the prep and ask Tiara to confirm the time.
3. Note whether Chris is on the invite and whether he has accepted. It decides whether she's running the call alone.

If the client or call is ambiguous (two upcoming calls with the same client, or an unknown name), ask one short question before doing the full sweep. Otherwise proceed.

## Step 2: Gather, starting with Baalda

Baalda is the team's second brain. Always read it first, because it holds the agreed scope, people, architecture and constraints that frame everything else.

- `30 Clients/<Client>/00 Client brief.md`: always read in full.
- Search the vault for the client and project names, and read anything relevant, including skills under `20 AIOS Agents/Skills/` that match the work being delivered (for example `soa-skill-factory`, `diagnostic-report`, `client-progress-dashboard`).
- Follow the vault's rules in `30 Clients/README.md`. Baalda is read-only for this skill: never write, move or edit anything in it.

Baalda briefs are dated snapshots. Treat them as the baseline and check them against newer evidence. When a newer call or message contradicts the brief, the newer source usually wins, but always show the conflict in the prep. Don't settle it quietly, because Tiara may need to confirm it on the call.

Then sweep the other sources, as set out in `references/sources.md`:

| Source | What to get |
|---|---|
| Fathom: client calls | Every recorded call with this client. Read the most recent one in full. Summaries are enough for older ones unless something needs checking. |
| Fathom: Chris syncs | Every Tiara + Chris Connect since the last client call, plus earlier ones that mention the client. Pull out only the parts about this client: status, decisions, and Chris's advice on running the call. |
| Google Calendar | The meeting (Step 1), and the next booked meetings with this client. |
| Slack | Mentions of the client, project or contacts. Chris's messages, shared files, and the client status table. |
| Gmail (work) | Recent threads with the client's domain or contacts. What was promised or sent, and whether they replied. |
| Project files | The latest versions of what's been built for them (Google Drive work account, Baalda, Slack attachments). Note what each item is and its status. |

Quote before you claim. Anything you say someone said must come from a transcript or message you actually read, with a link to it.

## Step 3: Analyse

Work out the things Tiara can't easily see herself:

- **Where things stand**: the latest agreed priority, and what's proposed, built, tested and live. Keep those four apart, as the Baalda rules require.
- **Who owes what**: what the client owes us and what we owe them, each with a date. If we owe them something that isn't done, that goes at the top of the page.
- **Conflicts**: brief vs latest call, recording vs calendar, or Chris's view vs the client's. List each one with both sources.
- **The client's process in their words**: how they actually work, quoted, if the call is about building or delivering something.
- **Chris's coaching**: how he said to run the call, what to show first, what to hold back, and expectations to set. This often exists only in the syncs.
- **Value baseline**: the time or cost figures from the diagnostic, or from the scoping call if there was no diagnostic, and the question to ask so the client value ledger can be updated.
- **Internal-only context**: relationship notes, how the engagement is going, anything that shouldn't be said on the call. Keep it apart from everything else.

## Step 4: Build the prep page

Publish the prep as a page (an artifact where the surface supports it), built from `assets/prep-page.html`. Keep its layout and fill every section. Leave a section out only when it truly doesn't apply, for example install steps on a check-in call. Tiara finds plain Markdown hard to read, so the page is the main deliverable. A short summary in chat goes with it.

Sections, in order:

1. **Header**: client (official spelling), contacts and emails, date, time in the client's time zone and in Manila, who's on the invite and who has accepted.
2. **Purpose**: 2–4 goals for the call, followed by **Check before the call** callouts for anything to verify or finish beforehand, including overdue items we owe.
3. **How the client works / what they want**: their process and priorities, with quotes.
4. **Where things stand**: a dated timeline with the key rows highlighted, and the proposed, built, tested and live status of each deliverable.
5. **Who owes what**: two columns, client and us.
6. **Agenda**: minute-ranged slots adding up to the invite's length, with suggested wording for the opening.
7. **Discovery questions**: grouped by topic, including a casual value-baseline question.
8. **Install / demo steps**: only when something is being delivered.
9. **Things not to miss**: Chris's advice, earlier issues, conflicts, brand or compliance notes, expectation-setting.
10. **Close checklist**: named owner for each item, plus booking the next follow-up. Remind Tiara to make sure Fathom is recording.
11. **Internal only (not for the call)**: visibly separated.
12. **Sources checked**: every source with links, plus anything that couldn't be reached and why.

Writing rules:

- Use Australian English and plain, direct sentences.
- Never include NxtLayr fees, invoices or commercial terms (Baalda rule).
- Never show real advice-client names or personal data. Use the de-identified or dummy names that appear in the sources.
- Keep it scannable. Tiara reads this minutes before the call.

Also save a Markdown copy of the prep where the session allows it, named `YYYY-MM-DD-<client-slug>-<topic>.md` using the call date. Put it in a `call-prep/` folder in the working directory (or the session's outputs folder in Cowork). When saving the HTML as a local file too, wrap it in `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">…</head><body>…</body></html>` so it doesn't open in quirks mode. The page publisher adds this wrapper itself.

## Step 5: Report back

In chat, give the page link and 4–6 bullets covering: the call time and who's on it, anything overdue or unconfirmed, conflicts found, and sources that couldn't be reached. Tiara should be able to act on the chat message alone if she has no time to open the page.
