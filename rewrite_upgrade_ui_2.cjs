const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

const startToken = '<div className="flex-1 overflow-y-auto pb-32 pt-[72px]">';
const endToken = '{/* Selectors Modals */}';

const startIndex = content.indexOf(startToken);
const endIndex = content.indexOf(endToken);

if (startIndex === -1 || endIndex === -1) {
  console.error("Tokens not found");
  process.exit(1);
}

const newUI = `<div className="flex-1 overflow-y-auto pb-[120px] pt-[72px] flex flex-col items-center">
        {/* Top: Large Wheel */}
        <div className="relative w-full max-w-[320px] sm:max-w-[400px] aspect-square mt-2 mb-6 flex justify-center shrink-0 mx-auto">
          <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px]">
            <div className="w-full h-full rotate-[180deg]">
              <motion.div className="w-full h-full drop-shadow-2xl relative" animate={controls}>
                {/* Outer custom ring */}
                <img src="/krug_apgreyd.png" className="absolute inset-0 w-full h-full object-contain scale-[1.05] drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]" alt="wheel frame" />
                
                {/* SVG Wheel overlay for win/lose zones */}
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible relative z-10">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#18191d" strokeWidth="12" strokeOpacity="0.3" />
                  {/* Background Circle (Red - Lose) */}
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#252525" strokeWidth="8" strokeOpacity="0.9" style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.5))" }} />
                  
                  {/* Foreground Circle (Green/Gold - Win) */}
                  <circle 
                    cx="50" cy="50" r="44" fill="none" stroke="#fbc740" strokeWidth="8" 
                    strokeDasharray={\`\${(chance / 100) * 276.46} 276.46\`}
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 10px rgba(251,199,64,0.6))" }}
                  />
                </svg>
              </motion.div>
            </div>
            
            {/* Bottom Pointer */}
            <div className="absolute -bottom-[20px] sm:-bottom-[26px] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] scale-[1.3] sm:scale-[1.5] rotate-180">
              <svg width="26" height="30" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 28 L4 4 L13 9 Z" fill="url(#ptr_left)" />
                <path d="M13 28 L13 9 L22 4 Z" fill="url(#ptr_right)" />
                <path d="M13 28 L4 4 L13 9 L22 4 Z" stroke="#fbc740" strokeWidth="2.5" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="ptr_left" x1="8.5" y1="4" x2="8.5" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbc740" />
                    <stop offset="1" stopColor="#d4a017" />
                  </linearGradient>
                  <linearGradient id="ptr_right" x1="17.5" y1="4" x2="17.5" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#d4a017" />
                    <stop offset="1" stopColor="#997300" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Inner Circle Content */}
            <div className="absolute inset-[15%] sm:inset-[16%] bg-gradient-to-b from-[#1c1d21] to-[#131417] rounded-full shadow-[inset_0_4px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center pointer-events-none border-[2px] border-[#25272c]">
               <div className="flex flex-col items-center justify-center translate-y-[2px]">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fbc740" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_12px_rgba(251,199,64,0.4)]">
                   <polyline points="18 15 12 9 6 15"></polyline>
                   <polyline points="18 21 12 15 6 21"></polyline>
                 </svg>
               </div>
               <span className="text-[12px] font-bold text-white/50 tracking-wider mt-1">{chance.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Middle: Selection Cards */}
        <div className="w-full px-4 grid grid-cols-2 gap-3 mb-4">
          {/* Left Card: Input */}
          <div className="bg-[#151619] rounded-[16px] overflow-hidden relative h-[220px] flex flex-col group cursor-pointer" onClick={() => setShowSourceSelect(true)}>
             <div className="absolute inset-0 bg-[url('/apgreyd.jpg')] bg-cover bg-center opacity-[0.03] mix-blend-screen transition-opacity group-hover:opacity-[0.06] pointer-events-none" />
             <div className="p-4 text-center z-10 shrink-0">
               <h3 className="text-white font-bold text-[11px] leading-tight drop-shadow-md">{t('select_source_title')}</h3>
               <p className="text-white/40 text-[9px] mt-1.5 leading-tight">{t('select_source_desc')}</p>
             </div>
             <div className="flex-1 w-full relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                  {source ? (
                    <>
                      <PremiumImage staticMode src={source.image_url} alt={source.name} className="w-[70%] h-[55%] object-contain drop-shadow-xl" />
                      <span className="text-[10px] text-white/90 truncate w-full text-center font-medium mt-2 leading-tight">{source.name}</span>
                      <span className="text-[11px] font-bold text-[#fbc740] flex items-center justify-center gap-1 mt-1 drop-shadow-md">{Number(source.floor_price_gram || source.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center translate-y-[-10px] opacity-70 group-hover:opacity-100 transition-opacity">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbc740" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(251,199,64,0.3)]">
                        <polyline points="6 9 12 15 18 9"></polyline>
                        <polyline points="6 3 12 9 18 3"></polyline>
                        <polyline points="6 -3 12 3 18 -3"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Right Card: Target */}
          <div className="bg-[#151619] rounded-[16px] overflow-hidden relative h-[220px] flex flex-col group cursor-pointer" onClick={() => setShowTargetSelect(true)}>
             <div className="absolute inset-0 bg-[url('/apgreyd.jpg')] bg-cover bg-center opacity-[0.03] mix-blend-screen transition-opacity group-hover:opacity-[0.06] pointer-events-none" />
             <div className="p-4 text-center z-10 shrink-0">
               <h3 className="text-white font-bold text-[11px] leading-tight drop-shadow-md">{t('select_target_title')}</h3>
             </div>
             <div className="flex-1 w-full relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                  {target ? (
                    <>
                      <PremiumImage staticMode src={target.image_url} alt={target.name} className="w-[70%] h-[55%] object-contain drop-shadow-xl" />
                      <span className="text-[10px] text-white/90 truncate w-full text-center font-medium mt-2 leading-tight">{target.name}</span>
                      <span className="text-[11px] font-bold text-[#fbc740] flex items-center justify-center gap-1 mt-1 drop-shadow-md">{Number(target.floor_price_gram || target.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center translate-y-[-10px] opacity-70 group-hover:opacity-100 transition-opacity">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbc740" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(251,199,64,0.3)]">
                        <polyline points="18 15 12 9 6 15"></polyline>
                        <polyline points="18 21 12 15 6 21"></polyline>
                        <polyline points="18 27 12 21 6 27"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* GRAM Bet (Optional added value for balance input if user wants it) */}
        {source && (
          <div className="w-full px-4 mb-4">
            <div className="bg-[#151619] rounded-[16px] p-3 flex items-center justify-between">
               <span className="text-white/50 text-[11px] font-medium ml-2">{t('add_gram') || 'Добавить баланс'}</span>
               <div className="flex items-center gap-2 bg-[#0d0d0f] px-3 py-2 rounded-[10px] border border-white/5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={gramBetInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        if (val !== '' && parseFloat(val) > balance) {
                          setGramBetInput(balance.toString());
                        } else {
                          setGramBetInput(val);
                        }
                      }
                    }}
                    placeholder="0.0"
                    className="bg-transparent text-right text-white font-bold text-[14px] w-20 outline-none placeholder:text-white/20"
                    disabled={spinning}
                  />
                  <GramIcon className="w-3.5 h-3.5 text-[#fbc740]" />
               </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pointer-events-none z-50 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent">
        <button 
          onClick={handleUpgrade}
          disabled={!target || spinning}
          className="pointer-events-auto w-full py-4 rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 tracking-wide transition-all bg-[#896f1c] text-black hover:bg-[#a68621] disabled:opacity-50 disabled:shadow-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
             <polyline points="18 15 12 9 6 15"></polyline>
             <polyline points="18 21 12 15 6 21"></polyline>
          </svg>
          {t('upgrade_btn') || t('run_upgrade')}
        </button>
      </div>
      
      `;

content = content.substring(0, startIndex) + newUI + content.substring(endIndex);
fs.writeFileSync('src/components/Upgrade.tsx', content);
