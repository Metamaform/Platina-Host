const fs = require('fs');
let content = fs.readFileSync('src/components/Mines.tsx', 'utf8');

const broken = `{cell.isMine ? (
                        {cell.manualReveal ? (
                          <img src="/Bomb.webp" alt="Exploding Bomb" className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                        ) : (
                          <img src="/Bomb_static.webp" alt="Bomb" className="w-[85%] h-[85%] object-contain opacity-80" />
                        )}
                      ) : cell.cellNft ? (`;

const fixed = `{cell.isMine ? (
                        cell.manualReveal ? (
                          <img src="/Bomb.webp" alt="Exploding Bomb" className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                        ) : (
                          <img src="/Bomb_static.webp" alt="Bomb" className="w-[85%] h-[85%] object-contain opacity-80" />
                        )
                      ) : cell.cellNft ? (`;

content = content.replace(broken, fixed);
fs.writeFileSync('src/components/Mines.tsx', content);
