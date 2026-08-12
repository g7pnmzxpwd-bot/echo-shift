import { chromium } from 'playwright-core';

const baseUrl = process.env.ECHO_SHIFT_URL ?? 'http://127.0.0.1:5173';
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.addInitScript(() => {
  localStorage.setItem('echo-shift-progress-v1', JSON.stringify({
    unlocked: 36,
    completed: Array.from({ length: 35 }, (_, index) => index + 1),
  }));
});

const representativeRounds = [1, 7, 13, 19, 25, 31, 36];
for (const round of representativeRounds) {
  await page.goto(`${baseUrl}/?round=${round}`, { waitUntil: 'networkidle' });
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.locator('canvas').click({ position: { x: 480, y: 300 } });
  await page.waitForTimeout(180);
  const label = await page.locator('#rounds-button').innerText();
  if (!label.includes(`${String(round).padStart(2, '0')}/36`)) {
    throw new Error(`Round ${round} did not become current: ${label}`);
  }
}

await page.locator('#rounds-button').click();
const chapterCount = await page.locator('.chapter-block').count();
const roundCount = await page.locator('.round-card').count();
const disabledCount = await page.locator('.round-card:disabled').count();
if (chapterCount !== 6 || roundCount !== 36 || disabledCount !== 0) {
  throw new Error(`Round grid mismatch: chapters=${chapterCount}, rounds=${roundCount}, disabled=${disabledCount}`);
}
await page.screenshot({ path: '/tmp/echo-shift-round-select.png', fullPage: true });
await page.locator('[data-round="36"]').click();
await page.locator('canvas').click({ position: { x: 480, y: 300 } });
await page.waitForTimeout(250);
await page.screenshot({ path: '/tmp/echo-shift-round-36.png', fullPage: true });

const result = {
  errors,
  representativeRounds,
  chapterCount,
  roundCount,
  current: await page.locator('#rounds-button').innerText(),
  canvasCount: await page.locator('canvas').count(),
};
console.log(JSON.stringify(result));
await browser.close();
if (errors.length > 0) process.exit(1);
