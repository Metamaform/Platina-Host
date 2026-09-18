const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://fragment.com/gifts', { waitUntil: 'networkidle2' });
  const html = await page.content();
  console.log(html.substring(0, 500));
  const matches = html.match(/https:\/\/fragment\.com\/file\/gifts\/[^"'\s]+/g);
  console.log(matches ? matches.length : 0);
  if (matches) console.log(matches.slice(0, 10));
  await browser.close();
})();
