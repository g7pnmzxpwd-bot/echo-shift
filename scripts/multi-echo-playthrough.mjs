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
    plates: [{ x: 170, y: 170 }, { x: 360, y: 420 }],
    route: [{ x: 470, y: 435 }, { x: 855, y: 435 }],
  },
  {
    number: 19,
    spawn: { x: 92, y: 500 },
    plates: [{ x: 130, y: 160 }, { x: 285, y: 285 }, { x: 155, y: 455 }],
    route: [{ x: 350, y: 446 }, { x: 500, y: 446 }, { x: 500, y: 206 }, { x: 850, y: 206 }],
  },
  {
    number: 36,
    spawn: { x: 82, y: 515 },
    plates: [{ x: 115, y: 145 }, { x: 295, y: 220 }, { x: 125, y: 410 }, { x: 300, y: 490 }],
    route: [{ x: 320, y: 414 }, { x: 500, y: 414 }, { x: 500, y: 289 }, { x: 855, y: 289 }],
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
  for (const target of round.plates) {
    let position = { ...round.spawn };
    position = await move(position, target);
    await shift();
  }
  await page.waitForTimeout(4200);
  let position = { ...round.spawn };
  for (const target of round.route) position = await move(position, target);
  await page.waitForTimeout(900);
  await page.locator(`html[data-echo-completed="${round.number}"]`).waitFor({ timeout: 3000 });
}

console.log(JSON.stringify({ errors, solved: rounds.map((round) => round.number) }));
await browser.close();
if (errors.length > 0) process.exit(1);
