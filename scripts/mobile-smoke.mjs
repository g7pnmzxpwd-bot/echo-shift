import { chromium, webkit } from 'playwright-core';

const baseUrl = process.env.ECHO_SHIFT_URL ?? 'http://127.0.0.1:5173';
const browserName = process.env.ECHO_SHIFT_BROWSER ?? 'chromium';
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browserType = browserName === 'webkit' ? webkit : chromium;
const browser = await browserType.launch(browserName === 'webkit' ? { headless: true } : { executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
await page.goto(`${baseUrl}/?round=1`, { waitUntil: 'networkidle' });
await page.locator('canvas').tap({ position: { x: 195, y: 120 } });

let pointerId = 1;
const holdControl = async (control, milliseconds) => {
  const button = page.locator(`[data-control="${control}"]`);
  await button.dispatchEvent('pointerdown', { pointerId: pointerId++, pointerType: 'touch', isPrimary: true });
  await page.waitForTimeout(milliseconds);
  await button.dispatchEvent('pointerup', { pointerId: pointerId - 1, pointerType: 'touch', isPrimary: true });
};
await holdControl('up', 1710);
await holdControl('right', 970);
await holdControl('shift', 180);
await page.waitForTimeout(250);
await holdControl('up', 250);
await holdControl('right', 5000);
await page.waitForTimeout(700);
await page.screenshot({ path: `/tmp/echo-shift-mobile-${browserName}-final.png`, fullPage: true });
const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('echo-shift-progress-v1') ?? '{}'));
if (!progress.completed?.includes(1)) throw new Error(`Touch playthrough did not complete round 1: ${JSON.stringify(progress)} errors=${JSON.stringify(errors)}`);

await page.locator('#rounds-button').tap();
const roundCount = await page.locator('.round-card').count();
const panelBox = await page.locator('#round-panel').boundingBox();
await page.screenshot({ path: `/tmp/echo-shift-mobile-${browserName}-rounds.png`, fullPage: true });
console.log(JSON.stringify({ browser: browserName, errors, completed: progress.completed, roundCount, panelBox }));
await browser.close();
if (errors.length > 0 || roundCount !== 36) process.exit(1);
