import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.locator('canvas').click({ position: { x: 480, y: 300 } });

await page.keyboard.down('ArrowUp');
await page.waitForTimeout(1750);
await page.keyboard.up('ArrowUp');
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1000);
await page.keyboard.up('ArrowRight');
await page.keyboard.down('Space');
await page.waitForTimeout(180);
await page.keyboard.up('Space');
await page.waitForTimeout(350);
await page.screenshot({ path: '/tmp/echo-shift-after-shift.png' });

await page.keyboard.down('ArrowUp');
await page.waitForTimeout(250);
await page.keyboard.up('ArrowUp');
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(4300);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(1100);
await page.screenshot({ path: '/tmp/echo-shift-victory.png' });

await page.keyboard.down('r');
await page.waitForTimeout(180);
await page.keyboard.up('r');
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/echo-shift-restarted.png' });

console.log(JSON.stringify({ errors, title: await page.title(), canvasCount: await page.locator('canvas').count() }));
await browser.close();
