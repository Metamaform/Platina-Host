const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

content = content.replace(
  /<circle cx="50" cy="50" r="44" fill="none" stroke="#18191d" strokeWidth="12" \/>/g,
  '<circle cx="50" cy="50" r="44" fill="none" stroke="#18191d" strokeWidth="12" strokeOpacity="0.3" />'
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
