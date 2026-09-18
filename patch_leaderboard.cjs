const fs = require('fs');
let content = fs.readFileSync('src/components/Leaderboard.tsx', 'utf8');

// 1. Fix HTML tags rendering in prizes_desc
content = content.replace(
  /{t\('prizes_desc'\)}/g,
  '<span dangerouslySetInnerHTML={{ __html: t(\'prizes_desc\') }} />'
);

// 2. Fix Got it button
content = content.replace(
  /Got it\s*<\/button>/g,
  '{t(\'got_it\')}\n              </button>'
);

fs.writeFileSync('src/components/Leaderboard.tsx', content);
