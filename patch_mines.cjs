const fs = require('fs');

function patch(filePath, prefix) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Find the useEffect that saves/removes the selectedNft from localStorage
  const effectRegex = new RegExp(`useEffect\\(\\(\\) => {\\s*if \\(selectedNft\\) {\\s*localStorage\\.setItem\\('${prefix}_selectedNftModel', selectedNft\\.id\\);\\s*} else {\\s*localStorage\\.removeItem\\('${prefix}_selectedNftModel'\\);\\s*}\\s*}, \\[selectedNft\\]\\);`, 's');
  
  if (effectRegex.test(code)) {
    const replacement = `  const isInitRef = useRef(false);
  useEffect(() => {
    if (!isInitRef.current) return;
    if (selectedNft) {
      localStorage.setItem('${prefix}_selectedNftModel', selectedNft.id);
    } else {
      localStorage.removeItem('${prefix}_selectedNftModel');
    }
  }, [selectedNft]);`;
    code = code.replace(effectRegex, replacement);
  }

  // Find the useEffect that reads from localStorage
  const readEffectRegex = new RegExp(`useEffect\\(\\(\\) => {\\s*try {\\s*const savedModel = localStorage\\.getItem\\('${prefix}_selectedNftModel'\\);\\s*if \\(savedModel\\) {\\s*const item = inventory\\.find\\(i => i\\.id === savedModel && !i\\.isWithdrawing\\);\\s*if \\(item\\) {\\s*setSelectedNft\\(item\\);\\s*} else {\\s*setSelectedNft\\(null\\);\\s*}\\s*}\\s*} catch {}\\s*}, \\[inventory\\]\\);`, 's');

  if (readEffectRegex.test(code)) {
    const replacement = `  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('${prefix}_selectedNftModel');
      if (savedModel) {
        const item = inventory.find(i => i.id === savedModel && !i.isWithdrawing);
        if (item) {
          setSelectedNft(item);
        } else if (inventory.length > 0) {
          setSelectedNft(null);
        }
      }
    } catch {}
    isInitRef.current = true;
  }, [inventory]);`;
    code = code.replace(readEffectRegex, replacement);
  }
  
  fs.writeFileSync(filePath, code);
}

patch('src/components/Mines.tsx', 'mines');
patch('src/components/NewGame.tsx', 'rocket');
console.log('Patched');
