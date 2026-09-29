/*
  AICE ARENA — главная страница игры (ArenaPage).

  Композиция:
  ArenaPage
  ├── ArenaHeader
  ├── ArenaTabs (ТЕКУЩАЯ ИГРА / ИСТОРИЯ, без перезагрузки)
  ├── ArenaPoolInfo
  ├── ArenaBoard ── ArenaPlayer
  ├── ArenaActions (BetButton + NFTButton)
  ├── ArenaMyBet
  ├── ArenaParticipants ── ParticipantRow
  ├── FairPlay
  ├── ArenaResult
  └── ArenaHistory (+ детали игры)

  Realtime: серверный SSE-поток (state/balance/history) + точный таймер
  по серверным часам; при потере соединения — лёгкий polling-фолбэк.
  Вся логика (результат, выплата, баланс) — на сервере.
*/

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, AlertTriangle, UserPlus } from 'lucide-react';
import { ArenaHeader } from './ArenaHeader';
import { ArenaPoolInfo } from './ArenaPoolInfo';
import { ArenaBoard } from './ArenaBoard';
import { ArenaActions } from './ArenaActions';
import { ArenaMyBet } from './ArenaMyBet';
import { ArenaParticipants } from './ArenaParticipants';
import { ArenaResult } from './ArenaResult';
import { ArenaHistoryList, RoundDetailsModal, ArenaHistorySummaryPublic } from './ArenaHistory';
import { FairPlayModal } from './ArenaFairPlay';
import { BetModal, NftModal } from './ArenaBetModals';
import { useArenaLive } from './useArenaLive';
import { useArenaCountdown } from './useArenaCountdown';
import { useTranslation } from '../../lib/i18n';
import { haptics } from '../../lib/haptics';
import { LiquidSegment } from '../ui/LiquidSegment';

interface ArenaProps {
  onBack: () => void;
  balance: number;
  setBalance: (b: number | ((prev: number) => number)) => void;
  inventory: any[];
  setInventory: (inv: any[]) => void;
  user?: { id: number; firstName?: string; username?: string; photoUrl?: string } | null;
  token?: string | null;
  onTurnover?: (amount: number) => void;
}

type Toast = { id: number; text: string; kind: 'error' | 'success' | 'info' };

