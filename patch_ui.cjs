const fs = require('fs');
let content = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

// 1. Shrink Status Pill and remove seconds from it
const oldPill = `{/* Status Pill */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className={\`w-2 h-2 rounded-full \${
                currentGameState === 'flying' ? 'bg-green-400 animate-ping' :
                currentGameState === 'crashed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
              }\`} />
              <span className="text-[11px] font-bold tracking-wider uppercase text-white/70">
                {currentGameState === 'waiting' ? \`\${t('start_in')} \${liveCountdown}\${t('sec')}\` :
                 currentGameState === 'flying' ? t('flying') : t('crashed')}
              </span>
            </div>`;

const newPill = `{/* Status Pill */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              <span className={\`w-1.5 h-1.5 rounded-full \${
                currentGameState === 'flying' ? 'bg-green-400 animate-ping' :
                currentGameState === 'crashed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
              }\`} />
              <span className="text-[9px] font-bold tracking-wider uppercase text-white/70">
                {currentGameState === 'waiting' ? t('start_in') :
                 currentGameState === 'flying' ? t('flying') : t('crashed')}
              </span>
            </div>`;

content = content.replace(oldPill, newPill);

// 2. Remove circle and add centered countdown
const oldMultiplier = `{/* Centered Multiplier and Countdown */}
            <div className={\`absolute inset-x-0 top-8 z-10 flex flex-col items-center pointer-events-none transition-all duration-300\`}>
              <AnimatePresence>
                {currentGameState === 'waiting' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="absolute w-44 h-44 flex items-center justify-center pointer-events-none"
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none scale-110" viewBox="0 0 176 176">
                      <circle
                        cx="88"
                        cy="88"
                        r="78"
                        className="stroke-brand fill-none transition-all duration-100 ease-linear"
                        strokeWidth="4"
                        strokeDasharray={490}
                        strokeDashoffset={490 * (1 - Math.max(0, Math.min(1, remainingMs / 5000)))}
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(255, 184, 0, 0.6))'
                        }}
                      />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              <span className={\`font-display font-black tracking-tight drop-shadow-md transition-colors z-10 \${
                currentGameState === 'crashed' 
                  ? 'text-4xl text-red-500' 
                  : liveMult < 1.2 
                    ? 'text-5xl text-red-500'
                    : liveMult < 3.0
                      ? 'text-5xl text-emerald-400'
                      : 'text-5xl text-brand'
              }\`}>
                x{(currentGameState === 'crashed' ? (serverState?.crashMultiplier || liveMult) : liveMult).toFixed(2)}
              </span>
            </div>`;

const newMultiplier = `{/* Multiplier (Top) & Countdown (Center) */}
            <AnimatePresence>
              {currentGameState === 'waiting' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                  <motion.div
                    key={liveCountdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-7xl font-display font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  >
                    {liveCountdown}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {currentGameState !== 'waiting' && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute inset-x-0 top-8 z-10 flex flex-col items-center pointer-events-none transition-all duration-300"
                >
                  <span className={\`font-display font-black tracking-tight drop-shadow-md transition-colors z-10 \${
                    currentGameState === 'crashed' 
                      ? 'text-4xl text-red-500' 
                      : liveMult < 1.2 
                        ? 'text-5xl text-red-500'
                        : liveMult < 3.0
                          ? 'text-5xl text-emerald-400'
                          : 'text-5xl text-brand'
                  }\`}>
                    x{(currentGameState === 'crashed' ? (serverState?.crashMultiplier || liveMult) : liveMult).toFixed(2)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>`;

content = content.replace(oldMultiplier, newMultiplier);

fs.writeFileSync('src/components/NewGame.tsx', content);
