const fs = require('fs');
let content = fs.readFileSync('src/components/Mines.tsx', 'utf8');

// 1. Update manualReveal on mine click
const oldMineClick = `setGrid(prev => prev.map(cell => ({ ...cell, revealed: true, manualReveal: false })));`;
const newMineClick = `setGrid(prev => prev.map((cell, i) => ({ ...cell, revealed: true, manualReveal: i === index })));`;
content = content.replace(oldMineClick, newMineClick);

// 2. Render Bomb image
const oldRender = `<Bomb className="w-10 h-10 text-danger drop-shadow-md" />`;
const newRender = `{cell.manualReveal ? (
                          <img src="/Bomb.webp" alt="Exploding Bomb" className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                        ) : (
                          <img src="/Bomb_static.webp" alt="Bomb" className="w-[85%] h-[85%] object-contain opacity-80" />
                        )}`;
content = content.replace(oldRender, newRender);

fs.writeFileSync('src/components/Mines.tsx', content);
