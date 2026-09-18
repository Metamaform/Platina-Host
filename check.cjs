const fs = require('fs');
const text = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');
let lines = text.split('\n');
let count = 0;
for(let i=0; i<lines.length; i++) {
  let line = lines[i];
  let opens = (line.match(/<div/g) || []).length + (line.match(/<motion\.div/g) || []).length;
  let closes = (line.match(/<\/div>/g) || []).length + (line.match(/<\/motion\.div>/g) || []).length;
  count += opens - closes;
  if (count === 0 && closes > 0) {
     console.log("Hits 0 at line:", i + 1);
  }
}
console.log("Final count:", count);
