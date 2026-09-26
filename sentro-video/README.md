# Sentro HQ 15s motion video

- `sentro-15s.mp4`: 1920x1080, 30fps, 15s, H.264
- `poster.png`: end-card still
- `sentro.html`: source. Every frame is `render(t)`; open with `?play` to preview in a browser.
- `img/`: Baler photos by Tiara Mejos (from the Sentro HQ redesign mocks)

Content comes from the Sentro HQ redesign mocks (site copy, brand tokens, and the real Bookings screen with its sample figures). Guest names and messages in the inbox and notifications are sample data.

Re-render:

```
npm install
pip install imageio-ffmpeg
FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node render.mjs video sentro-15s.mp4
```
