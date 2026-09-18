const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

content = content.replace(
  /'welcome_loading': 'Загрузка...',/,
  `'players_list': 'Список игроков',\n    'welcome_loading': 'Загрузка...',`
);

content = content.replace(
  /'welcome_loading': 'Loading...',/,
  `'players_list': 'Players list',\n    'welcome_loading': 'Loading...',`
);

content = content.replace(
  /'welcome_loading': '正在加载...',/,
  `'players_list': '玩家列表',\n    'welcome_loading': '正在加载...',`
);

fs.writeFileSync('src/lib/i18n.ts', content);
