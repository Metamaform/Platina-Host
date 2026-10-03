import { useTranslation } from '../lib/i18n';
import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Users, Sparkles, HelpCircle } from 'lucide-react';
import { PremiumImage } from './PremiumNftImage';
import { UserAvatar } from './UserAvatar';
import { GramIcon } from './GramIcon';
import { LiquidDialog } from './ui/LiquidDialog';

export function Leaderboard({ user: authUser }: { user?: any } = {}) {
  const { t } = useTranslation();
  const resolveEntryPhoto = (entry?: any) => {
    if (!entry) return undefined;
    if (authUser?.id != null && entry.id != null && Number(entry.id) === Number(authUser.id)) {
      return authUser.photoUrl || entry.photoUrl;
    }
    return entry.photoUrl;
  };
  const [data, setData] = useState<{ top: any[]; currentUser: any } | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [showRules, setShowRules] = useState(false);

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
    if (rank === 1) return 'bg-gradient-to-r from-amber-500/[0.16] via-amber-500/[0.06] to-transparent border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300/[0.14] via-slate-300/[0.05] to-transparent border-slate-300/40 shadow-[0_0_16px_rgba(203,213,225,0.12)]';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/[0.14] via-orange-500/[0.05] to-transparent border-orange-500/40 shadow-[0_0_16px_rgba(234,88,12,0.12)]';
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
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
      {/* ------------------------------------------------------------- */}
      {/* ГЛАВНОЕ ОКНО «ТОП ДНЯ» В СТИЛЕ ОКНА ВЫИГРЫША ICE ARENA        */}
      {/* ------------------------------------------------------------- */}
      <div className="group relative overflow-hidden rounded-[28px] border border-emerald-400/50 bg-gradient-to-b from-emerald-500/[0.18] via-[#0c1813]/90 to-[#0e1117]/95 p-5 text-center shadow-[0_0_50px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]">
        {/* Верхнее изумрудное амбиентное свечение (как в окне победы Ice Arena) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-28 rounded-full bg-emerald-400/30 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />

        {/* Чип «ТОП ДНЯ» */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/40 text-[10px] font-black tracking-widest uppercase text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Sparkles className="w-3 h-3 text-amber-300" />
            {t('top_day')}
          </span>
        </div>

        {/* Заголовок */}
        <h2 className="relative z-10 font-display text-[24px] sm:text-[26px] font-black tracking-tight text-white leading-tight">
          {t('leaderboard_title')}
        </h2>
        <p className="relative z-10 text-white/60 text-[12px] sm:text-[13px] max-w-[300px] mx-auto mt-1 leading-snug">
          {t('top_day_desc')}
        </p>

        {/* Сводные бейджи: таймер + призовые места + правила */}
        <div className="relative z-10 flex items-center justify-center gap-2 mt-3.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-[11px] font-extrabold text-white tabular-nums">{timeLeft || '...'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-md shadow-sm">
            <Users className="w-3.5 h-3.5 text-white/70" />
            <span className="text-[11px] font-bold text-white/90">{config.places} {t('places')}</span>
          </div>
          <button
            onClick={() => setShowRules(true)}
            aria-label="Правила"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/80 active:scale-95 transition-transform cursor-pointer hover:bg-white/[0.15]"
          >
            <HelpCircle className="w-4 h-4 text-emerald-300" />
          </button>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* ПОДИУМ ЛИДЕРОВ ДНЯ: #2 Серебро, #1 Золото (центр), #3 Бронза */}
        {/* ----------------------------------------------------------- */}
        {champion && (
          <div className="relative z-10 mt-5 pt-4 border-t border-white/[0.10]">
            <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center justify-center gap-1 mb-3">
              <Trophy className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              {t('champion_label')}
            </div>

            <div className="grid grid-cols-3 gap-2 items-end max-w-sm mx-auto">
              {/* #2 Серебряный призёр */}
              {runnerUp ? (
                <div className="flex flex-col items-center p-2 rounded-[20px] bg-slate-400/[0.08] border border-slate-300/30">
                  <span className="text-[14px] leading-none mb-1">🥈</span>
                  <UserAvatar
                    src={resolveEntryPhoto(runnerUp)}
                    alt={runnerUp.firstName || runnerUp.username || ''}
                    className="w-12 h-12 ring-2 ring-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.4)]"
                  />
                  <span className="text-[11px] font-bold text-white/90 truncate max-w-[80px] mt-1.5">
                    {maskName(runnerUp.firstName || runnerUp.username)}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-black text-slate-200 mt-0.5">
                    {formatTurnover(runnerUp.turnover)}
                    <GramIcon className="w-3 h-3 text-brand" />
                  </div>
                  {getPrizeUrl(2) && (
                    <div className="mt-1.5 p-1 rounded-xl bg-black/30 border border-white/10" title={getPrizeName(2)}>
                      <PremiumImage src={getPrizeUrl(2)} alt="Prize" className="w-7 h-7 object-contain drop-shadow" />
                    </div>
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* #1 ЧЕМПИОН ДНЯ (Золотой кубок, увеличенный масштаб) */}
              <div className="flex flex-col items-center p-3 rounded-[22px] bg-gradient-to-b from-amber-500/[0.22] via-emerald-500/[0.10] to-black/40 border border-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.3)] -translate-y-1">
                <span className="text-[20px] leading-none mb-1 animate-bounce">👑</span>
                <UserAvatar
                  src={resolveEntryPhoto(champion)}
                  alt={champion.firstName || champion.username || ''}
                  className="w-16 h-16 ring-4 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.7)]"
                />
                <span className="text-[13px] font-black text-white truncate max-w-[95px] mt-1.5">
                  {maskName(champion.firstName || champion.username)}
                </span>
                <div className="flex items-center gap-1 text-[13px] font-black text-amber-300 mt-0.5 drop-shadow">
                  {formatTurnover(champion.turnover)}
                  <GramIcon className="w-3.5 h-3.5 text-brand drop-shadow-[0_0_8px_rgba(0,152,234,0.7)]" />
                </div>
                {getPrizeUrl(1) && (
                  <div className="mt-1.5 p-1 rounded-xl bg-black/40 border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] flex flex-col items-center" title={getPrizeName(1)}>
                    <PremiumImage src={getPrizeUrl(1)} alt="Prize" className="w-9 h-9 object-contain drop-shadow-md" />
                    <span className="text-[8px] font-black uppercase text-amber-300 mt-0.5 tracking-wider">
                      {t('guaranteed_prize')}
                    </span>
                  </div>
                )}
              </div>

              {/* #3 Бронзовый призёр */}
              {thirdPlace ? (
                <div className="flex flex-col items-center p-2 rounded-[20px] bg-amber-600/[0.08] border border-amber-600/30">
                  <span className="text-[14px] leading-none mb-1">🥉</span>
                  <UserAvatar
                    src={resolveEntryPhoto(thirdPlace)}
                    alt={thirdPlace.firstName || thirdPlace.username || ''}
                    className="w-12 h-12 ring-2 ring-amber-600 shadow-[0_0_12px_rgba(217,119,6,0.4)]"
                  />
                  <span className="text-[11px] font-bold text-white/90 truncate max-w-[80px] mt-1.5">
                    {maskName(thirdPlace.firstName || thirdPlace.username)}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-black text-amber-400 mt-0.5">
                    {formatTurnover(thirdPlace.turnover)}
                    <GramIcon className="w-3 h-3 text-brand" />
                  </div>
                  {getPrizeUrl(3) && (
                    <div className="mt-1.5 p-1 rounded-xl bg-black/30 border border-white/10" title={getPrizeName(3)}>
                      <PremiumImage src={getPrizeUrl(3)} alt="Prize" className="w-7 h-7 object-contain drop-shadow" />
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

      {/* ------------------------------------------------------------- */}
      {/* ТАБЛИЦА ВСЕХ ИГРОКОВ (Жидкое стекло с аккуратными рядами)     */}
      {/* ------------------------------------------------------------- */}
      <div className="group relative overflow-hidden bg-white/[0.06] backdrop-blur-2xl border border-white/[0.10] rounded-[28px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_45px_-16px_rgba(0,0,0,0.85)] flex flex-col gap-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_62%)]"
        />

        {/* Заголовки колонок */}
        <div className="relative z-10 flex items-center gap-3 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-[16px] text-[10px] font-bold text-white/50 uppercase tracking-wider">
          <div className="w-[34px] shrink-0 text-center">#</div>
          <div className="flex-1 min-w-0">{t('user')}</div>
          <div className="w-12 shrink-0 text-center">{t('prize')}</div>
          <div className="shrink-0 text-right min-w-[64px]">{t('turnover_col')}</div>
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
                <UserAvatar
                  src={resolveEntryPhoto(user)}
                  alt={user.firstName || user.username || ''}
                  className="w-[38px] h-[38px] shrink-0 border border-white/[0.12] shadow-sm"
                />

                {/* Имя */}
                <div className="flex-1 min-w-0">
                  <span className="text-white font-bold text-[14px] truncate block leading-tight">
                    {maskName(user.firstName || user.username)}
                  </span>
                  {user.rank <= 3 && (
                    <span className="text-[10px] font-semibold text-emerald-300/80">
                      {user.rank === 1 ? '🥇 Топ 1' : user.rank === 2 ? '🥈 Топ 2' : '🥉 Топ 3'}
                    </span>
                  )}
                </div>

                {/* Приз */}
                {prizeUrl ? (
                  <div className="flex flex-col items-center justify-center shrink-0 w-12" title={prizeName}>
                    <PremiumImage src={prizeUrl} alt="Prize" className="w-9 h-9 object-contain drop-shadow-md" />
                    <span className="text-[8px] text-amber-300 font-bold uppercase mt-0.5">
                      {t('prize')}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 shrink-0" />
                )}

                {/* Оборот */}
                <div className="text-right shrink-0">
                  <div className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center gap-1 min-w-[64px]">
                    <span className="font-bold text-white text-[13px] block tabular-nums">{formatTurnover(user.turnover)}</span>
                    <GramIcon className="w-3.5 h-3.5 text-brand" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ФИКСИРОВАННАЯ СТРОКА ТЕКУЩЕГО ИГРОКА (В СТИЛЕ ICE ARENA)       */}
      {/* ------------------------------------------------------------- */}
      {currentUser && (
        <div className="fixed bottom-[95px] left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-sm mx-auto pointer-events-auto">
            <div className="group relative overflow-hidden bg-gradient-to-r from-[#0d2217]/95 via-[#13161c]/95 to-[#0d2217]/95 backdrop-blur-2xl border border-emerald-400/50 rounded-full px-3.5 py-2 flex items-center gap-3 shadow-[0_0_35px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />

              {/* Место */}
              <div className={`relative z-10 w-[32px] h-[32px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${getRankBadge(currentUser.rank)}`}>
                {currentUser.rank > 999 ? '999+' : currentUser.rank}
              </div>

              {/* Аватар */}
              <UserAvatar
                src={resolveEntryPhoto(currentUser)}
                alt={currentUser.firstName || currentUser.username || ''}
                className="relative z-10 w-[34px] h-[34px] shrink-0 border border-white/[0.12] shadow-sm"
              />

              {/* Бейдж YOU */}
              <div className="relative z-10 flex-1 min-w-0 flex items-center">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[11px] font-black tracking-wide shadow-sm">
                  {t('you')}
                </span>
              </div>

              {/* Приз */}
              {(() => {
                const prizeUrl = getPrizeUrl(currentUser.rank);
                const prizeName = getPrizeName(currentUser.rank);
                if (prizeUrl) {
                  return (
                    <div className="relative z-10 flex flex-col items-center justify-center shrink-0 w-10" title={prizeName}>
                      <PremiumImage src={prizeUrl} alt="Prize" className="w-7 h-7 object-contain drop-shadow" />
                      <span className="text-[8px] text-amber-300 font-bold uppercase">{t('prize')}</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Оборот */}
              <div className="relative z-10 text-right shrink-0">
                <div className="px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center gap-1 min-w-[60px]">
                  <span className="font-bold text-white text-[12px] block tabular-nums">{formatTurnover(currentUser.turnover)}</span>
                  <GramIcon className="w-3 h-3 text-brand" />
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
          icon={<Trophy className="w-4 h-4 text-emerald-400" />}
          onClose={() => setShowRules(false)}
          actionLabel={t('got_it')}
        >
          <div className="space-y-2.5 pb-1">
            <p className="text-center text-white/90 text-[13px] rounded-2xl p-3.5 bg-emerald-500/[0.08] border border-emerald-400/30">
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
