import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = process.env.ECHO_SHIFT_URL ?? 'https://g7pnmzxpwd-bot.github.io/echo-shift';
const outputDir = path.resolve('submission/raw-video');
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } },
});
await context.addInitScript(() => {
  localStorage.setItem('echo-shift-progress-v1', JSON.stringify({ unlocked: 36, completed: [] }));
  localStorage.setItem('echo-shift-muted-v1', '1');
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const hold = async (key, milliseconds) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(Math.max(80, milliseconds));
  await page.keyboard.up(key);
};
const move = async (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > 2) await hold(dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.abs(dx) / 0.18);
  if (Math.abs(dy) > 2) await hold(dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(dy) / 0.18);
  return { ...to };
};
const shift = async () => {
  await hold('Space', 180);
  await page.waitForTimeout(180);
};
const caption = async (eyebrow, title, body, milliseconds = 2200) => {
  await page.evaluate(({ eyebrow, title, body }) => {
    document.querySelector('#submission-caption')?.remove();
    const card = document.createElement('section');
    card.id = 'submission-caption';
    card.innerHTML = `<small>${eyebrow}</small><strong>${title}</strong><p>${body}</p>`;
    Object.assign(card.style, {
      position: 'fixed', inset: '0', zIndex: '10000', display: 'grid', placeContent: 'center',
      textAlign: 'center', padding: '80px', color: '#eaf7ff', background: '#050711',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '.06em',
    });
    const small = card.querySelector('small');
    Object.assign(small.style, { color: '#55f6ff', fontSize: '14px', marginBottom: '16px' });
    const strong = card.querySelector('strong');
    Object.assign(strong.style, { color: '#ffb45a', fontSize: '52px', lineHeight: '1.05', marginBottom: '20px' });
    const p = card.querySelector('p');
    Object.assign(p.style, { color: '#a9bdd1', fontSize: '20px', lineHeight: '1.5', margin: '0' });
    document.body.append(card);
  }, { eyebrow, title, body });
  await page.waitForTimeout(milliseconds);
  await page.evaluate(() => document.querySelector('#submission-caption')?.remove());
  await page.waitForTimeout(350);
};
const loadRound = async (number) => {
  await page.goto(`${baseUrl}/?round=${number}&qa=1`, { waitUntil: 'networkidle' });
  await page.locator('html[data-echo-phase="intro"]').waitFor();
};
const startRound = async () => {
  await page.keyboard.press('Enter');
  await page.locator('html[data-echo-phase="playing"]').waitFor();
  await page.waitForTimeout(600);
};

await loadRound(1);
await caption('OPENAI GAME BUILDERS SEOUL 2026', 'ECHO//SHIFT', 'Your past is the key.');
await page.waitForTimeout(1200);
await caption('THE CORE LOOP', 'MOVE · SHIFT · COOPERATE', 'Record a path. Lock the timeline. Your past run returns as a cyan echo.', 2600);
await startRound();
await hold('ArrowUp', 1750);
await hold('ArrowRight', 1000);
await shift();
await page.waitForTimeout(900);
await hold('ArrowUp', 250);
await hold('ArrowRight', 4300);
await page.locator('html[data-echo-completed="1"]').waitFor({ timeout: 4000 });
await page.waitForTimeout(1800);

await loadRound(7);
await caption('CHAPTER 02 · DUAL SIGNAL', 'TWO PAST SELVES', 'Each committed path becomes a teammate that must hold its position.', 2400);
await startRound();
for (const target of [{ x: 170, y: 170 }, { x: 360, y: 420 }]) {
  let position = { x: 105, y: 486 };
  position = await move(position, target);
  await shift();
  await page.waitForTimeout(450);
}
await page.waitForTimeout(4200);
let position = { x: 105, y: 486 };
for (const target of [{ x: 470, y: 435 }, { x: 855, y: 435 }]) position = await move(position, target);
await page.locator('html[data-echo-completed="7"]').waitFor({ timeout: 4000 });
await page.waitForTimeout(1800);

await loadRound(36);
await caption('CHAPTER 06 · FULL CHORUS', 'FOUR-STAGE SYNCHRONIZATION', 'Later echoes can only advance after earlier echoes open each gate.', 2600);
await startRound();
const finaleRuns = [
  { delay: 0, route: [{ x: 225, y: 240 }] },
  { delay: 2000, route: [{ x: 355, y: 404 }, { x: 355, y: 440 }] },
  { delay: 4200, route: [{ x: 590, y: 404 }, { x: 590, y: 165 }] },
  { delay: 7600, route: [{ x: 715, y: 404 }, { x: 715, y: 350 }] },
];
for (const run of finaleRuns) {
  position = { x: 82, y: 404 };
  if (run.delay) await page.waitForTimeout(run.delay);
  for (const target of run.route) position = await move(position, target);
  await shift();
}
await hold('ArrowRight', 13000);
await page.locator('html[data-echo-completed="36"]').waitFor({ timeout: 4000 });
await page.waitForTimeout(2200);
await caption('36 HAND-AUTHORED ROUNDS · DESKTOP + MOBILE', 'BUILT WITH CODEX', 'Human-directed game design. Codex-assisted implementation, testing, debugging, and browser QA.', 3200);
await caption('PLAY NOW · NO LOGIN · NO INSTALL', 'ECHO//SHIFT', 'g7pnmzxpwd-bot.github.io/echo-shift/', 3200);

const video = page.video();
await page.close();
const videoPath = await video.path();
await context.close();
await browser.close();
console.log(JSON.stringify({ videoPath, errors }));
if (errors.length) process.exit(1);
