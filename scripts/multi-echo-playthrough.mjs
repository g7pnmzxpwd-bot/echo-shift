import { chromium } from 'playwright-core';

const baseUrl = process.env.ECHO_SHIFT_URL ?? 'http://127.0.0.1:5173';
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
await page.addInitScript(() => {
  localStorage.setItem('echo-shift-progress-v1', JSON.stringify({ unlocked: 36, completed: [] }));
});

const rounds = [
  {
    number: 7,
    spawn: { x: 105, y: 486 },
    runs: [
      { delay: 0, route: [{ x: 170, y: 170 }] },
      { delay: 0, route: [{ x: 360, y: 420 }] },
    ],
    finalDelay: 4200,
    route: [{ x: 470, y: 435 }, { x: 855, y: 435 }],
  },
  {
    number: 19,
    spawn: { x: 88, y: 456 },
    runs: [
      { delay: 0, route: [{ x: 155, y: 180 }] },
      { delay: 2200, route: [{ x: 410, y: 456 }, { x: 410, y: 275 }] },
      { delay: 5200, route: [{ x: 620, y: 456 }, { x: 620, y: 185 }] },
    ],
    finalDelay: 0,
    finalHoldMs: 12500,
    route: [],
  },
  {
    number: 36,
    spawn: { x: 82, y: 404 },
    runs: [
      { delay: 0, route: [{ x: 225, y: 240 }] },
      { delay: 2000, route: [{ x: 355, y: 404 }, { x: 355, y: 440 }] },
      { delay: 4200, route: [{ x: 590, y: 404 }, { x: 590, y: 165 }] },
      { delay: 7600, route: [{ x: 715, y: 404 }, { x: 715, y: 350 }] },
    ],
    finalDelay: 0,
    finalHoldMs: 13000,
    route: [],
  },
];

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
  await hold('Space', 160);
  await page.waitForTimeout(120);
};

for (const round of rounds) {
  await page.goto(`${baseUrl}/?round=${round.number}&qa=1`, { waitUntil: 'networkidle' });
  await page.locator('html[data-echo-phase="intro"]').waitFor();
  await page.keyboard.press('Enter');
  await page.locator('html[data-echo-phase="playing"]').waitFor();
  for (const run of round.runs) {
    let position = { ...round.spawn };
    if (run.delay > 0) await page.waitForTimeout(run.delay);
    for (const target of run.route) position = await move(position, target);
    await shift();
  }
  await page.waitForTimeout(round.finalDelay);
  let position = { ...round.spawn };
  for (const target of round.route) position = await move(position, target);
  if (round.finalHoldMs) await hold('ArrowRight', round.finalHoldMs);
  await page.waitForTimeout(900);
  try {
    await page.locator(`html[data-echo-completed="${round.number}"]`).waitFor({ timeout: 3000 });
  } catch (error) {
    await page.screenshot({ path: `/tmp/echo-shift-round-${round.number}-failed.png`, fullPage: true });
    throw error;
  }
}

console.log(JSON.stringify({ errors, solved: rounds.map((round) => round.number) }));
await browser.close();
if (errors.length > 0) process.exit(1);
