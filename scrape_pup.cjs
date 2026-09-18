const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://fragment.com/gifts', { waitUntil: 'networkidle2' });
    const html = await page.content();
    console.log("Success! HTML length:", html.length);
    const matches = html.match(/https:\/\/fragment\.com\/file\/gifts\/[^\/]+\/model\.[^"'\s]+\.webp/g);
    console.log("Matches:", matches ? matches.length : 0);
    
    if (matches) {
      const fs = require('fs');
      const map = {};
      for (const m of matches) {
        const slug = m.split('/')[5];
        map[slug] = m;
      }
      
      const gifts = JSON.parse(fs.readFileSync('/app/applet/data/gifts.json', 'utf8'));
      let updated = 0;
      for (const gift of gifts) {
        if (map[gift.slug] && gift.image_url !== map[gift.slug]) {
          gift.image_url = map[gift.slug];
          // We clear lottie_url so it falls back to the clean static image
          gift.lottie_url = ''; 
          updated++;
          console.log("Updated", gift.slug);
        }
      }
      fs.writeFileSync('/app/applet/data/gifts.json', JSON.stringify(gifts, null, 2));
      fs.writeFileSync('/app/applet/src/gifts_data.json', JSON.stringify(gifts, null, 2));
      console.log(`Updated ${updated} gifts from scraper!`);
    }
    
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
