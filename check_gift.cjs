const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://fragment.com/gift/berrybox', { waitUntil: 'networkidle2' });
    const html = await page.content();
    const urls = html.match(/https:\/\/fragment\.com\/file\/gifts\/[^"'\s]+/g);
    console.log(urls ? [...new Set(urls)] : "No URLs");
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
