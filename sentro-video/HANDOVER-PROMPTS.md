# Handover prompts

Paste each one into the session on your Mac named in its heading.

---

## 1. Sentro hero video on sentrohq.tech

**Paste into:** the session that deploys sentrohq.tech (Kahana completion or Northswell AI positioning)

```
Add the Sentro product video to the homepage hero on sentrohq.tech.

1. Fetch branch claude/sentro-demo-video-y1p3yg from github.com/tiarara/logos
   (git clone --branch claude/sentro-demo-video-y1p3yg --depth 1 https://github.com/tiarara/logos).
2. Copy these three files from sentro-video/web/ into the site's public media folder:
   sentro-hero.webm, sentro-hero.mp4, sentro-hero-poster.jpg.
3. Follow sentro-video/web/HERO-EMBED.md for the markup, CSS and the
   reduced-motion script. Put the video where the Bookings screen preview sits
   in the hero now. If there is no preview, put it under the hero buttons.
   Keep the existing headline, buttons and copy unchanged.
4. Check locally first: the video autoplays muted and loops, the poster shows
   before it loads, it fits at 390px phone width without horizontal scroll,
   and the page still passes its current build.
5. Deploy to the VPS the way this site is normally deployed. Take a backup of
   the current hero first so it can be rolled back.
6. On the live site, confirm the video plays on desktop Chrome and mobile
   Safari, and that both media files return 200 with the right content type
   (video/webm, video/mp4).

Report the live URL, what you changed (files and lines), and how to roll back.
```

---

## 2. Northswell AI promo, 30-second cut

**Paste into:** Northswell AI motion graphics video (the session that rendered northswell-ai-25s-9x16.mp4)

```
Rework the promo video northswell-ai-25s-9x16.mp4 into a 30-second version.
Edit the source project that renders it (Remotion or similar). Do not start
from scratch.

Keep the existing brand: fonts (serif display, mono labels), colors (dark
green/teal gradient, white cards), card UI style, and music. If the music no
longer fits 30s, loop or extend it cleanly with no abrupt cut.

Format: 1080x1920, 30fps, 30s (900 frames). Keep all text inside the social
safe area: nothing important in the top 250px or bottom 350px. Everything must
read with sound off.

Goal: open on the pain (missed guest messages = lost bookings), then show
Sentro fixing it, then price and CTA.

BEAT SHEET
0-2s   HOOK. A phone-style stack of unread notification chips pops in fast:
       "Messenger · 14 unread", "Instagram · 6 unread", "Email · 3 days ago",
       "Booking.com · new reservation". Line over it:
       "A 20-guest group asked for Dec 27."
2-5s   THE LOSS. One message card: "Hi! Do you have space for 20 guests,
       Dec 27-29?" Its timestamp ticks "2 min ago" -> "5 hrs ago" ->
       "3 days ago", then a muted stamp: "Booked elsewhere."
       Line: "Nobody replied."
5-6s   TURN. Hard cut to the Sentro HQ header (existing style):
       "Sentro HQ · Guest ops · Bookings · Money".
6-11s  REPLY + APPROVE. The same 20-guest message arrives in the Sentro inbox.
       An AI draft appears: "Yes! We can host your group Dec 27-29. 5 rooms,
       2 nights: ₱39,200 total. Want me to hold them for you?"
       A thumb/cursor taps an "Approve" button, the card flips to "Sent ✓",
       and a small badge shows "Replied in 2 min".
       Caption: "Replies drafted in your voice. You just approve."
11-14s OTA BOOKING. Reuse the existing bookings card: new Agoda booking lands,
       dates fill on the calendar, small "Website blocked ✓" tick.
       Caption: "OTA bookings on your calendar and website. Automatically."
14-16.5s RECEIPTS. Reuse the receipts card (photo -> logged expense).
       Caption: "Receipts logged from a photo."
16.5-19.5s NUMBERS. Reuse the dashboard card (occupancy, revenue, bookings,
       30-night forecast bars animating in).
       Caption: "Your numbers, every morning."
19.5-22.5s STORIHQ. Reuse the StoriHQ photo grid.
       Caption: "25+ posts a month from one upload."
22.5-26s STATS + PRICE. Stats card with two stats only:
       "7 hrs / BACK EVERY WEEK" and "From ₱5,000 / A MONTH".
       Small muted footnote: "Estimate for a 14-room hotel, 10 OTA bookings
       a week." Remove the three pills (Full Stack Bundle, Custom AI Package,
       AI Systems Training).
26-30s CTA. Keep the existing end scene: "Every guest message answered.
       Every booking on your calendar. You just approve." Then the
       "BOOK A FREE CONSULTATION" button and northswelldigital.com, with the
       "Northswell AI" wordmark. Hold the final frame at least 1.5s.

PACING
- Cut the slow fades. No transition longer than ~8 frames, and no near-black
  frames between scenes.
- Each caption must be on screen at least 1.5s.
- The approve tap (6-11s) is the key moment. Give it a clear motion beat.

CONTENT RULES
- All guest names, messages, dates and prices are fictional samples. Do not
  use any real client or guest names, Kahana data, or revenue claims.
- Do not add testimonials, client logos or "live at X resorts" claims.
- Plain English only.

OUTPUT + CHECKS
- Render to northswell-ai-30s-9x16-v2.mp4. Keep the original file.
- Extract frames at 1, 4, 8, 12, 15, 18, 21, 24, 28 and 29.5s, view them, and
  confirm: text is legible, nothing clips the safe area, no leftover old
  "2-3 hrs" or pills, and the final frame shows the CTA and URL.
- Report the output path and anything you couldn't match in 3 lines max.
```

---

## 3. Optional: check the Sentro video against the live app

**Paste into:** Kahana completion (it has the Sentro HQ app)

```
Open branch claude/sentro-demo-video-y1p3yg in github.com/tiarara/logos and
look at sentro-video/sentro-15s.mp4 and sentro-video/sentro.html.

The video recreates Sentro HQ screens (Inbox, Bookings, a reservations
calendar) from the redesign mocks, because the cloud session that built it
could not reach sentrohq.tech or app.sentrohq.tech.

Compare it with the live app and site. List anything that doesn't match
(labels, nav items, colors, logo, layout, features shown that the app doesn't
have). Then fix sentro.html to match, using sample data only (no real guest
names or Kahana data). Re-render with:
  npm install && pip install imageio-ffmpeg
  FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node render.mjs video sentro-15s.mp4
then re-encode the web files in sentro-video/web/ with the same settings
(1280 wide, H.264 crf 25 faststart, VP9 crf 36, poster at 11.6s), commit and
push to the same branch.
```
