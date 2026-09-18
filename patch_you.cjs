const fs = require('fs');
let content = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

content = content.replace(
  />\s*You\s*<\/span>/,
  `>{t('you')}</span>`
);

fs.writeFileSync('src/components/NewGame.tsx', content);
