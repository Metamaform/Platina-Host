const fs = require('fs');
let content = fs.readFileSync('src/components/Mines.tsx', 'utf8');

// 1. Add bombKey ref
const oldRef = `const [grid, setGrid] = useState<Cell[]>([]);`;
const newRef = `const [grid, setGrid] = useState<Cell[]>([]);
  const bombKey = useRef(Date.now());`;
content = content.replace(oldRef, newRef);

// 2. Update bombKey on mine click
const oldMineClick = `if (isMine) {
      setGrid(prev => prev.map((cell, i) => ({ ...cell, revealed: true, manualReveal: i === index })));`;
const newMineClick = `if (isMine) {
      bombKey.current = Date.now();
      setGrid(prev => prev.map((cell, i) => ({ ...cell, revealed: true, manualReveal: i === index })));`;
content = content.replace(oldMineClick, newMineClick);

// 3. Update Bomb img src to include bombKey
const oldRender = `{cell.manualReveal ? (
                          <img src="/Bomb.webp" alt="Exploding Bomb" className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                        ) : (
                          <img src="/Bomb_static.webp" alt="Bomb" className="w-[85%] h-[85%] object-contain opacity-80" />
                        )}`;
const newRender = `{cell.manualReveal ? (
                          <img src={\`/Bomb.webp?v=\${bombKey.current}\`} alt="Exploding Bomb" className="w-[100%] h-[100%] object-contain drop-shadow-md scale-125" />
                        ) : (
                          <img src="/Bomb_static.webp" alt="Bomb" className="w-[70%] h-[70%] object-contain opacity-70" />
                        )}`;
content = content.replace(oldRender, newRender);

fs.writeFileSync('src/components/Mines.tsx', content);
