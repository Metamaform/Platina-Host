const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

content = content.replace(
  '<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#4f8eff]/10 blur-[50px] rounded-full pointer-events-none" />',
  '<div className="absolute inset-0 opacity-30 bg-[url(\'/apgreyd.jpg\')] bg-cover bg-center mix-blend-screen pointer-events-none" />\n          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b1e] via-transparent to-[#1a1b1e]/50 pointer-events-none" />\n          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#4f8eff]/15 blur-[60px] rounded-full pointer-events-none" />'
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
