/*
  Модальные окна AICE ARENA:
  · BetModal — выбор суммы ставки: ручной ввод, быстрые значения, MAX,
    проверка баланса перед подтверждением («Недостаточно средств»);
  · NftModal — инвентарь пользователя для добавления NFT к ставке;
  · PrivateModal — создание приватной Arena (макс. игроков → invite-код).

  Все окна — нижние шторки в стиле Rocket, без glassmorphism-перебора.
*/

import React, { useMemo, useState } from 'react';
import { X, AlertTriangle, Users, Copy, Check, Gem } from 'lucide-react';
import { GramIcon } from '../GramIcon';
import { NftSelectorGrid } from '../NftSelectorGrid';
import { ARENA_CARD, CardSheen, ArenaGiftChip } from './arenaUi';
import { ARENA_LIMITS } from '../../lib/arenaShared';

// ---------------------------------------------------------------------------
// Общая шторка
// ---------------------------------------------------------------------------

const Sheet: React.FC<{ onClose: () => void; children: React.ReactNode; title: string }> = ({ onClose, children, title }) => (
  <div className="fixed inset-0 z-[120] flex items-end justify-center" role="dialog" aria-modal="true">
    <div className="absolute inset-0 bg-black/70" onClick={onClose} />
    <div className="relative w-full max-w-md bg-[#16171b]/95 backdrop-blur-2xl rounded-t-[32px] p-5 pb-8 border-t border-white/[0.12] shadow-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_100%)]" />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h2 className="font-display text-[16px] font-bold text-white tracking-wide">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// BetModal
// ---------------------------------------------------------------------------

interface BetModalProps {
  onClose: () => void;
  onConfirm: (amount: number) => void;
  balance: number;
  minBet: number;
  maxBet: number;
  submitting: boolean;
  gift: any | null;
  onRemoveGift: () => void;
  error: string | null;
  t: (k: string) => string;
}

const QUICK_VALUES = [0.10, 0.50, 1.00];

export const BetModal: React.FC<BetModalProps> = ({
  onClose, onConfirm, balance, minBet, maxBet, submitting, gift, onRemoveGift, error, t,
}) => {
  const [input, setInput] = useState<string>(() => (minBet.toFixed(2)));
  const amount = parseFloat(input.replace(',', '.')) || 0;
  const maxAvailable = Math.min(balance, maxBet);
  const total = Number((amount + (gift ? Number(gift.floor_price_gram || gift.price || 0) : 0)).toFixed(2));

  const insufficient = amount > 0 && amount > balance;
  const belowMin = amount > 0 && !gift && amount < minBet;
  const aboveMax = amount > maxBet;
  const zeroTotal = total <= 0;
  const canConfirm = !zeroTotal && !insufficient && !belowMin && !aboveMax && !submitting;

  const setQuick = (v: number) => setInput(v.toFixed(2));
  const setMax = () => setInput(Math.max(0, Math.floor(maxAvailable * 100) / 100).toFixed(2));

  return (
    <Sheet onClose={onClose} title={t('arena_make_bet')}>
      {/* Сумма */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[24px] p-5 flex flex-col items-center mb-4">
        <div className="flex items-center justify-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={input}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
              if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setInput(v);
            }}
            className="w-[150px] bg-transparent outline-none text-center font-display text-[38px] font-black text-white display-xl focus:underline focus:decoration-white/20"
            placeholder="0.00"
          />
          <GramIcon className="w-7 h-7 text-brand drop-shadow-[0_0_8px_rgba(0,152,234,0.6)]" />
        </div>

        {/* Быстрые значения + MAX */}
        <div className="mt-4 flex items-center gap-2">
          {QUICK_VALUES.map((v) => (
            <button
              key={v}
              onClick={() => setQuick(v)}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[12px] font-bold text-white/80 active:scale-95 transition-transform cursor-pointer hover:bg-white/[0.10]"
            >
              {v.toFixed(2)}
            </button>
          ))}
          <button
            onClick={setMax}
            className="px-3.5 py-1.5 rounded-full bg-[#0098ea]/15 border border-[#0098ea]/40 text-[12px] font-extrabold text-[#4fc3ff] active:scale-95 transition-transform cursor-pointer shadow-[0_0_12px_rgba(0,152,234,0.25)]"
          >
            {t('arena_max')}
          </button>
        </div>

        {gift && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[11px] text-white/40 font-semibold">{t('arena_with_nft')}:</span>
            <ArenaGiftChip gift={{ name: gift.name, image_url: gift.image_url || gift.lottie_url, floor_price_gram: Number(gift.floor_price_gram || gift.price || 0) }} size="sm" />
            <button
              onClick={onRemoveGift}
              aria-label={t('arena_remove_nft')}
              className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            >
              <X className="w-3 h-3 text-red-400" />
            </button>
          </div>
        )}

        <div className="mt-3 text-[12px] font-semibold text-white/45">
          {t('arena_total')}: <span className="text-white/80 font-bold">{total.toFixed(2)} 💎</span>
        </div>
      </div>

      {/* Баланс и ошибки */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[12px] text-white/45 font-medium">{t('your_balance')}:</span>
        <span className="flex items-center gap-1 text-[13px] font-bold text-white/85">
          {balance.toFixed(2)} <GramIcon className="w-3.5 h-3.5 text-brand" />
        </span>
      </div>

      {(insufficient || belowMin || aboveMax || error) && (
        <div className={`flex items-center gap-2 rounded-[16px] border px-3.5 py-2.5 mb-2 ${error ? 'border-red-500/40 bg-red-500/[0.08]' : 'border-red-500/40 bg-red-500/[0.08]'}`}>
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-[12px] font-semibold text-red-400">
            {error || (insufficient ? t('arena_insufficient') : belowMin ? `${t('arena_min_bet')} ${minBet.toFixed(2)} 💎` : `${t('arena_max_bet')} ${maxBet.toFixed(0)} 💎`)}
          </span>
        </div>
      )}

      <button
        onClick={() => canConfirm && onConfirm(amount)}
        disabled={!canConfirm}
        className={`w-full h-[52px] rounded-full font-display font-bold text-[16px] tracking-wide transition-all select-none ${
          canConfirm
            ? 'bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] cursor-pointer'
            : 'bg-white/[0.05] border border-white/[0.08] text-white/35 cursor-not-allowed'
        }`}
      >
        {submitting ? t('arena_sending') : t('arena_confirm')}
      </button>
      <button
        onClick={onClose}
        className="w-full h-[44px] mt-2 rounded-full text-[13px] font-bold text-white/50 active:scale-[0.99] transition-transform cursor-pointer"
      >
        {t('arena_cancel')}
      </button>
    </Sheet>
  );
};