export const Arena: React.FC<ArenaProps> = ({
  onBack,
  balance,
  setBalance,
  inventory,
  setInventory,
  user,
  token,
  onTurnover,
}) => {
  const { t, lang } = useTranslation();

  // --- вкладки: ТЕКУЩАЯ ИГРА / ИСТОРИЯ ---
  const [tab, setTab] = useState<'game' | 'history'>('game');

  // --- тосты (ошибки без перезагрузки страницы) ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(1);
  const pushToast = useCallback((text: string, kind: Toast['kind'] = 'error') => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2800);
  }, []);

  // --- realtime ---
  const onBalance = useCallback((newBalance: number, newInventory?: any[]) => {
    setBalance(Number(newBalance));
    if (Array.isArray(newInventory)) setInventory(newInventory);
  }, [setBalance, setInventory]);

  const {
    round, connected, serverOffset, history,
    placeBet, addDevBot,
  } = useArenaLive({ token, onBalance });

  const countdown = useArenaCountdown(round, serverOffset);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);

  // Реакции на смену состояния раунда (вибрация/тосты)
  useEffect(() => {
    if (!round) return;
    if (prevStatus && prevStatus !== round.status) {
      const myBet = user ? round.participants.find((p) => p.userId === user.id) : null;
      if (round.status === 'LOCKED' && myBet) {
        haptics.impact('medium');
        pushToast(t('arena_bets_closed'), 'info');
      }
      if (round.status === 'COMPLETED') {
        if (myBet) {
          if (myBet.id === round.winnerId) {
            haptics.notify('success');
            pushToast(`${t('arena_win_title')} +${(round.winAmount || 0).toFixed(2)} GRAM`, 'success');
          } else {
            haptics.notify('error');
          }
        }
      }
      if (round.status === 'CANCELLED') {
        pushToast(t('arena_round_cancelled'), 'info');
      }
    }
    setPrevStatus(round.status);
  }, [round?.status, round?.id]);

  // --- мои данные в раунде ---
  const myBet = useMemo(
    () => (round && user ? round.participants.find((p) => p.userId === user.id) || null : null),
    [round, user]
  );
  const winner = useMemo(
    () => (round && round.winnerId ? round.participants.find((p) => p.id === round.winnerId) || null : null),
    [round]
  );

  // --- модальные окна ---
  const [betModal, setBetModal] = useState(false);
  const [nftModal, setNftModal] = useState(false);
  const [fairModal, setFairModal] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);

  const [selectedGift, setSelectedGift] = useState<any | null>(null);
  // NFT действителен, только пока он реально есть в инвентаре
  useEffect(() => {
    setSelectedGift((prev: any) => (prev && inventory.some((i) => i.uniqueId === prev.uniqueId && !i.isWithdrawing) ? prev : null));
  }, [inventory]);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addingBot, setAddingBot] = useState(false);

  // --- действия ---

  const handleConfirmBet = useCallback(async (amount: number) => {
    if (!round) return;
    setSubmitting(true);
    setActionError(null);
    const res = await placeBet(amount, selectedGift || undefined);
    setSubmitting(false);
    if (!res.ok) {
      setActionError(res.error || t('arena_error_title'));
      haptics.notify('error');
      return;
    }
    const total = Number((amount + (selectedGift ? Number(selectedGift.floor_price_gram || selectedGift.price || 0) : 0)).toFixed(2));
    onTurnover?.(total);
    haptics.impact('medium');
    pushToast(t('arena_bet_placed'), 'success');
    setSelectedGift(null);
    setBetModal(false);
  }, [round, placeBet, selectedGift, onTurnover, pushToast, t]);

  // ТЕМПОРАРНО: рандомный бот-участник для одиночного тестирования
  const handleAddDevBot = useCallback(async () => {
    setAddingBot(true);
    const res = await addDevBot();
    setAddingBot(false);
    if (!res.ok) {
      pushToast(res.error || t('arena_error_title'), 'error');
      return;
    }
    haptics.impact('light');
  }, [addDevBot, pushToast, t]);

  // --- производные состояния ---

  const roundAlive = !!round;
  const canBet = !!round && round.status === 'ACCEPTING_BETS' && !myBet && round.participants.length < round.maxPlayers;

  const disabledReason = useMemo(() => {
    if (!round) return null;
    if (myBet) return t('arena_you_in');
    if (round.participants.length >= round.maxPlayers) return t('arena_arena_full');
    switch (round.status) {
      case 'WAITING': return t('arena_status_waiting');
      case 'LOCKED': return t('arena_bets_closed');
      case 'DRAWING': return t('arena_drawing');
      case 'COMPLETED':
      case 'CANCELLED':
      case 'ERROR': return t('arena_wait_next');
      default: return t('arena_bets_closed');
    }
  }, [round, myBet, t]);

  const historyItems: ArenaHistorySummaryPublic[] = useMemo(
    () => (history as any[]).map((h) => ({
      id: h.id,
      totalPool: h.totalPool,
      participantsCount: h.participantsCount,
      winner: h.winner
        ? { username: h.winner.username, firstName: h.winner.firstName, avatar: h.winner.avatar }
        : null,
      completedAt: h.completedAt,
      status: h.status,
    })),
    [history]
  );

  return (
    <div className="h-full w-full flex flex-col bg-canvas text-white relative select-none overflow-hidden">
      <ArenaHeader
        onBack={onBack}
        balance={balance}
        onOpenHistory={() => { setTab('history'); haptics.selection(); }}
        connected={connected}
      />

      {/* Баннер потери соединения */}
      <AnimatePresence>
        {!connected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-[64px] left-4 right-4 z-20 max-w-md mx-auto flex items-center gap-2 rounded-full bg-red-500/15 border border-red-500/40 px-3.5 py-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[11px] font-semibold text-red-300">{t('arena_connection_lost')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Скроллируемый контент */}
      <div className="flex-1 overflow-y-auto px-4 pt-[68px] pb-6 custom-scrollbar">
        <div className="max-w-md mx-auto flex flex-col gap-3.5">

          {/* Переключатель ТЕКУЩАЯ ИГРА / ИСТОРИЯ */}
          <LiquidSegment<'game' | 'history'>
            value={tab}
            onChange={(v) => { setTab(v); haptics.selection(); }}
            variant="text"
            ariaLabel="Arena tabs"
            options={[
              { value: 'game', label: t('arena_tab_current') },
              { value: 'history', label: t('arena_tab_history') },
            ]}
          />

          {tab === 'history' ? (
            <ArenaHistoryList items={historyItems} onOpen={(id) => setDetailsId(id)} t={t} />
          ) : !roundAlive ? (
            /* Скелетон до первого пакета состояния */
            <div className="flex flex-col gap-3.5">
              <div className="h-[120px] rounded-[24px] bg-white/[0.04] border border-white/[0.06] animate-pulse" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-[150px] rounded-[22px] bg-white/[0.03] border border-white/[0.05] animate-pulse" />
                <div className="h-[150px] rounded-[22px] bg-white/[0.03] border border-white/[0.05] animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <ArenaPoolInfo round={round!} countdown={countdown} t={t} lang={lang || 'ru'} />

              {/* Игровое поле */}
              <ArenaBoard round={round!} myUserId={user?.id} onJoin={() => { if (canBet) setBetModal(true); }} t={t} />

              {/* Результат */}
              {(round!.status === 'COMPLETED' || round!.status === 'CANCELLED' || round!.status === 'ERROR') && (
                <ArenaResult round={round!} myBet={myBet} winner={winner} t={t} />
              )}

              {/* Действия / Моя ставка */}
              {myBet ? (
                <ArenaMyBet myBet={myBet} round={round!} t={t} />
              ) : (
                <ArenaActions
                  canBet={canBet}
                  disabledReason={disabledReason}
                  onBet={() => { haptics.impact('light'); setBetModal(true); setActionError(null); }}
                  onAddNft={() => { haptics.impact('light'); setNftModal(true); }}
                  hasNftSelection={!!selectedGift}
                  nftLabel={selectedGift?.name || 'NFT'}
                  t={t}
                />
              )}

              {/* ТЕМПОРАРНО (для одиночного тестирования): добавить рандомного бота.
                  Кнопка удаляется перед релизом вместе с /api/arena/dev-bot. */}
              {round!.status === 'ACCEPTING_BETS' && round!.participants.length < round!.maxPlayers && (
                <button
                  onClick={handleAddDevBot}
                  disabled={addingBot}
                  className="w-full h-[38px] rounded-full border border-dashed border-white/[0.14] bg-transparent text-white/40 hover:text-white/70 hover:border-white/[0.25] active:scale-[0.99] transition-all text-[11px] font-bold tracking-wider uppercase cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {addingBot ? t('arena_sending') : t('arena_dev_add_player')}
                </button>
              )}

              {/* Список игроков */}
              <ArenaParticipants round={round!} myUserId={user?.id} t={t} />

              {/* Честная игра */}
              <button
                onClick={() => setFairModal(true)}
                className="w-full rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 flex items-center gap-3 active:scale-[0.985] transition-transform cursor-pointer hover:border-emerald-500/30"
              >
                <span className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[13px] font-bold text-white/85">{t('arena_fair_title')}</span>
                  <span className="block text-[11px] text-white/40 font-medium mt-0.5">{t('arena_fair_subtitle')}</span>
                </span>
                <span className="text-white/25 text-[13px]">›</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      <AnimatePresence>
        {betModal && roundAlive && (
          <motion.div key="bet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <BetModal
              onClose={() => setBetModal(false)}
              onConfirm={handleConfirmBet}
              balance={balance}
              minBet={round!.minBet}
              maxBet={round!.maxBet}
              submitting={submitting}
              gift={selectedGift}
              onRemoveGift={() => setSelectedGift(null)}
              error={actionError}
              t={t}
            />
          </motion.div>
        )}
        {nftModal && (
          <motion.div key="nft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <NftModal
              onClose={() => setNftModal(false)}
              inventory={inventory}
              selectedGift={selectedGift}
              onSelect={(item) => { setSelectedGift(item); if (!betModal) setBetModal(true); }}
              maxBetGram={roundAlive ? round!.maxBet : 2500}
              t={t}
            />
          </motion.div>
        )}
        {fairModal && roundAlive && (
          <motion.div key="fair" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <FairPlayModal round={round!} onClose={() => setFairModal(false)} t={t} />
          </motion.div>
        )}
        {detailsId != null && (
          <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <RoundDetailsModal roundId={detailsId} onClose={() => setDetailsId(null)} myUserId={user?.id} t={t} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Тосты */}
      <div className="fixed top-[110px] left-0 right-0 z-[130] flex flex-col items-center gap-1.5 pointer-events-none px-6">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`max-w-full px-4 py-2.5 rounded-full border text-[12px] font-bold shadow-xl ${
                toast.kind === 'error'
                  ? 'bg-[#2a1414]/95 border-red-500/40 text-red-300'
                  : toast.kind === 'success'
                  ? 'bg-[#10231a]/95 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#1b1c20]/95 border-white/[0.14] text-white/85'
              }`}
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Arena;
