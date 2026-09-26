import { chromium } from 'playwright';
import { spawn } from 'child_process';
const [mode, ...rest] = process.argv.slice(2);
const FPS = 30, DUR = 15;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.goto('file://' + process.cwd() + '/sentro.html');
await p.evaluate(() => document.fonts.ready);
if (mode === 'stills') {
  for (const t of rest) { await p.evaluate(t => render(t), +t); await p.screenshot({ path: `still_${t}.png` }); }
} else {
  const ff = spawn(process.env.FFMPEG, ['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-',
    '-c:v','libx264','-pix_fmt','yuv420p','-crf','16','-preset','slow','-movflags','+faststart', rest[0]], { stdio: ['pipe','inherit','inherit'] });
  for (let f = 0; f < FPS * DUR; f++) {
    await p.evaluate(t => render(t), f / FPS);
    const buf = await p.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
