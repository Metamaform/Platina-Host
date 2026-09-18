const fs = require('fs');
let code = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

const target = `            {/* Left Y-axis Scale */}
            {currentGameState !== 'waiting' && (
              <div 
                className="absolute left-0 inset-y-0 w-12 z-0 pointer-events-none overflow-hidden" 
              >
                {(() => {
                  const m = Math.max(1, currentGameState === 'crashed' ? (serverState?.crashMultiplier || liveMult) : liveMult);
                  const range = Math.max(0.5, m * 0.5); 
                  const minVisible = m - range;
                  const maxVisible = m + range;
                  const rawStep = range / 2.5; 

                  let step = 0.1;
                  if (rawStep >= 0.2) step = 0.5;
                  if (rawStep >= 0.5) step = 1;
                  if (rawStep >= 1) step = 2;
                  if (rawStep >= 2) step = 5;
                  if (rawStep >= 5) step = 10;
                  if (rawStep >= 10) step = 20;
                  if (rawStep >= 20) step = 50;
                  if (rawStep >= 50) step = 100;

                  const startTick = Math.floor(minVisible / step) * step;
                  const ticks = [];
                  for(let t = startTick; t <= maxVisible + step; t += step) {
                    if (t >= 1.0) ticks.push(t);
                  }

                  return ticks.map(t => {
                    const y = 50 - ((t - m) / range) * 50;
                    if (y < -10 || y > 110) return null;
                    return (
                      <div key={t} className="absolute left-0 w-full flex items-center gap-1 opacity-50" style={{ top: \`\${y}%\`, transform: 'translateY(-50%)' }}>
                        <span className="text-[9px] font-bold text-white/50 w-8 text-right">{t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}x</span>
                        <div className="w-1.5 h-[1.5px] bg-white/40" />
                      </div>
                    );
                  });
                })()}
              </div>
            )}`;

const replacement = `            {/* Left Y-axis Scale */}
            {currentGameState !== 'waiting' && (
              <div 
                className="absolute left-0 inset-y-0 w-14 z-0 pointer-events-none border-r border-white/5" 
              >
                {(() => {
                  const m = Math.max(1, currentGameState === 'crashed' ? (serverState?.crashMultiplier || liveMult) : liveMult);
                  const range = Math.max(0.5, m * 0.5); 
                  const minVisible = m - range;
                  const maxVisible = m + range;
                  const rawStep = range / 2.5; 

                  let step = 0.1;
                  if (rawStep >= 0.1) step = 0.2;
                  if (rawStep >= 0.25) step = 0.5;
                  if (rawStep >= 0.5) step = 1;
                  if (rawStep >= 1) step = 2;
                  if (rawStep >= 2.5) step = 5;
                  if (rawStep >= 5) step = 10;
                  if (rawStep >= 10) step = 20;
                  if (rawStep >= 25) step = 50;
                  if (rawStep >= 50) step = 100;

                  const startTick = Math.floor(minVisible / step) * step;
                  const ticks = [];
                  for(let t = startTick; t <= maxVisible + step; t += step) {
                    if (t >= 1.0) ticks.push(t);
                  }

                  return ticks.map(t => {
                    const y = 50 - ((t - m) / range) * 50;
                    if (y < -10 || y > 110) return null;
                    
                    let label = t.toFixed(1);
                    if (t % 1 === 0 && step >= 1) label = t.toFixed(0);

                    return (
                      <div key={t} className="absolute left-0 w-full flex items-center pr-[4px]" style={{ top: \`\${y}%\`, transform: 'translateY(-50%)' }}>
                        <span className="text-[13px] font-black text-white/40 w-full text-right tracking-wide">{label}x</span>
                        <div className="absolute right-0 w-2 h-[2px] bg-white/10 translate-x-full" />
                      </div>
                    );
                  });
                })()}
              </div>
            )}`;

if (code.includes(target)) {
  fs.writeFileSync('src/components/NewGame.tsx', code.replace(target, replacement));
  console.log("Replaced");
} else {
  console.log("Not found");
}
