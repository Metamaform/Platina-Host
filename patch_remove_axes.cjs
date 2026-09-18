const fs = require('fs');
let code = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

const regex = /\{\/\*\s*Left Y-axis Scale\s*\*\/\}.*?<\/div>\s*\)\}/s;

if (regex.test(code)) {
  fs.writeFileSync('src/components/NewGame.tsx', code.replace(regex, '{/* Left Y-axis Scale Removed */}'));
  console.log("Removed axes using regex");
} else {
  console.log("Regex not found");
}
