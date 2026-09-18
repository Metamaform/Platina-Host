const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// Revert the previous patch first if needed, but it's easier to just use regex
content = content.replace(
  /w-28 h-28 sm:w-36 sm:h-36/g,
  'w-40 h-40 sm:w-52 sm:h-52'
);

content = content.replace(
  /cx="50" cy="50" r="44" fill="none" stroke="#ef4444" strokeWidth="8" strokeOpacity="0.8"/g,
  'cx="50" cy="50" r="46" fill="none" stroke="#25262b" strokeWidth="4" />\n                    <circle cx="50" cy="50" r="44" fill="none" stroke="#ef4444" strokeWidth="6" strokeOpacity="0.8" style={{ filter: "drop-shadow(0 0 10px rgba(239,68,68,0.5))" }}'
);

content = content.replace(
  /cx="50" cy="50" r="44" fill="none" stroke="#22c55e" strokeWidth="8"/g,
  'cx="50" cy="50" r="44" fill="none" stroke="#22c55e" strokeWidth="8" style={{ filter: "drop-shadow(0 0 12px rgba(34,197,94,0.8))" }}'
);

// We want krug_apgreyd to be exactly positioned
content = content.replace(
  /<img src="\/krug_apgreyd.png"[^>]*\/>/g,
  ''
);

content = content.replace(
  /<svg viewBox="0 0 100 100" className="w-full h-full overflow-visible relative z-10">/g,
  '<svg viewBox="0 0 100 100" className="w-full h-full overflow-visible relative z-10">'
);
// I might have replaced it incorrectly above, let's just do a clean replacement of the whole motion.div
fs.writeFileSync('src/components/Upgrade.tsx', content);
