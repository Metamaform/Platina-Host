const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const additions = {
  ru: `    'rocket_auto_withdraw': 'Авто-вывод',`,
  en: `    'rocket_auto_withdraw': 'Auto withdraw',`,
  zh: `    'rocket_auto_withdraw': '自动提现',`
};

for (const lang of Object.keys(additions)) {
  const regex = new RegExp(`(${lang}: \\{[\\s\\S]*?)(  \\}(,|\\n))`);
  content = content.replace(regex, `$1${additions[lang]}\n$2`);
}

fs.writeFileSync('src/lib/i18n.ts', content);
