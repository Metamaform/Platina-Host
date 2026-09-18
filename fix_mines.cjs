const fs = require('fs');

let code = fs.readFileSync('src/components/Mines.tsx', 'utf8');

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

if (!code.includes('getInitialMinesSession =')) {
  code = code.replace('export function Mines', match => getInitialMinesSession + '\n' + match);
}

fs.writeFileSync('src/components/Mines.tsx', code);
console.log('Fixed Mines.tsx');
