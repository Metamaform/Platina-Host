const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// We will add the img inside the motion.div
content = content.replace(
  '<svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">',
  `<img src="/krug_apgreyd.png" className="absolute inset-0 w-full h-full object-contain scale-[1.15] opacity-90" alt="wheel frame" />\n                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible relative z-10">`
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
