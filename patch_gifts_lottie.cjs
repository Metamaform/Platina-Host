const fs = require('fs');
const path = './data/gifts.json';
const gifts = JSON.parse(fs.readFileSync(path, 'utf8'));

const mapping = {
  'chillflame': '/chillflame-1.lottie.json',
  'crystalball': '/crystalball-1.lottie.json',
  'diamondring': '/diamondring-1.lottie.json',
  'holidaydrink': '/holidaydrink-1.lottie.json',
  'swagbag': '/swagbag-1.lottie.json'
};

let modified = false;
for (const gift of gifts) {
  if (mapping[gift.slug]) {
    gift.lottie_url = mapping[gift.slug];
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync(path, JSON.stringify(gifts, null, 2));
  console.log('Updated gifts.json with local lottie models');
}

