const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

content = content.replace(
  /<polyline points="18 15 12 9 6 15"><\/polyline>\s*<polyline points="18 21 12 15 6 21"><\/polyline>/g,
  '<polyline points="18 11 12 5 6 11"></polyline>\n             <polyline points="18 17 12 11 6 17"></polyline>'
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
