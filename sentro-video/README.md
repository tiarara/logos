# Sentro 15s motion video

- `sentro-15s.mp4`: 1920x1080, 30fps, 15s, H.264
- `poster.png`: end-card still
- `sentro.html`: source. Every frame is `render(t)`; open with `?play` to preview in a browser.

Re-render:

```
npm install
pip install imageio-ffmpeg
FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node render.mjs video sentro-15s.mp4
```

Colors are CSS tokens at the top of `sentro.html` (`--mint`, `--amber`, `--bg`). The logo mark is a placeholder; swap in the real one.
