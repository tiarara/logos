# Sentro product video in the sentrohq.tech hero

Files (copy to the site's public/static folder, e.g. `/media/`):

- `sentro-hero.webm` (VP9, 1280x720, 0.9 MB)
- `sentro-hero.mp4` (H.264, 1280x720, 1.0 MB, fallback for Safari)
- `sentro-hero-poster.jpg` (Bookings screen frame, shown before the video loads)

The video is 15s, silent, and loops cleanly.

## Markup

Put this in the hero where the Bookings screen preview sits now (or under the hero buttons).

```html
<figure class="hero-video">
  <video autoplay muted loop playsinline preload="metadata"
         poster="/media/sentro-hero-poster.jpg"
         aria-label="Sentro HQ answering a guest message, catching OTA bookings and showing the morning dashboard">
    <source src="/media/sentro-hero.webm" type="video/webm">
    <source src="/media/sentro-hero.mp4" type="video/mp4">
  </video>
  <figcaption>Sentro HQ, with sample figures</figcaption>
</figure>
```

## CSS

```css
.hero-video{margin:48px auto 0;max-width:1040px;width:100%}
.hero-video video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;
  border-radius:16px;background:#111615;box-shadow:0 40px 90px -30px rgba(0,0,0,.6)}
.hero-video figcaption{margin-top:12px;text-align:center;font-size:.85rem;opacity:.7}
```

## Reduced motion

People who turn off motion get the poster with a play button instead of autoplay.

```html
<script>
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.hero-video video').forEach(v => {
      v.removeAttribute('autoplay'); v.pause(); v.controls = true;
    });
  }
</script>
```
