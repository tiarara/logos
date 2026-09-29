# Run notes: call-prep skill, iteration 1, "prep my call with Harriette today"

Run date: 2026-09-29 (Manila, UTC+8). Read-only run: nothing was published, sent, drafted or written to any external service.

## Sources queried and what each returned

| Source | Query | Result |
|---|---|---|
| Baalda: `list_vaults` | none | One vault, "NxtLayr AI" |
| Baalda: `search_notes` | "SafeSmart Access Harriette" (k=20) | Brief ranked 7th. Top hits were generic skills and onboarding notes. Harriette is not named anywhere in the vault |
| Baalda: `search_notes` | "SafeSmart proposal generator Command Centre HubSpot weekly planner" | Only the brief was SafeSmart-specific |
| Baalda: `list_notes` (SafeSmart folder) | none | Only `00 Client brief.md` (updated 12 Sep) |
| Baalda: `read_note` | brief, `30 Clients/README.md` | Brief read in full. Alf owns scope, Nathan is the Sales/BD operator, the weekly planner design is a Cowork interview → A4 → OneDrive PDF (conflicts with reality), drafts only, no managed agent without approval |
| Baalda: `list_folders` | none | Checked for skills matching the work. None matched a KPI/planner report, so no skill was read |
| Google Calendar (Composio, work) | `GOOGLECALENDAR_EVENTS_LIST` q=Harriette, 29 Sep → 15 Nov | Today 12:00–12:30 Manila, both accepted, Chris not invited, invitee TZ Australia/Sydney. No later SafeSmart meetings |
| Google Calendar | all events for today | Chris + Valera call at 13:00 Manila (Tiara attending) |
| Fathom `list_meetings` | since 25 Aug, max_pages 5, then since 9 Sep with summaries and action items | 17–18 meetings. One Harriette call (11 Sep) plus 9 Chris syncs |
| Fathom `search_meetings` | "SafeSmart", "Harriette" (anyone) | 4 and 6 hits. Confirmed which syncs to read |
| Fathom transcripts | 11 Sep Harriette (full); syncs 25, 28, 14, 15, 23, 21 Sep (grepped around SafeSmart passages) | Chris's coaching, Alf's scepticism (15 Sep), "second priority" (23 Sep), plugin structure (25 Sep), Chris leaving Tuesday (28 Sep) |
| Fathom summaries | 11, 14, 25, 28 Sep syncs, plus 16 and 17 via list | 16 and 17 Sep have no SafeSmart content. 25 Sep summary mistranscribes "Harris Cape Club" |
| Gmail (Composio, work) `GMAIL_FETCH_EMAILS` | `(from:@safesmartaccess.com.au OR to:@… OR Harriette OR SafeSmart) after:2026/08/30` | 30 messages, 191k tokens, dumped to the remote workbench. Processed with jq. Key threads: "Sales Weekly planners – question" (17 → 28 Sep), Chris/Alf/Thomas "Meeting Summary + Next steps", Chris's 22 Sep sales update |
| Google Drive (Composio, work) `GOOGLEDRIVE_FIND_FILE` | name/fullText SafeSmart etc., then children of both folders | Two folders ("SafeSmart", "Safe Smart") with duplicate copies of `Copy of Weekly KPIs.pdf` and `Weekly Planners.pdf` (14 and 16 Sep). No plugin or skill files in Drive |
| Slack `slack_search_public_and_private` | "Harriette"; "SafeSmart" after 10 Sep; "Friday pack"; Chris "next action" after 27 Sep | #support-requests threads (11 Sep), Tiara's 24 Sep "finished the Friday pack", Chris's 25 Sep plugin link |
| Slack `slack_read_channel` | Tiara–Chris DM since 25 Sep | Plugin uploaded 25 Sep. Nothing since confirms Harriette's access. Chris's promised client status table has not been posted |
| Local repo | grep for Friday pack sources | None. Plugin sources live on Tiara's machine |

## Skill instructions that were unclear, wrong or slowed me down

