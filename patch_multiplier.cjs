const fs = require('fs');
let content = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

const oldClasses = "`relative z-10 flex flex-col items-center justify-center h-full pointer-events-none transition-all duration-300 ${currentGameState === 'flying' && currentAffordableNft ? '-mt-6' : ''}`";
const newClasses = "`absolute inset-x-0 top-8 z-10 flex flex-col items-center pointer-events-none transition-all duration-300`";

content = content.replace(oldClasses, newClasses);

fs.writeFileSync('src/components/NewGame.tsx', content);
