const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const ruAdd = `    'select_source_title': 'Выберите товары или товары и баланс для использования.',
    'select_source_desc': 'Вы можете выбрать несколько товаров.',
    'select_target_title': 'Выберите элемент для обновления',
    'upgrade_btn': 'Обновление',`;
content = content.replace(/'upgrade_title': 'Апгрейд',/, "'upgrade_title': 'Апгрейд',\n" + ruAdd);

const enAdd = `    'select_source_title': 'Select items or balance to use.',
    'select_source_desc': 'You can select multiple items.',
    'select_target_title': 'Select element to upgrade',
    'upgrade_btn': 'Upgrade',`;
content = content.replace(/'upgrade_title': 'Upgrade',/, "'upgrade_title': 'Upgrade',\n" + enAdd);

const zhAdd = `    'select_source_title': '选择要使用的物品或余额。',
    'select_source_desc': '您可以选择多个物品。',
    'select_target_title': '选择要升级的元素',
    'upgrade_btn': '升级',`;
content = content.replace(/'upgrade_title': '升级',/, "'upgrade_title': '升级',\n" + zhAdd);

fs.writeFileSync('src/lib/i18n.ts', content);
