const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// Left down chevrons
content = content.replace(
  /<polyline points="6 9 12 15 18 9"><\/polyline>\s*<polyline points="6 3 12 9 18 3"><\/polyline>\s*<polyline points="6 -3 12 3 18 -3"><\/polyline>/g,
  '<polyline points="6 13 12 19 18 13"></polyline>\n                        <polyline points="6 7 12 13 18 7"></polyline>\n                        <polyline points="6 1 12 7 18 1"></polyline>'
);

// Right up chevrons
content = content.replace(
  /<polyline points="18 15 12 9 6 15"><\/polyline>\s*<polyline points="18 21 12 15 6 21"><\/polyline>\s*<polyline points="18 27 12 21 6 27"><\/polyline>/g,
  '<polyline points="18 11 12 5 6 11"></polyline>\n                        <polyline points="18 17 12 11 6 17"></polyline>\n                        <polyline points="18 23 12 17 6 23"></polyline>'
);

// Inner circle up chevrons (2 chevrons)
content = content.replace(
  /<polyline points="18 15 12 9 6 15"><\/polyline>\s*<polyline points="18 21 12 15 6 21"><\/polyline>\s*<\/svg>\s*<\/div>\s*<span className="text-\[12px\] font-bold text-white\/50/g,
  '<polyline points="18 11 12 5 6 11"></polyline>\n                   <polyline points="18 17 12 11 6 17"></polyline>\n                 </svg>\n               </div>\n               <span className="text-[12px] font-bold text-white/50'
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
