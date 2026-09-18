const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

const oldHeader = `{/* Top Header */}
      <div className="relative h-[72px] flex items-center justify-between px-4 shrink-0 z-20">
        <button onClick={() => {
            if (spinning && pendingResultRef.current) {
              applyResultRef.current(pendingResultRef.current);
              pendingResultRef.current = null;
            }
            onBack();
          }} 
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-display text-lg font-bold text-white">Апгрейд</h1>
        <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-[20px] flex flex-col">`;

const newHeader = `<button onClick={() => {
            if (spinning && pendingResultRef.current) {
              applyResultRef.current(pendingResultRef.current);
              pendingResultRef.current = null;
            }
            onBack();
          }} 
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
          <h1 className="font-display text-lg font-bold text-white">Апгрейд</h1>
        </div>

        <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5">
          <Settings className="w-5 h-5 text-white" />
        </button>

      <div className="flex-1 overflow-y-auto pb-[20px] pt-[72px] flex flex-col">`;

content = content.replace(oldHeader, newHeader);
fs.writeFileSync('src/components/Upgrade.tsx', content);
