const fs = require('fs');
let content = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

// 1. Fix Round Number styling to match Status Pill
const oldRound = `{/* Round Number */}
            <div className="absolute top-4 right-4 z-10 text-[11px] text-white/40 font-medium bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              #{serverState?.roundId || 1}
            </div>`;

const newRound = `{/* Round Number */}
            <div className="absolute top-4 right-4 z-10 flex items-center justify-center bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-[9px] font-bold tracking-wider text-white/70 uppercase">
              #{serverState?.roundId || 1}
            </div>`;

content = content.replace(oldRound, newRound);

// 2. Multiplier and Countdown rewrite
const oldMult = `{/* Centered Multiplier and Countdown */}
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
              </span>`;

const newMult = `{/* Centered Multiplier and Countdown */}
            <div className={\`absolute inset-x-0 \${currentGameState === 'waiting' ? 'top-1/2 -translate-y-1/2' : 'top-8'} z-10 flex flex-col items-center pointer-events-none transition-all duration-500\`}>
              <AnimatePresence>
                {currentGameState === 'waiting' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    className="relative w-24 h-24 flex items-center justify-center pointer-events-none"
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        className="stroke-brand fill-none transition-all duration-100 ease-linear"
                        strokeWidth="4"
                        strokeDasharray={276}
                        strokeDashoffset={276 * (1 - Math.max(0, Math.min(1, remainingMs / 5000)))}
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(255, 184, 0, 0.6))'
                        }}
                      />
                    </svg>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={liveCountdown}
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-4xl font-display font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
                      >
                        {liveCountdown}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {currentGameState !== 'waiting' && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={\`font-display font-black tracking-tight drop-shadow-md transition-colors z-10 \${
                      currentGameState === 'crashed' 
                        ? 'text-4xl text-red-500' 
                        : liveMult < 1.2 
                          ? 'text-5xl text-red-500'
                          : liveMult < 3.0
                            ? 'text-5xl text-emerald-400'
                            : 'text-5xl text-brand'
                    }\`}
                  >
                    x{(currentGameState === 'crashed' ? (serverState?.crashMultiplier || liveMult) : liveMult).toFixed(2)}
                  </motion.span>
                )}
              </AnimatePresence>`;

content = content.replace(oldMult, newMult);

fs.writeFileSync('src/components/NewGame.tsx', content);
