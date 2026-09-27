import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

// Isolated browser fixture: no Telegram authentication or payment services.
// Run with: npx tsx --test tests/dragControls.test.ts

test('drag controls: native input, isolated previews and interruptible sheets', async (t) => {
  const bundle = await build({
    stdin: {
      contents: `
        import React, {useState} from 'react';
        import {createRoot} from 'react-dom/client';
        import {RangeControl} from './src/components/ui/RangeControl';
        import {Sheet} from './src/components/ui/Sheet';
        window.renders = 0;
        window.commits = [];
        function Fixture() {
          window.renders++;
          const [value, setValue] = useState(1);
          const [open, setOpen] = useState(false);
          return <>
            <RangeControl value={value} min={1} max={24} label="Mines"
              onValueCommit={v => {window.commits.push(v); setValue(v)}} />
            <button id="reset" onClick={() => setValue(5)}>Reset</button>
            <button id="open" onClick={() => setOpen(true)}>Open</button>
            <Sheet open={open} onClose={() => setOpen(false)} title="Settings" maxHeight="220px">
              {Array.from({length: 40}, (_, i) => <p key={i}>Scrollable row {i}</p>)}
            </Sheet>
          </>;
        }
        createRoot(document.getElementById('root')).render(<Fixture />);
      `,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const stylesheet = await readFile('src/index.css', 'utf8');
  const css = stylesheet.slice(stylesheet.indexOf('/* Native thumb'));
  const server = createServer((req, res) => {
    if (req.url === '/fixture.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(bundle.outputFiles[0].text);
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>${css}
          :root {--color-brand: #0098ea}
          body {margin: 16px}
          * {box-sizing: border-box}
          output {display: inline-block; width: 56px; font-variant-numeric: tabular-nums}
          input[type=range] {width: 300px}
          [data-sheet-root] {position: fixed; inset: 0; display: flex; align-items: end}
          [data-sheet-root] > div:last-child {width: 100%; background: #35363b}
          [data-sheet-drag-handle] {touch-action: none; padding: 12px}
          [data-nodrag] {overflow-y: auto}
        </style><div id="root"></div><script src="/fixture.js"></script>`);
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800, hasTouch: true });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    const address = server.address() as {port: number};
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.waitForSelector('input[type=range]');
    const input = await page.$('input[type=range]');
    const box = (await input!.boundingBox())!;
    const y = box.y + box.height / 2;
    const value = () => page.$eval('input', el => Number((el as HTMLInputElement).value));
    const commits = () => page.evaluate(() => (window as any).commits as number[]);

    await t.test('pointer preview does not rerender parent; release outside commits once', async () => {
      const renders = await page.evaluate(() => (window as any).renders);
      await page.mouse.move(box.x + 12, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 1, y, {steps: 24});
      assert.equal(await value(), 24);
      assert.equal(await page.$eval('output', el => el.textContent), '24');
      assert.equal(await page.evaluate(() => (window as any).renders), renders);
      assert.deepEqual(await commits(), []);
      await page.mouse.move(399, y + 60);
      await page.mouse.up();
      assert.deepEqual(await commits(), [24]);
    });

    await t.test('keyboard and external reset remain controlled', async () => {
      await input!.focus();
      await page.keyboard.press('Home');
      assert.equal(await value(), 1);
      await page.keyboard.press('End');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await value(), 23);
      await page.click('#reset');
      assert.equal(await value(), 5);
      assert.equal(await page.$eval('output', el => el.textContent), '5');
    });

    await t.test('cancel and blur commit the visible value and end the gesture', async () => {
      for (const end of ['cancel', 'blur']) {
        const before = (await commits()).length;
        await page.mouse.move(box.x + 65, y);
        await page.mouse.down();
        await page.mouse.move(box.x + 180, y, {steps: 8});
        const visible = await value();
        await page.$eval('input', (el, end) => {
          if (end === 'blur') (el as HTMLInputElement).blur();
          else el.dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId: 1}));
        }, end);
        await page.mouse.up();
        assert.equal((await commits()).length, before + 1);
        assert.equal((await commits()).at(-1), visible);
      }
    });

    await t.test('touch dragging updates immediately without scrolling the page', async () => {
      const session = await page.createCDPSession();
      await session.send('Emulation.setCPUThrottlingRate', {rate: 4});
      const before = (await commits()).length;
      const scrollY = await page.evaluate(() => window.scrollY);
      const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0) =>
        session.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
      await send('touchStart', box.x + 12);
      for (let x = box.x + 24; x < box.x + box.width; x += 12) await send('touchMove', x);
      await send('touchMove', box.x + box.width - 1);
      assert.equal(await value(), 24);
      assert.equal((await commits()).length, before);
      await send('touchEnd');
      assert.equal((await commits()).at(-1), 24);
      assert.equal(await page.evaluate(() => window.scrollY), scrollY);
      await session.send('Emulation.setCPUThrottlingRate', {rate: 1});
      await session.detach();
    });

    await t.test('sheet cancels spring on grab, ignores body drags and restores after cancel', async () => {
      await page.click('#open');
      await page.waitForSelector('[data-sheet-drag-handle]');
      const panel = '[data-sheet-root] > div:last-child';
      await page.waitForFunction(selector => {
        const el = document.querySelector(selector)!;
        return Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) < 0.1;
      }, {}, panel);
      const header = (await (await page.$('[data-sheet-drag-handle]'))!.boundingBox())!;
      await page.mouse.move(header.x + 100, header.y + 10);
      await page.mouse.down();
      await page.mouse.move(header.x + 100, header.y + 70, {steps: 6});
      const offset = await page.$eval(panel, el => new DOMMatrix(getComputedStyle(el).transform).m42);
      assert.ok(Math.abs(offset - 60) < 2, `expected 60px, got ${offset}`);
      await page.$eval(panel, el => el.dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId: 1})));
      await page.mouse.up();
      // Re-grab during snap-back. The existing offset must not jump to zero.
      const movingHeader = (await (await page.$('[data-sheet-drag-handle]'))!.boundingBox())!;
      await page.mouse.move(movingHeader.x + 100, movingHeader.y + 10);
      await page.mouse.down();
      const grabbed = await page.$eval(panel, el => new DOMMatrix(getComputedStyle(el).transform).m42);
      await page.mouse.move(movingHeader.x + 100, movingHeader.y + 30);
      await page.waitForFunction(({panel, grabbed}) => {
        const offset = new DOMMatrix(getComputedStyle(document.querySelector(panel)!).transform).m42;
        return Math.abs(offset - grabbed - 20) < 2;
      }, {}, {panel, grabbed});
      await page.$eval(panel, el => el.dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId: 1})));
      await page.mouse.up();
      await page.waitForFunction(selector => Math.abs(new DOMMatrix(getComputedStyle(document.querySelector(selector)!).transform).m42) < 0.1, {}, panel);
      const body = (await (await page.$('[data-nodrag]'))!.boundingBox())!;
      await page.mouse.move(body.x + 100, body.y + 20);
      await page.mouse.down();
      await page.mouse.move(body.x + 100, body.y + 90, {steps: 5});
      await page.mouse.up();
      assert.ok(Math.abs(await page.$eval(panel, el => new DOMMatrix(getComputedStyle(el).transform).m42)) < 0.1);
      // Scrollable content must not inherit touch-action:none from the panel.
      assert.equal(await page.$eval(panel, el => getComputedStyle(el).touchAction), 'auto');
    });
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
