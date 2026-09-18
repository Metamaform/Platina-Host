const fs = require('fs');

let code = fs.readFileSync('src/components/Mines.tsx', 'utf8');

const importRegex = /import React, \{([^}]+)\} from 'react';/;
if (!code.includes('useMemo')) {
  code = code.replace(importRegex, "import React, { $1, useMemo } from 'react';");
}

const functionStart = /export const Mines:[^{]+{/;
const getInitialMinesSession = `
const getInitialMinesSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem('mines_session');
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed && parsed.gameState === 'playing') {
        return parsed;
      }
    }
  } catch {}
  return null;
};
`;

if (!code.includes('getInitialMinesSession')) {
  code = code.replace(functionStart, match => getInitialMinesSession + '\n' + match);
}

const stateRegex = /const \[minesCount, setMinesCount\] = useState<number>\(1\);\s*const \[gameState, setGameState\] = useState<'idle' \| 'playing'>\('idle'\);\s*const \[activeBetValue, setActiveBetValue\] = useState<number>\(0\);\s*const \[grid, setGrid\] = useState<\{[^\}]+\}\[\]>\(Array\(25\)\.fill\(\{ isMine: false, revealed: false \}\)\);\s*const \[safeOpened, setSafeOpened\] = useState\(0\);/m;

const replacementState = `  const initialSession = useMemo(() => getInitialMinesSession(), []);
  
  const [minesCount, setMinesCount] = useState<number>(initialSession?.minesCount || 1);
  const [gameState, setGameState] = useState<'idle' | 'playing'>(initialSession?.gameState || 'idle');
  const [activeBetValue, setActiveBetValue] = useState<number>(initialSession?.activeBetValue || 0);
  const [grid, setGrid] = useState<{isMine: boolean, revealed: boolean, manualReveal?: boolean, cellNft?: any}[]>(initialSession?.grid || Array(25).fill({ isMine: false, revealed: false }));
  const [safeOpened, setSafeOpened] = useState<number>(initialSession?.safeOpened || 0);

  useEffect(() => {
    if (gameState === 'playing') {
      localStorage.setItem('mines_session', JSON.stringify({
        gameState,
        activeBetValue,
        grid,
        safeOpened,
        minesCount
      }));
    } else {
      localStorage.removeItem('mines_session');
    }
  }, [gameState, activeBetValue, grid, safeOpened, minesCount]);
`;

code = code.replace(stateRegex, replacementState);

fs.writeFileSync('src/components/Mines.tsx', code);
console.log('Patched session persistence');
