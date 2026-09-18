const fs = require('fs');
let content = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

// Add import
content = content.replace(
  "import { CleanModelLottie } from './CleanModelLottie';",
  "import { CleanModelLottie } from './CleanModelLottie';\nimport { BoomIcon } from './BoomIcon';"
);

// Replace Explosion Effect
const oldEffect = `{/* Explosion Effect */}
            <AnimatePresence>
              {currentGameState === 'crashed' && (
                <div 
                  className="absolute z-20 pointer-events-none"
                  style={{ left: \`calc(\${rocketPos.x / 10}% - 5rem)\`, top: \`calc(\${rocketPos.y / 10}% - 5rem)\`, width: '10rem', height: '10rem' }}
                >
                  <CleanModelLottie
                    lottieUrl="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a5/lottie.json"
                    loop={false}
                    className="w-full h-full drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  />
                </div>
              )}
            </AnimatePresence>`;

const newEffect = `{/* Explosion Effect */}
            <AnimatePresence>
              {currentGameState === 'crashed' && (
                <motion.div 
                  initial={{ scale: 0, opacity: 1, rotate: -30 }}
                  animate={{ scale: [1.5, 1], opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, duration: 0.4 }}
                  className="absolute z-20 pointer-events-none drop-shadow-[0_4px_25px_rgba(239,68,68,0.8)]"
                  style={{ left: \`calc(\${rocketPos.x / 10}% - 5rem)\`, top: \`calc(\${rocketPos.y / 10}% - 5rem)\`, width: '10rem', height: '10rem' }}
                >
                  <BoomIcon className="w-full h-full" />
                </motion.div>
              )}
            </AnimatePresence>`;

content = content.replace(oldEffect, newEffect);
fs.writeFileSync('src/components/NewGame.tsx', content);
