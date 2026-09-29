/*
  ArenaActions — кнопки действий:
  [ ДОБАВИТЬ NFT ]  [ СДЕЛАТЬ СТАВКУ ]  — яркая градиентная CTA.
  Блокируются при закрытых ставках / заполненном раунде / уже сделанной ставке.
*/

import React from 'react';
import { ImagePlus, Lock } from 'lucide-react';

interface ArenaActionsProps {
  canBet: boolean;
  disabledReason: string | null;
  onBet: () => void;
  onAddNft: () => void;
  hasNftSelection: boolean;
  nftLabel: string;
  t: (k: string) => string;
}

export const ArenaActions: React.FC<ArenaActionsProps> = React.memo(({
  canBet,
  disabledReason,
  onBet,
  onAddNft,
  hasNftSelection,
  nftLabel,
  t,
}) => (
  <div className="w-full flex gap-2.5">
    {/* NFT — стеклянная кнопка слева */}
    <button
      onClick={onAddNft}
      disabled={!canBet}
      className={`shrink-0 w-[132px] h-[54px] rounded-full flex items-center justify-center gap-2 border font-bold text-[13px] transition-all ${
        canBet
          ? 'bg-white/[0.06] border-white/[0.12] text-white/85 active:scale-[0.97] cursor-pointer hover:bg-white/[0.09]'
          : 'bg-white/[0.03] border-white/[0.06] text-white/30 cursor-not-allowed'
      }`}
    >
      {hasNftSelection ? (
        <span className="truncate px-2 max-w-full">{nftLabel}</span>
      ) : (
        <>
          <ImagePlus className="w-4 h-4 shrink-0" />
          <span className="truncate">NFT</span>
        </>
      )}
    </button>

    {/* Ставка — главная градиентная CTA */}
    <button
      onClick={onBet}
      disabled={!canBet}
      title={disabledReason || undefined}
      className={`flex-1 h-[54px] rounded-full overflow-hidden font-display font-bold text-[16px] tracking-wide transition-all select-none ${
        canBet
          ? 'bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] cursor-pointer'
          : 'bg-white/[0.05] border border-white/[0.08] text-white/35 cursor-not-allowed'
      }`}
    >
      {canBet ? (
        t('arena_make_bet')
      ) : (
        <span className="flex items-center justify-center gap-2 text-[13px] font-bold px-2">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{disabledReason || t('arena_bets_closed')}</span>
        </span>
      )}
    </button>
  </div>
));

ArenaActions.displayName = 'ArenaActions';
