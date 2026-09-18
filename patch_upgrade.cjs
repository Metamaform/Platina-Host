const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// 1. Title shadow
content = content.replace(
  '<h1 className="font-display text-lg font-bold text-white drop-shadow-md">Апгрейд</h1>',
  '<h1 className="font-display text-lg font-bold text-white">Апгрейд</h1>'
);

// 2. Button text and style
content = content.replace(
  '⬆ Апгрейд',
  'Апгрейд'
);
content = content.replace(
  'bg-[#fbc740]',
  'bg-brand'
);
content = content.replace(
  'bg-[#fbc740]/90',
  'bg-brand/90'
);
content = content.replace(
  'rgba(251,199,64,0.3)',
  'rgba(255,184,0,0.3)'
);
// replace remaining #fbc740 with brand for text and borders
content = content.replace(/text-\[\#fbc740\]/g, 'text-brand');
content = content.replace(/border-\[\#fbc740\]/g, 'border-brand');

// 3. Visual Chance
content = content.replace(
  'let chance = target ? (totalBet / target.floor_price_gram) * 100 : 0;',
  `let chance = target ? (totalBet / target.floor_price_gram) * 100 : 0;\n  const visualChance = (!target && totalBet === 0) ? 50 : chance;`
);

content = content.replace(
  /<circle\s+cx="50"\s+cy="50"\s+r="44"\s+fill="none"\s+stroke="#fbc740"\s+strokeWidth="8"\s+strokeDasharray=\{`\$\{\(chance \/ 100\) \* 276\.46\} 276\.46`\}\s+strokeLinecap="round"\s+style=\{\{\s*filter:\s*"drop-shadow\(0 0 10px rgba\(251,199,64,0\.6\)\)"\s*\}\}\s*\/>/,
  `<circle 
                    cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" 
                    strokeDasharray={\`\${(visualChance / 100) * 276.46} 276.46\`}
                    strokeLinecap="round"
                    className={\`transition-all duration-500 \${visualChance > 0 ? 'text-brand' : 'text-transparent'}\`}
                    style={{ filter: visualChance > 0 ? "drop-shadow(0 0 10px rgba(255,184,0,0.6))" : "none" }}
                  />`
);

// 4. Move balance block
const oldBalanceBlock = `                {/* Balance Input */}
                <div className="flex flex-col items-center gap-1 w-full mt-auto">
                  <div className="flex items-center gap-1.5 bg-[#0d0d0f] px-2 py-1.5 rounded-[8px] border border-white/5 w-full">
                    <GramIcon className="w-3.5 h-3.5 text-brand" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={gramBetInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^[0-9]*\\.?[0-9]*$/.test(val)) {
                          if (val !== '' && parseFloat(val) > balance) setGramBetInput(balance.toString());
                          else setGramBetInput(val);
                        }
                      }}
                      placeholder="0.0 Баланс"
                      className="bg-transparent text-left text-white font-bold text-[12px] w-full outline-none placeholder:text-white/20"
                      disabled={spinning}
                    />
                  </div>
                  <span className="text-[13px] font-bold text-brand flex items-center justify-center gap-1 mt-1">
                    Общ: {totalBet.toFixed(2)} <GramIcon className="w-3 h-3" />
                  </span>
                </div>`;

content = content.replace(oldBalanceBlock, '');

const newBalanceBlock = `
        {/* GRAM Bet block */}
        <div className="w-full px-4 mb-4 space-y-2">
          <div className="bg-[#151619] rounded-[16px] p-3 flex items-center justify-between border border-white/5">
             <span className="text-white/50 text-[12px] font-bold uppercase tracking-wider ml-1">Ставка балансом</span>
             <div className="flex items-center gap-2 bg-[#0a0a0c] px-3 py-2 rounded-[10px] border border-white/10">
               <input
                 type="text"
                 inputMode="decimal"
                 value={gramBetInput}
                 onChange={(e) => {
                   const val = e.target.value.replace(',', '.');
                   if (val === '' || /^[0-9]*\\.?[0-9]*$/.test(val)) {
                     if (val !== '' && parseFloat(val) > balance) setGramBetInput(balance.toString());
                     else setGramBetInput(val);
                   }
                 }}
                 placeholder="0.00"
                 className="bg-transparent text-right text-white font-bold text-[14px] w-20 outline-none placeholder:text-white/20"
                 disabled={spinning}
               />
               <GramIcon className="w-4 h-4 text-brand" />
             </div>
          </div>
          <div className="flex items-center justify-between px-2">
             <span className="text-white/40 text-[11px] uppercase tracking-widest font-bold">Общая стоимость</span>
             <span className="text-brand font-bold text-[13px] flex items-center gap-1">{totalBet.toFixed(2)} <GramIcon className="w-3.5 h-3.5"/></span>
          </div>
        </div>
`;

content = content.replace('        {/* Upgrade Button */}', newBalanceBlock + '        {/* Upgrade Button */}');

fs.writeFileSync('src/components/Upgrade.tsx', content);