// ---------------------------------------------------------------------------
// NftModal
// ---------------------------------------------------------------------------

interface NftModalProps {
  onClose: () => void;
  inventory: any[];
  selectedGift: any | null;
  onSelect: (item: any | null) => void;
  maxBetGram: number;
  t: (k: string) => string;
}

export const NftModal: React.FC<NftModalProps> = ({ onClose, inventory, selectedGift, onSelect, maxBetGram, t }) => (
  <Sheet onClose={onClose} title={t('arena_add_nft')}>
    <p className="text-[12px] text-white/45 font-medium mb-3 px-1">{t('arena_nft_hint')}</p>
    <NftSelectorGrid
      inventory={inventory}
      selectedIds={selectedGift ? [selectedGift.uniqueId || selectedGift.id] : []}
      onSelect={(item) => { onSelect(item); onClose(); }}
      maxBetGram={maxBetGram}
      maxSelections={1}
      emptyText={t('arena_inventory_empty')}
    />
  </Sheet>
);

// ---------------------------------------------------------------------------
// PrivateModal — создание приватной Arena
// ---------------------------------------------------------------------------

interface PrivateModalProps {
  onClose: () => void;
  onCreate: (maxPlayers: number) => void;
  submitting: boolean;
  error: string | null;
  t: (k: string) => string;
}

const PLAYER_OPTIONS = [2, 4, 6, 8];

export const PrivateModal: React.FC<PrivateModalProps> = ({ onClose, onCreate, submitting, error, t }) => {
  const [maxPlayers, setMaxPlayers] = useState(4);

  return (
    <Sheet onClose={onClose} title={t('arena_private_title')}>
      <div className={`${ARENA_CARD} p-4 mb-3`}>
        <CardSheen />
        <div className="relative z-10 text-[12px] text-white/55 font-medium leading-relaxed">
          {t('arena_private_desc')}
        </div>
      </div>

      <div className="px-1 mb-2 text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        {t('arena_max_players')}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PLAYER_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => setMaxPlayers(n)}
            className={`h-11 rounded-[16px] font-display font-bold text-[15px] border transition-all cursor-pointer active:scale-95 ${
              maxPlayers === n
                ? 'bg-[#0098ea]/15 border-[#0098ea]/50 text-[#4fc3ff] shadow-[0_0_14px_rgba(0,152,234,0.25)]'
                : 'bg-white/[0.04] border-white/[0.08] text-white/60'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[16px] border border-red-500/40 bg-red-500/[0.08] px-3.5 py-2.5 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-[12px] font-semibold text-red-400">{error}</span>
        </div>
      )}

      <button
        onClick={() => onCreate(maxPlayers)}
        disabled={submitting}
        className="w-full h-[52px] rounded-full font-display font-bold text-[15px] tracking-wide transition-all select-none bg-gradient-to-r from-violet-500 via-[#7b6cf6] to-[#0098ea] text-white shadow-[0_4px_22px_rgba(123,108,246,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] cursor-pointer disabled:opacity-50"
      >
        {submitting ? t('arena_sending') : t('arena_private_create')}
      </button>
    </Sheet>
  );
};

// ---------------------------------------------------------------------------
// JoinByCodeModal — вход в приватную Arena по коду
// ---------------------------------------------------------------------------

export const JoinByCodeModal: React.FC<{
  onClose: () => void;
  onJoin: (code: string) => void;
  error: string | null;
  t: (k: string) => string;
}> = ({ onClose, onJoin, error, t }) => {
  const [code, setCode] = useState('');
  const valid = /^[A-Za-z0-9]{6}$/.test(code.trim());
  return (
    <Sheet onClose={onClose} title={t('arena_join_title')}>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        placeholder="XXXXXX"
        className="w-full h-14 bg-white/[0.04] border border-white/[0.10] rounded-[18px] text-center font-display text-[24px] font-black tracking-[0.35em] text-white outline-none focus:border-[#0098ea]/50 mb-3"
      />
      {error && (
        <div className="flex items-center gap-2 rounded-[16px] border border-red-500/40 bg-red-500/[0.08] px-3.5 py-2.5 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-[12px] font-semibold text-red-400">{error}</span>
        </div>
      )}
      <button
        onClick={() => valid && onJoin(code.trim())}
        disabled={!valid}
        className={`w-full h-[52px] rounded-full font-display font-bold text-[15px] transition-all ${
          valid
            ? 'bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white shadow-[0_4px_22px_rgba(0,152,234,0.5)] active:scale-[0.98] cursor-pointer'
            : 'bg-white/[0.05] border border-white/[0.08] text-white/35 cursor-not-allowed'
        }`}
      >
        {t('arena_join_btn')}
      </button>
    </Sheet>
  );
};
