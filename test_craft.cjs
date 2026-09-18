const fs = require('fs');
const code = fs.readFileSync('src/components/Craft.tsx', 'utf8');
console.log(code.match(/useEffect\(\(\) => {[\s\S]*?craft_sourceModelIds[\s\S]*?}, \[inventory\]\);/)?.[0]);
