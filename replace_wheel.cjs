const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

const wheelStart = content.indexOf('{/* Center: Wheel */}');
const wheelEnd = content.indexOf('{/* Right: Target */}');

if (wheelStart !== -1 && wheelEnd !== -1) {
  const replacement = `{/* Center: Wheel */}
          <div className="z-10 relative flex-1 flex justify-center shrink-0">
            <div className="relative w-40 h-40 sm:w-56 sm:h-56">
              
              <div className="w-full h-full -rotate-90">
                <motion.div className="w-full h-full drop-shadow-2xl relative" animate={controls}>
                  {/* Outer custom ring */}
                  <img src="/krug_apgreyd.png" className="absolute inset-0 w-full h-full object-contain scale-[1.05] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" alt="wheel frame" />
                  
                  {/* SVG Wheel overlay for win/lose zones */}
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible relative z-10">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#18191d" strokeWidth="12" />
                    {/* Background Circle (Red - Lose) */}
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#ef4444" strokeWidth="8" strokeOpacity="0.75" style={{ filter: "drop-shadow(0 0 8px rgba(239,68,68,0.5))" }} />
                    
                    {/* Foreground Circle (Green - Win) */}
                    <circle 
                      cx="50" cy="50" r="44" fill="none" stroke="#22c55e" strokeWidth="8" 
                      strokeDasharray={\`\${(chance / 100) * 276.46} 276.46\`}
                      strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 12px rgba(34,197,94,0.8))" }}
                    />
                  </svg>
                </motion.div>
              </div>
              
              {/* Top Pointer */}
              <div className="absolute -top-[18px] sm:-top-[22px] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] scale-[1.15] sm:scale-125">
                <svg width="26" height="30" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left Side */}
                  <path d="M13 28 L4 4 L13 9 Z" fill="url(#ptr_left)" />
                  {/* Right Side */}
                  <path d="M13 28 L13 9 L22 4 Z" fill="url(#ptr_right)" />
                  {/* Border */}
                  <path d="M13 28 L4 4 L13 9 L22 4 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="ptr_left" x1="8.5" y1="4" x2="8.5" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ffffff" />
                      <stop offset="1" stopColor="#9ca3af" />
                    </linearGradient>
                    <linearGradient id="ptr_right" x1="17.5" y1="4" x2="17.5" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#d1d5db" />
                      <stop offset="1" stopColor="#4b5563" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* Inner Circle Content */}
              <div className="absolute inset-[15%] sm:inset-[16%] bg-gradient-to-b from-[#25262b] to-[#1a1b1e] rounded-full shadow-[inset_0_4px_20px_rgba(0,0,0,0.5),0_0_15px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center pointer-events-none border-[3px] border-[#31333a]">
                <span className="text-2xl sm:text-4xl font-black font-display text-white tracking-tighter drop-shadow-md">{chance.toFixed(1)}<span className="text-sm sm:text-lg text-white/50">%</span></span>
                {multiplier > 0 && <span className="text-[10px] sm:text-[11px] text-[#fbc740] font-bold tracking-widest uppercase mt-0.5 sm:mt-1 px-2 py-0.5 bg-black/40 rounded shadow-inner">x{multiplier.toFixed(2)}</span>}
              </div>
            </div>
          </div>

          `;
  
  content = content.substring(0, wheelStart) + replacement + content.substring(wheelEnd);
  fs.writeFileSync('src/components/Upgrade.tsx', content);
}
