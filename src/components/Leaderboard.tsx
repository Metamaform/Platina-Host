import { useTranslation } from '../lib/i18n';
import React, { useState, useEffect } from 'react';
import { Clock, Users, HelpCircle } from 'lucide-react';
import { AnimatedTrophy } from './AnimatedTrophy';
import { PremiumImage } from './PremiumNftImage';
import { GramIcon } from './GramIcon';
import { LiquidDialog } from './ui/LiquidDialog';

interface LeaderboardProps {
  currentUser?: any;
}

export function Leaderboard({ currentUser: currentUserProp }: LeaderboardProps = {}) {
  const { t } = useTranslation();
  const [data, setData] = useState<{ top: any[]; currentUser: any } | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [showRules, setShowRules] = useState(false);

  const getPlayerAvatarUrl = (
    player: { id?: number | string; username?: string; firstName?: string; photoUrl?: string } | null | undefined
  ): string => {
    if (!player) return '';

    // 1. Is it the current user? Prioritize real live profile / telegram photo
    const isMe =
      (currentUserProp?.id != null && player.id != null && String(currentUserProp.id) === String(player.id)) ||
      (player.id === 1337 && currentUserProp != null);

    const tgPhoto = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) || null;
    if (isMe && (currentUserProp?.photoUrl || tgPhoto)) {
      return currentUserProp?.photoUrl || tgPhoto!;
    }

    // 2. Direct photoUrl if present
    if (player.photoUrl && typeof player.photoUrl === 'string' && player.photoUrl.trim() !== '') {
      return player.photoUrl;
    }

    // 3. Known leader top players
    const key = `${player.id || ''} ${player.username || ''} ${player.firstName || ''}`.toLowerCase();
    if (key.includes('metamaform')) {
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    }
    if (key.includes('bigchif') || key.includes('goychick') || key.includes('chif')) {
      return 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80';
    }
    if (key.includes('artem')) {
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    }
    if (key.includes('elena')) {
      return 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';
    }
    if (key.includes('dmitry')) {
      return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
    }
    if (key.includes('sofi')) {
      return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80';
    }

    // 4. Stable deterministic avatar for any other player
    const seed = encodeURIComponent(player.username || player.firstName || String(player.id || 'player'));
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  useEffect(() => {
    const token = sessionStorage.getItem('pg_session_token');
    Promise.all([
      fetch('/api/leaderboard', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/leaderboard/config', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([lbData, cfgData]) => {
      setData(lbData);
      setConfig(cfgData);
    });
  }, []);

  useEffect(() => {
    if (!config?.endTime) return;

    const updateTime = () => {
      const now = new Date().getTime();
      const end = new Date(config.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Completed');
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      if (d > 0) {
        setTimeLeft(`${d}д ${h}ч ${m}м`);
      } else {
        setTimeLeft(`${h}ч ${m}м ${s}с`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [config?.endTime]);

  const formatTurnover = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num === 0 ? '0' : num.toFixed(1);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-b from-[#FDE047] to-[#EAB308] text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-300 font-black';
    if (rank === 2) return 'bg-gradient-to-b from-[#E2E8F0] to-[#94A3B8] text-slate-900 shadow-[0_0_15px_rgba(148,163,184,0.4)] border border-slate-300 font-black';
    if (rank === 3) return 'bg-gradient-to-b from-[#FDBA74] to-[#EA580C] text-orange-950 shadow-[0_0_15px_rgba(234,88,12,0.4)] border border-orange-300 font-black';
    return 'bg-white/[0.08] text-white/90 border border-white/10 font-bold';
  };

  const getRowStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-500/[0.14] via-amber-500/[0.05] to-transparent border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.10)]';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300/[0.10] via-slate-300/[0.03] to-transparent border-slate-300/30';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/[0.10] via-orange-500/[0.03] to-transparent border-orange-500/30';
    return 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]';
  };

  const maskName = (name: string) => {
    if (!name || name.length <= 3) return name || t('player');
    return name.slice(0, 2) + '***' + name.slice(-2);
  };

  const getPrizeUrl = (rank: number) => {
    if (!config) return null;
    if (config.prizes && rank in config.prizes) {
      return config.prizes[rank] ? config.prizes[rank].url : null;
    }
    if (rank <= (config.places || 10)) {
      return config.prizeNftUrl || null;
    }
    return null;
  };

  const getPrizeName = (rank: number) => {
    if (!config) return 'NFT Gift';
    if (config.prizes && rank in config.prizes && config.prizes[rank]) {
      return config.prizes[rank].name || 'NFT Gift';
    }
    return config.prizeNftName || 'NFT Gift';
  };

  if (!data || !config) {
    return (
      <div className="flex flex-col px-1 pb-28 relative space-y-4 pt-2">
        <div className="premium-card rounded-[24px] p-6 h-64 skeleton" />
        <div className="premium-card rounded-[24px] p-4 space-y-3">
          <div className="h-10 rounded-xl skeleton w-full" />
          <div className="h-14 rounded-2xl skeleton w-full" />
          <div className="h-14 rounded-2xl skeleton w-full" />
          <div className="h-14 rounded-2xl skeleton w-full" />
        </div>
      </div>
    );
  }

  const top = Array.isArray(data?.top) ? data.top : [];
  const currentUser = data?.currentUser || null;
  const champion = top.length > 0 ? top[0] : null;
  const runnerUp = top.length > 1 ? top[1] : null;
  const thirdPlace = top.length > 2 ? top[2] : null;

  return (
    <div className="flex flex-col px-1 pb-28 relative space-y-4">
      {/* Верхний заголовок экрана в фирменном стиле */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2.5">
          <AnimatedTrophy className="w-12 h-12" />
          <h2 className="font-display text-2xl font-semibold text-white">{t('leaderboard_title')}</h2>
        </div>
        <button
          onClick={() => setShowRules(true)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.10] text-white/80 transition-transform cursor-pointer hover:bg-white/[0.15]"
          title={t('how_to_participate')}
          aria-label={t('how_to_participate')}
        >
          <HelpCircle className="w-5 h-5 text-brand" />
        </button>
      </div>

      {/* Информационный турнирный блок со счетчиком и колоннами лидеров */}
      <div className="group relative overflow-hidden bg-white/[0.06] backdrop-blur-2xl border border-white/[0.10] rounded-[28px] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_45px_-16px_rgba(0,0,0,0.85)] flex flex-col gap-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_62%)]"
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{t('ends_in')}</span>
            </div>
            <div className="text-2xl font-display font-extrabold text-white tabular-nums tracking-tight">
              {timeLeft || '...'}
            </div>
            <p className="text-white/60 text-xs mt-1 leading-snug">
              {t('top_players')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-md">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-xs font-bold text-white/90">{config.places} {t('places')}</span>
            </div>
          </div>
        </div>

        {/* Колонны пьедестала лидеров с призами (1, 2, 3 места) */}
        {champion && (
          <div className="relative z-10 mt-2 pt-4 border-t border-white/[0.08]">
            <div className="grid grid-cols-3 gap-2 items-end max-w-sm mx-auto">
              {/* #2 Колонна 2-го места */}
              {runnerUp ? (
                <div className="flex flex-col items-center p-2.5 rounded-2xl bg-white/[0.03]">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-black/40 shadow-sm">
                    <img
                      src={getPlayerAvatarUrl(runnerUp)}
                      alt={runnerUp.firstName || runnerUp.username || '2'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(runnerUp.username || runnerUp.firstName || '2')}`;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-white/90 truncate max-w-[80px] mt-1.5">
                    {maskName(runnerUp.firstName || runnerUp.username)}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-black text-white/90 mt-0.5">
                    {formatTurnover(runnerUp.turnover)}
                    <GramIcon className="w-3 h-3 text-brand" />
                  </div>
                  {getPrizeUrl(2) && (
                    <div className="mt-1 flex items-center justify-center" title={getPrizeName(2)}>
                      <PremiumImage src={getPrizeUrl(2)} alt="Prize" className="w-9 h-9 object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* #1 Колонна чемпиона 1-го места */}
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.04] -translate-y-1">
                <div className="relative w-15 h-15 rounded-full overflow-hidden bg-black/50 shadow-md">
                  <img
                    src={getPlayerAvatarUrl(champion)}
                    alt={champion.firstName || champion.username || '1'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(champion.username || champion.firstName || '1')}`;
                    }}
                  />
                </div>
                <span className="text-xs font-black text-white truncate max-w-[90px] mt-1.5">
                  {maskName(champion.firstName || champion.username)}
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-white mt-0.5">
                  {formatTurnover(champion.turnover)}
                  <GramIcon className="w-3.5 h-3.5 text-brand" />
                </div>
                {getPrizeUrl(1) && (
                  <div className="mt-1 flex items-center justify-center" title={getPrizeName(1)}>
                    <PremiumImage src={getPrizeUrl(1)} alt="Prize" className="w-11 h-11 object-contain" />
                  </div>
                )}
              </div>

              {/* #3 Колонна 3-го места */}
              {thirdPlace ? (
                <div className="flex flex-col items-center p-2.5 rounded-2xl bg-white/[0.03]">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-black/40 shadow-sm">
                    <img
                      src={getPlayerAvatarUrl(thirdPlace)}
                      alt={thirdPlace.firstName || thirdPlace.username || '3'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(thirdPlace.username || thirdPlace.firstName || '3')}`;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-white/90 truncate max-w-[80px] mt-1.5">
                    {maskName(thirdPlace.firstName || thirdPlace.username)}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-black text-white/90 mt-0.5">
                    {formatTurnover(thirdPlace.turnover)}
                    <GramIcon className="w-3 h-3 text-brand" />
                  </div>
                  {getPrizeUrl(3) && (
                    <div className="mt-1 flex items-center justify-center" title={getPrizeName(3)}>
                      <PremiumImage src={getPrizeUrl(3)} alt="Prize" className="w-9 h-9 object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Таблица игроков с колонкой призов */}
      <div className="group relative overflow-hidden bg-white/[0.06] backdrop-blur-2xl border border-white/[0.10] rounded-[28px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_45px_-16px_rgba(0,0,0,0.85)] flex flex-col gap-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_62%)]"
        />

        {/* Заголовки колонок */}
        <div className="relative z-10 flex items-center gap-3 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-[16px] text-[10px] font-bold text-white/50 uppercase tracking-wider">
          <div className="w-[34px] shrink-0 text-center">#</div>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="w-[38px] shrink-0" aria-hidden="true" />
            <span>{t('user')}</span>
          </div>
          <div className="w-12 shrink-0 text-center">{t('prize')}</div>
          <div className="w-[92px] shrink-0 text-right pr-2">{t('turnover_col')}</div>
        </div>

        {top.length === 0 ? (
          <div className="relative z-10 text-center py-10 bg-white/[0.03] rounded-2xl border border-dashed border-white/10">
            <p className="text-white/40 text-sm">{t('no_players_yet')}</p>
          </div>
        ) : (
          top.map((user) => {
            const prizeUrl = getPrizeUrl(user.rank);
            const prizeName = getPrizeName(user.rank);

            return (
              <div
                key={user.id}
                className={`relative z-10 rounded-[18px] p-2.5 flex items-center gap-3 border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all ${getRowStyle(user.rank)}`}
              >
                {/* Номер места */}
                <div className={`w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${getRankBadge(user.rank)}`}>
                  {user.rank}
                </div>

                {/* Аватар */}
                <div className="w-[38px] h-[38px] shrink-0 rounded-full overflow-hidden bg-white/[0.08] border border-white/[0.12] shadow-sm">
                  <img
                    src={getPlayerAvatarUrl(user)}
                    alt={user.firstName || user.username || ''}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username || user.firstName || String(user.id))}`;
                    }}
                  />
                </div>

                {/* Имя */}
                <div className="flex-1 min-w-0">
                  <span className="text-white font-bold text-[14px] truncate block leading-tight">
                    {maskName(user.firstName || user.username)}
                  </span>
                  {user.rank <= 3 && (
                    <span className="text-[10px] font-semibold text-brand/90">
                      {user.rank === 1 ? '🥇 Топ 1' : user.rank === 2 ? '🥈 Топ 2' : '🥉 Топ 3'}
                    </span>
                  )}
                </div>

                {/* Приз (Колонка с призом - фиксированная ширина w-12) */}
                <div className="w-12 shrink-0 flex items-center justify-center text-center" title={prizeName}>
                  {prizeUrl ? (
                    <PremiumImage src={prizeUrl} alt="Prize" className="w-8 h-8 object-contain drop-shadow-md" />
                  ) : null}
                </div>

                {/* Оборот (Фиксированная ширина w-[92px] без усечения точками) */}
                <div className="w-[92px] shrink-0 flex items-center justify-end">
                  <div className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center gap-1">
                    <span className="font-bold text-white text-[12px] block tabular-nums whitespace-nowrap">{formatTurnover(user.turnover)}</span>
                    <GramIcon className="w-3.5 h-3.5 text-brand shrink-0" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Фиксированная строка текущего игрока в фирменном стиле */}
      {currentUser && (
        <div className="fixed bottom-[95px] left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-sm mx-auto pointer-events-auto">
            <div className="group relative overflow-hidden bg-[#18181b]/95 backdrop-blur-2xl border border-brand/35 rounded-full px-3.5 py-2 flex items-center gap-3 shadow-[0_4px_25px_rgba(0,152,234,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]">
              {/* Место */}
              <div className={`relative z-10 w-[32px] h-[32px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${getRankBadge(currentUser.rank)}`}>
                {currentUser.rank > 999 ? '999+' : currentUser.rank}
              </div>

              {/* Аватар */}
              <div className="relative z-10 w-[34px] h-[34px] shrink-0 rounded-full overflow-hidden bg-white/[0.08] border border-white/[0.12] shadow-sm">
                <img
                  src={getPlayerAvatarUrl(currentUser)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.username || currentUser.firstName || 'me')}`;
                  }}
                />
              </div>

              {/* Бейдж YOU */}
              <div className="relative z-10 flex-1 min-w-0 flex items-center">
                <span className="px-2.5 py-0.5 rounded-full bg-brand/20 border border-brand/40 text-brand text-[11px] font-bold tracking-wide">
                  {t('you')}
                </span>
              </div>

              {/* Приз */}
              {(() => {
                const prizeUrl = getPrizeUrl(currentUser.rank);
                const prizeName = getPrizeName(currentUser.rank);
                if (prizeUrl) {
                  return (
                    <div className="relative z-10 flex items-center justify-center shrink-0 w-10" title={prizeName}>
                      <PremiumImage src={prizeUrl} alt="Prize" className="w-8 h-8 object-contain drop-shadow" />
                    </div>
                  );
                }
                return null;
              })()}

              {/* Оборот */}
              <div className="relative z-10 text-right shrink-0 flex items-center justify-end">
                <div className="px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center gap-1">
                  <span className="font-bold text-white text-[12px] block tabular-nums whitespace-nowrap">{formatTurnover(currentUser.turnover)}</span>
                  <GramIcon className="w-3 h-3 text-brand shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно правил */}
      {showRules && (
        <LiquidDialog
          title={t('how_to_participate')}
          subtitle={t('tournament_rules')}
          icon={<AnimatedTrophy className="w-[30px] h-[30px]" />}
          onClose={() => setShowRules(false)}
          actionLabel={t('got_it')}
        >
          <div className="space-y-2.5 pb-1">
            <p className="text-center text-white/90 text-[13px] rounded-2xl p-3.5 bg-brand/[0.08] border border-brand/30">
              {t('play_modes')} <GramIcon className="w-3.5 h-3.5 mx-1 inline-block text-brand" /> <b>GRAM</b>.
            </p>
            <div className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08]">
              <p className="font-semibold text-white text-[13px] mb-1">{t('how_turnover')}</p>
              <p className="text-[12px] text-white/70 leading-relaxed">{t('turnover_desc')}</p>
            </div>
            <div className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08]">
              <p className="font-semibold text-white text-[13px] mb-1">{t('prizes_to_winners')}</p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                <span dangerouslySetInnerHTML={{ __html: t('prizes_desc') }} />
              </p>
            </div>
          </div>
        </LiquidDialog>
      )}
    </div>
  );
}

export default Leaderboard;
