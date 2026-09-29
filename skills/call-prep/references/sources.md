# Sources: how to query each one

Connector and tool names differ a little between Cowork, chat and Claude Code. Use whichever version of each connector the session has. If a tool isn't loaded yet, search the deferred tools for it before deciding it's missing. If a source really is unavailable or needs signing in again, carry on with the others and list it under "Sources checked" in the prep with the reason. Never stop the whole prep because one source failed.

## Baalda (NxtLayr AI vault): always first

- Connector: the **Tiara** notes connector (tools like `list_vaults`, `search_notes`, `read_note`, `list_notes`, `list_folders`). The vault is called **NxtLayr AI**.
- Client folders: `30 Clients/<Client>/`. Each one has `00 Client brief.md`. Current clients: SafeSmart Access, Marlston Forrest, Harding Wealth Management, Veracity Wealth, Venture Corporate Advisory, Centra Wealth.
- Useful elsewhere: `20 AIOS Agents/Skill catalogue.md` and the skills under `20 AIOS Agents/Skills/`, and `40 Team Workspace/Onboarding/Tiara.md`.
- `search_notes` searches the text of attached files too. Search the client name and the project or deliverable name.
- Tiara has view permission only. Don't try to write to the vault.
- The briefs' own rules: dates are snapshots, report proposed, built, tested and live separately, no commercial information, use Australian English, and Chris approves scope changes and external actions.

## Fathom (call recordings)

- Tools: `list_meetings` (with `include_summary` and `include_action_items`), `search_meetings`, `get_meeting_summary`, `get_meeting_transcript`, `find_person`.
- **Don't rely on `find_person`.** In testing it returned nothing for both "Chris" and "Ryan", even though they were on many calls. Instead:
  1. Run `list_meetings` with summaries and action items, going back about 30 days (use `max_pages` of 3–5).
  2. Pick client calls by **title** and **calendar invitees** (email domain, contact names).
  3. Pick Chris syncs by title: "Tiara + Chris Connect". Also check "Impromptu Google Meet Meeting" recordings, because client calls sometimes get that default title. The 22 Sep Ryan call did.
  4. Run `search_meetings` with the client name and the project keywords as a second net. `recorded_by: "anyone"`.
- Transcripts are large (about 50 KB), so fetch no more than 3 at a time. If one is saved to a file, grep it for the client name, contacts, project terms and "Chris". Read the matching passages with some surrounding context instead of the whole thing.
- Read the **latest client call in full**. For Chris syncs, read the parts about this client, especially his guidance on running the call ("I would show him this first…", "set the expectation…").
- Transcription errors are common with names. Check product and platform names against Baalda before calling something a mistake. "Paradino" looked like a mishearing but is a real platform in the Marlston brief.
- Link every claim to the timestamped Fathom URL.

## Google Calendar (through Composio)

- Toolkit `googlecalendar`, account alias **`work`** (tiara@nxtlayrai.com). The `personal` account (tiaramejos@gmail.com) is the default in Composio, so always pass `account: "work"`. Check personal only if nothing turns up in work.
- Use `GOOGLECALENDAR_EVENTS_LIST` with `calendarId: "primary"`, `singleEvents: true`, `orderBy: "startTime"`, a `query` (the client name or contact first name), and a date window with explicit offsets (for example `+08:00`). Ask for `fields: "items(summary,start,end,status,attendees(email,responseStatus),hangoutLink)"`.
- Tiara is in Manila (UTC+8). Give times in the client's time zone and in Manila. Perth is also UTC+8. East-coast Australia is UTC+10 or +11.
- Report attendee `responseStatus`: accepted, needsAction or declined.

## Gmail (through Composio)

- Toolkit `gmail`, account alias **`work`**. Search by the client's domain (`from:@domain OR to:@domain`) and contact names, over roughly the last 30 days.
- Look for promises and attachments we sent, anything the client said they'd send, and whether they replied.
- The separate Gmail connector (not Composio) has needed signing in again before. If it fails, use Composio.

## Slack

- Search public and private channels for the client name, its aliases and the contact names. Read threads where Chris shares status, files or screenshots, and the client status table he keeps for Tiara.
- Slack is where Chris sends plugins, prompts and design ideas that never reach email.

## Project files

- Google Drive (Composio `googledrive`, account `work`): search by client name.
- Baalda attachments (above) and Slack file shares.
- Tiara's Mac Downloads folder isn't reachable from the cloud. If the latest build lives only there, say so and ask her to confirm its status.

## Client aliases and contacts (starting point: extend as you learn)

| Official name (Baalda) | Also heard or written as | Contacts |
|---|---|---|
| Marlston Forrest | Marston Forest, Malston Forest, Marsden Forest, "Ryan" | Ryan Pitts (ryan.pitts@marlstonforrest.com.au), Anthony. WA, Perth time |
| Centra Wealth | Central Wealth, Sentra, Centro, Central World, "Zac/Zach" | Zac Zacharia, Jen Labonite (jen@centrawealth.com.au), Ariane (ariane@centrawealth.com.au) |
| SafeSmart Access | SafeSmart, Safe Smart, "Harriette" | Harriette Hales (harrietteh@safesmartaccess.com.au), GM Alf |
| Harding Wealth Management | Harding Wealth, "Simon" | Simon Harding |
| Veracity Wealth | Veracity | none recorded |
| Venture Corporate Advisory | Venture | none recorded |

Internal people: Chris Gulotta (chris@nxtlayrai.com), founder, shown in Fathom as "Chris | NxtLayr.AI". Tiara Mejos (tiara@nxtlayrai.com).
