const fs = require('fs');
let content = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

const oldHeader = `{/* Top Header Bar */}
      <div className="relative h-[72px] flex items-center justify-between px-4 z-20 shrink-0 border-b border-white/5">
        <button
          id="rocket-back-button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all hover:bg-white/20 border border-white/5 cursor-pointer"
          title={t('back') || 'Back'}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">
          {t('new_game') || 'Rocket'}
        </h1>

        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <span className="text-white font-bold text-[13px]">{balance.toFixed(2)}</span>
          <GramIcon className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 custom-scrollbar">`;

const newHeader = `<button
        id="rocket-back-button"
        onClick={onBack}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all hover:bg-white/20 border border-white/5 cursor-pointer z-20"
        title={t('back') || 'Back'}
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">
          {t('new_game') || 'Rocket'}
        </h1>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/5 px-3 h-10 rounded-full border border-white/5 z-20">
        <span className="text-white font-bold text-[13px]">{balance.toFixed(2)}</span>
        <GramIcon className="w-3.5 h-3.5" />
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-[72px] custom-scrollbar">`;

content = content.replace(oldHeader, newHeader);
fs.writeFileSync('src/components/NewGame.tsx', content);
