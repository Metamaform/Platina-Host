const fs = require('fs');

let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// 1. Add visualChance
const chanceLine = `let chance = target ? (totalBet / target.floor_price_gram) * 100 : 0;`;
const visualChanceLine = `let chance = target ? (totalBet / target.floor_price_gram) * 100 : 0;\n  const visualChance = (!target && totalBet === 0) ? 50 : chance;`;

if (!content.includes('visualChance')) {
    content = content.replace(chanceLine, visualChanceLine);
}

// 2. Update circle
const oldCircle = `<circle \n                    cx="50" cy="50" r="44" fill="none" stroke="#fbc740" strokeWidth="8" \n                    strokeDasharray={\`\${(chance / 100) * 276.46} 276.46\`}\n                    strokeLinecap="round"\n                    style={{ filter: "drop-shadow(0 0 10px rgba(251,199,64,0.6))" }}\n                  />`;

const newCircle = `<circle 
                    cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" 
                    strokeDasharray={\`\${(visualChance / 100) * 276.46} 276.46\`}
                    strokeLinecap="round"
                    className={\`transition-all duration-500 \${visualChance > 0 ? 'text-brand' : 'text-transparent'}\`}
                    style={{ filter: visualChance > 0 ? "drop-shadow(0 0 10px rgba(255,184,0,0.6))" : "none" }}
                  />`;

if (content.includes(oldCircle)) {
    content = content.replace(oldCircle, newCircle);
} else {
    // maybe spacing is different, let's use regex
    content = content.replace(/<circle[^>]*cx="50"[^>]*cy="50"[^>]*r="44"[^>]*stroke="#fbc740"[^>]*\/>/g, newCircle);
}

// 3. Move Balance Input
const oldBalanceBlock = `{/* Balance Input */}
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

if (content.includes(oldBalanceBlock)) {
    content = content.replace(oldBalanceBlock, '');
}

const middleSelectionEnd = `</div>\n\n        {/* Upgrade Button */}`;
const newBalanceBlock = `</div>

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

        {/* Upgrade Button */}`;

content = content.replace(middleSelectionEnd, newBalanceBlock);

fs.writeFileSync('src/components/Upgrade.tsx', content);