1. **Wrong tool slug.** `references/sources.md` names `GOOGLECALENDAR_EVENTS_LIST` and says to pass a `query`. Composio's search recommended `GOOGLECALENDAR_FIND_EVENT` and didn't list EVENTS_LIST at all. EVENTS_LIST did work when called directly, but the parameter is `q`, not `query`. Suggest: "call `GOOGLECALENDAR_EVENTS_LIST` directly (skip COMPOSIO_SEARCH_TOOLS); parameter is `q`".
2. **COMPOSIO_SEARCH_TOOLS is optional but costs a lot.** It returned 58 KB of plans and schemas, and the skill doesn't say whether it's needed. The slugs used (`GOOGLECALENDAR_EVENTS_LIST`, `GMAIL_FETCH_EMAILS`, `GOOGLEDRIVE_FIND_FILE`) could be listed with their exact arguments so the search step can be skipped.
3. **Gmail query guidance is too broad.** "Search by the client's domain … and contact names" plus the client name matched 201 threads, because "SafeSmart" appears in Chris's signatures, invoices and morning briefs. `include_payload`/`verbose` produced a 191k-token response that had to go through the remote bash/jq workbench. Better: `from:@domain OR to:@domain` only, `verbose:false` to list, then fetch the relevant threads by ID.
4. **Markdown filename conflict.** SKILL.md says to save the Markdown copy as `YYYY-MM-DD-<client-slug>-<topic>.md` (e.g. `2026-09-29-safesmart-access-friday-pack.md`) but doesn't say where. The repo already has a top-level `call-prep/` folder, which suggests that's the location. This test asked for `prep.md`, so I used that. The skill should name the folder.
5. **Chris is often a contact, not just an internal attendee.** The skill treats Chris only as a coach. For SafeSmart he has a parallel stream (Alf/Thomas: BD intelligence, sandbox, engineering and fulfilment agents), and his emails with other client staff bear directly on the call. sources.md could say: "also read Chris's threads with the client's other contacts (GM etc.) for scope and access status."
6. **Alias table is thin for SafeSmart.** It lists only "Harriette" and "GM Alf". It's missing Thomas Rolfe (Digital Marketing, HubSpot admin), Nathan Joyce (Sales Manager, named in the brief) and Harriette's role (Internal Sales). Harriette's time zone (Sydney, from the invite) should also be recorded. The Marlston row has a time zone.
7. **Time zone and holiday hazards aren't mentioned.** sources.md says "East-coast Australia is UTC+10 or +11" but not when it switches. For bookings made on this call it matters that NSW daylight saving starts on the first Sunday of October (4 Oct 2026) and the next day is a NSW public holiday. A one-line "check DST changeover and state public holidays when proposing the follow-up" would help.
8. **Brief conflicts are an expected pattern here.** The SafeSmart brief's "Weekly planner" section describes a design that doesn't match the real process or the build. The skill handles this correctly (show the conflict). It could also say where to note that the brief is stale (e.g. "flag to Chris") since Baalda is read-only.
9. **The template's sections don't fully match SKILL.md's order.** SKILL.md lists "Check before the call" as section 2, before Purpose. The template puts the check callouts inside the Purpose section, after the goals. I followed the template. The two should agree.
10. **The template is a fragment.** It has no `<!doctype>`, `<html>`, charset or viewport meta. That's correct for Artifact publish, which wraps it, but a standalone `prep.html` opened locally renders in quirks mode. I kept the template as-is. The skill should say whether a local save should add a document skeleton.
11. **"Value baseline: the time or cost figures from the diagnostic."** SafeSmart's Harriette work never had a diagnostic. The only figures are from the scoping call (30 min + about 1 hr) and Chris's recollection (1.5 hrs). The skill should allow "scoping call" as the baseline source.
12. **Fathom guidance worked well.** `list_meetings` with summaries and action items since the last client call gave almost everything. Action items were especially useful, e.g. "Consult Claude re: handling changing targets for Harriette" on 23 Sep pointed straight to the right passage. It's worth saying explicitly: "scan action items for the contact's first name."
13. **Transcripts over 50 KB are saved to a file.** The advice to grep them worked. It could state that the file is a JSON array with the text at `[0].text`, which needs extracting before grepping.

## Things I had to work around
- The Gmail response was too big to read inline. I used `COMPOSIO_REMOTE_BASH_TOOL` with jq on `/mnt/files/mex/weak.json` to list messages and extract thread bodies.
- Fathom transcripts were saved as JSON tool-result files. I extracted them to the scratchpad with Python and grepped or awk-filtered by timestamp.
- I couldn't verify the plugin's visibility or scoping in SafeSmart's Claude, HubSpot data, or the target tables (inline images). These are listed as unverified in the prep.
- I didn't open the Drive PDFs or the 25 Sep side-by-side artifact (claude.ai/artifact/4nEg…). They weren't needed for prep, and they're listed as not opened.
- Slack timestamps show as "CST". I treated them as UTC+8, which matches Manila (e.g. 25 Sep 13:05 plugin upload, consistent with the 25 Sep sync).
- Two SafeSmart Drive folders ("SafeSmart" and "Safe Smart") hold duplicate samples. I linked the newer one. A consolidation task for Tiara is noted implicitly, not in the prep.
