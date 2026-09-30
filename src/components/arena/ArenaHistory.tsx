/*
  ArenaHistory — вкладка «ИСТОРИЯ» и детали игры.
  Список завершённых раундов: #id, банк, игроки, победитель, дата, статус.
  По нажатию — модалка деталей: все участники, ставки, NFT, проценты,
  победитель, выигрыш, provably fair хэш.
*/

import React, { useEffect, useState } from 'react';
import { Trophy, Users, ChevronRight, RotateCw, AlertCircle } from 'lucide-react';
import { X } from 'lucide-react';
import type { ArenaHistoryEntry } from '../../lib/arenaShared';
import { PlayerAvatar, ArenaGiftChip } from './arenaUiComponents';
import { GramIcon } from '../GramIcon';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Список
// ---------------------------------------------------------------------------

export const ArenaHistoryList: React.FC<{
  items: ArenaHistorySummaryPublic[];
  onOpen: (id: number) => void;
  onRefresh?: () => void;
  t: (k: string) => string;
}> = ({ items, onOpen, onRefresh, t }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          {t('arena_tab_history')} ({items.length})
        </span>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold text-white/70 active:scale-95 transition-transform cursor-pointer hover:bg-white/[0.10]"
          >
            <RotateCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-brand' : ''}`} />
            <span>{refreshing ? t('arena_sending') : t('refresh')}</span>
          </button>
        )}
      </div>

      {!items.length ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] py-14 flex flex-col items-center gap-2">
          <Trophy className="w-8 h-8 text-white/15" />
          <span className="text-[13px] text-white/40 font-medium">{t('arena_history_empty')}</span>
        </div>
      ) : (
        items.map((h) => (
          <button
            key={h.id}
            onClick={() => onOpen(h.id)}
            className="w-full text-left rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 active:scale-[0.985] transition-transform cursor-pointer hover:border-white/[0.14]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[14px] font-bold text-white/90">#{h.id}</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold tracking-wider uppercase ${
                  h.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {h.status === 'COMPLETED' ? t('arena_status_completed') : t('arena_round_cancelled')}
                </span>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[18px] font-black text-white leading-none">{h.totalPool.toFixed(2)}</span>
                  <GramIcon className="w-4 h-4 text-brand" />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-white/40 font-semibold mt-1">
                  <Users className="w-3 h-3" />
                  {h.participantsCount} · {formatDate(h.completedAt)}
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                {h.winner ? (
                  <>
                    <PlayerAvatar participant={{ id: '', userId: h.winner.userId ?? 0, username: h.winner.username, firstName: h.winner.firstName, avatar: h.winner.avatar, betAmount: 0, contribution: 0, percentage: 0, status: 'WON', joinedAt: 0 }} className="w-8 h-8" />
                    <div className="min-w-0 text-right">
                      <div className="text-[9px] font-bold text-white/35 uppercase tracking-wider flex items-center gap-1 justify-end">
                        <Trophy className="w-2.5 h-2.5 text-amber-400" />
                        {t('arena_winner')}
                      </div>
                      <div className="truncate text-[12px] font-bold text-white/85">
                        @{h.winner.username || h.winner.firstName || '—'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-right text-[11px] font-semibold text-white/30">
                    {t('arena_round_cancelled')}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
};

export interface ArenaHistorySummaryPublic {
  id: number;
  totalPool: number;
  participantsCount: number;
  winner: { username?: string; firstName?: string; avatar?: string; userId?: number } | null;
  completedAt: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Детали игры
// ---------------------------------------------------------------------------

export const RoundDetailsModal: React.FC<{
  roundId: number;
  onClose: () => void;
  myUserId?: number;
  t: (k: string) => string;
}> = ({ roundId, onClose, myUserId, t }) => {
  const [entry, setEntry] = useState<ArenaHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/arena/round/${roundId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setEntry(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [roundId]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#16171b]/95 backdrop-blur-2xl rounded-t-[32px] p-5 pb-8 border-t border-white/[0.12] shadow-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[16px] font-bold text-white tracking-wide">
            ARENA #{roundId}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
        ) : !entry ? (
          <div className="text-center py-10 text-[13px] text-white/40">{t('arena_round_not_found')}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Сводка */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('arena_bank')}</div>
                <div className="flex items-center gap-1.5 font-display text-[18px] font-black text-white mt-1">
                  {entry.totalPool.toFixed(2)} <GramIcon className="w-4 h-4 text-brand" />
                </div>
              </div>
              <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('arena_mode')}</div>
                <div className="font-display text-[15px] font-bold text-white mt-1">{entry.mode}</div>
              </div>
              <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('arena_participants_label')}</div>
                <div className="font-display text-[18px] font-black text-white mt-1">{entry.participantsCount}</div>
              </div>
              <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('arena_date')}</div>
                <div className="text-[12px] font-bold text-white mt-1.5">{formatDate(entry.completedAt)}</div>
              </div>
            </div>

            {/* Победитель */}
            {entry.winner && entry.status === 'COMPLETED' && (
              <div className="rounded-[20px] border border-emerald-400/40 bg-emerald-500/[0.07] px-4 py-3.5 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-3">
                  <PlayerAvatar participant={{ id: entry.winner.id, userId: entry.winner.userId, username: entry.winner.username, firstName: entry.winner.firstName, avatar: entry.winner.avatar, betAmount: 0, contribution: 0, percentage: 0, status: 'WON', joinedAt: 0 }} className="w-11 h-11 ring-2 ring-emerald-400/60" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> {t('arena_winner')}
                    </div>
                    <div className="truncate text-[15px] font-bold text-white">@{entry.winner.username || entry.winner.firstName}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-display text-[17px] font-black text-emerald-300">
                      +{entry.winAmount.toFixed(2)} <GramIcon className="w-4 h-4 text-brand" />
                    </div>
                    <div className="text-[10px] font-bold text-white/40">{t('arena_payout')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Участники */}
            <div>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider px-1 mb-2">{t('arena_participants_label')}</div>
              <div className="flex flex-col gap-2">
                {entry.participants.map((p) => {
                  const isWinner = entry.winner?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[16px] border ${
                        isWinner ? 'border-emerald-400/40 bg-emerald-500/[0.06]' : 'border-white/[0.07] bg-white/[0.03]'
                      } ${p.status === 'LOST' ? 'opacity-70' : ''}`}
                    >
                      <PlayerAvatar participant={p} className="w-8 h-8" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[12px] font-bold text-white/90">
                          {p.username || p.firstName || 'Player'}
                          {myUserId != null && p.userId === myUserId && <span className="ml-1.5 text-[9px] text-[#4fc3ff] font-extrabold">ME</span>}
                        </div>
                        {p.gift && <div className="mt-0.5"><ArenaGiftChip gift={p.gift} size="sm" /></div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`flex items-center gap-1 font-display text-[13px] font-black ${p.status === 'LOST' ? 'text-red-400' : isWinner ? 'text-emerald-300' : 'text-white'}`}>
                          {p.contribution.toFixed(2)} <GramIcon className="w-3 h-3 text-brand" />
                        </div>
                        <div className="text-[10px] font-bold text-white/40">{p.percentage.toFixed(1)}% · {p.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Provably fair */}
            <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">🛡 {t('arena_fair_hash')}</div>
              <code className="text-[9px] font-mono text-white/50 break-all leading-relaxed">{entry.serverSeedHash}</code>
              {entry.serverSeed && (
                <>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 mt-2">{t('arena_fair_seed')}</div>
                  <code className="text-[9px] font-mono text-emerald-300/70 break-all leading-relaxed">{entry.serverSeed}</code>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
