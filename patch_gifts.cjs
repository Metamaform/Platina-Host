const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const additions = {
  ru: `    'gifts': 'Подарки',`,
  en: `    'gifts': 'Gifts',`,
  zh: `    'gifts': '礼物',`
};

for (const lang of Object.keys(additions)) {
  const regex = new RegExp(`(${lang}: \\{[\\s\\S]*?)(  \\}(,|\\n))`);
  content = content.replace(regex, `$1${additions[lang]}\n$2`);
}

fs.writeFileSync('src/lib/i18n.ts', content);

let gameContent = fs.readFileSync('src/components/NewGame.tsx', 'utf8');
gameContent = gameContent.replace(
  />\s*Gifts\s*<\/button>/,
  `>{t('gifts')}</button>`
);
fs.writeFileSync('src/components/NewGame.tsx', gameContent);
