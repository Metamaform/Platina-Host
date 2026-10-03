/*
  ArenaHeader — верхняя панель AICE ARENA:
  [ ← ]  ARENA  [ 💎 баланс ] [ История ]
  Баланс обновляется в реальном времени (приходит из App + SSE-события).
*/

import React from 'react';
import { ArrowLeft, History } from 'lucide-react';
import { GramIcon } from '../GramIcon';

interface ArenaHeaderProps {
  onBack: () => void;
  balance: number;
  onOpenHistory: () => void;
  connected: boolean;
}

export const ArenaHeader: React.FC<ArenaHeaderProps> = React.memo(({ onBack, balance, onOpenHistory, connected }) => (
  <div className="absolute top-0 left-0 right-0 z-20 pt-4 px-4">
    <div className="max-w-md mx-auto flex items-center justify-between gap-2">
      <button
        onClick={onBack}
        aria-label="Назад"
        className="w-9 h-9 shrink-0 rounded-full lg-glass flex items-center justify-center text-white/90 transition-transform cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-white" />
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <h1 className="font-display text-lg font-bold text-white tracking-[0.18em] drop-shadow-md">ARENA</h1>
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-500 ${connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]'}`}
          title={connected ? 'Онлайн' : 'Переподключение...'}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 lg-glass px-3 h-9 rounded-full">
          <span className="text-white font-bold text-[13px] whitespace-nowrap">{balance.toFixed(2)}</span>
          <GramIcon className="w-3.5 h-3.5 text-brand" />
        </div>
        <button
          onClick={onOpenHistory}
          aria-label="История игр"
          className="w-9 h-9 rounded-full lg-glass flex items-center justify-center transition-transform cursor-pointer"
        >
          <History className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  </div>
));

ArenaHeader.displayName = 'ArenaHeader';
