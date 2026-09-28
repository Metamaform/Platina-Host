import { useTranslation } from '../lib/i18n';
import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Users } from 'lucide-react';
import { PremiumImage } from './PremiumImage';
import { GramIcon } from './GramIcon';
import { LiquidDialog } from './ui/LiquidDialog';

export function Leaderboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<{top: any[], currentUser: any} | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('pg_session_token');
    Promise.all([
      fetch('/api/leaderboard', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/leaderboard/config', { cache: 'no-store' }).then(r => r.json())
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
      
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
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

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-b from-[#FDE047] to-[#EAB308] text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.4)] border border-yellow-300 font-extrabold';
    if (rank === 2) return 'bg-gradient-to-b from-[#E2E8F0] to-[#94A3B8] text-slate-900 shadow-[0_0_15px_rgba(148,163,184,0.35)] border border-slate-300 font-extrabold';
    if (rank === 3) return 'bg-gradient-to-b from-[#FDBA74] to-[#EA580C] text-orange-950 shadow-[0_0_15px_rgba(234,88,12,0.35)] border border-orange-300 font-extrabold';
    return 'bg-white/[0.08] text-white border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] font-bold';
  };

  const getRowStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/[0.08] border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
    if (rank === 2) return 'bg-slate-300/[0.08] border-slate-300/30 shadow-[0_0_15px_rgba(203,213,225,0.1)]';
    if (rank === 3) return 'bg-orange-500/[0.08] border-orange-500/30 shadow-[0_0_15px_rgba(234,88,12,0.1)]';
    return 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]';
  };

  const maskName = (name: string) => {
    if (!name || name.length <= 3) return name || t('player');
    return name.slice(0, 2) + '***' + name.slice(-2);
  };

  if (!data || !config) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const { top, currentUser } = data;

  return (
    <div className="flex flex-col px-1 pb-24 relative space-y-4">
      {/* Top Banner / Header Card in Liquid Glass */}
      <div className="group relative overflow-hidden bg-white/[0.07] backdrop-blur-2xl border border-white/[0.10] rounded-[26px] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center text-center">
        {/* верхнее бликовое свечение жидкого стекла */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-4/5 h-16 rounded-full bg-white/[0.08] blur-2xl opacity-70"
        />

        <div className="relative z-10 w-14 h-14 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
          <Trophy className="w-7 h-7" />
        </div>
        <h2 className="relative z-10 text-[22px] font-bold text-white mb-1 tracking-tight">{t('leaderboard_title')}</h2>
        <p className="relative z-10 text-white/60 text-[13px] max-w-[280px] leading-relaxed">
          {t('top_players')}
        </p>

        <div className="relative z-10 flex items-center justify-center gap-2 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
             <Clock className="w-3.5 h-3.5 text-white/60" />
             <span className="text-[11px] font-semibold text-white">{timeLeft || '...'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
             <Users className="w-3.5 h-3.5 text-white/60" />
             <span className="text-[11px] font-semibold text-white">{config.places} {t('places')}</span>
          </div>
          <button 
            onClick={() => setShowRules(true)} 
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-white/[0.14] text-white font-bold text-xs transition-transform active:scale-95 cursor-pointer"
          >
             <span>?</span>
          </button>
        </div>
      </div>

      {/* Players List Container Card in Liquid Glass */}
      <div className="group relative overflow-hidden bg-white/[0.07] backdrop-blur-2xl border border-white/[0.10] rounded-[26px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)] flex flex-col gap-2">
        {/* верхнее бликовое свечение жидкого стекла */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_62%)]"
        />
        
        {/* Column Headers */}
        <div className="relative z-10 flex items-center gap-3 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-[16px] text-[10px] font-bold text-white/50 uppercase tracking-wider">
          <div className="w-[36px] shrink-0 text-center">#</div>
          <div className="flex-1 min-w-0">{t('user')}</div>
          <div className="w-12 shrink-0 text-center">{t('prize')}</div>
          <div className="shrink-0 text-right min-w-[60px]">{t('turnover_col')}</div>
        </div>

        {top.length === 0 ? (
          <div className="relative z-10 text-center py-10 bg-white/[0.03] rounded-2xl border border-dashed border-white/10">
             <p className="text-white/40 text-sm">{t('no_players_yet')}</p>
          </div>
        ) : (
          top.map((user) => (
            <div key={user.id} className={`relative z-10 rounded-[18px] p-2.5 flex items-center gap-3 border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all ${getRowStyle(user.rank)}`}>
              <div className={`w-[36px] h-[36px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${getRankStyle(user.rank)}`}>
                {user.rank}
              </div>
              
              <div className="w-[38px] h-[38px] shrink-0 rounded-full overflow-hidden bg-white/[0.08] border border-white/[0.10] shadow-sm">
                {user.photoUrl ? <img src={user.photoUrl || undefined} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#18181b]" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-white font-semibold text-[14px] truncate block leading-tight">{maskName(user.firstName || user.username)}</span>
              </div>

              {(() => {
                let prizeUrl = config.prizeNftUrl;
                if (config.prizes && user.rank in config.prizes) {
                  prizeUrl = config.prizes[user.rank] ? config.prizes[user.rank].url : null;
                } else if (user.rank > config.places) {
                  prizeUrl = null;
                }
                
                if (prizeUrl) {
                  return (
                    <div className="flex flex-col items-center justify-center shrink-0 w-12" title="Expected prize at the end of the timer">
                      <PremiumImage src={prizeUrl} alt="Prize" className="w-9 h-9 object-contain drop-shadow-lg" />
                      <span className="text-[9px] text-brand/80 font-bold uppercase mt-0.5">{t('prize')}</span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="text-right shrink-0">
                <div className="bg-white/[0.08] border border-white/[0.10] px-2.5 py-1 rounded-full flex items-center justify-center min-w-[60px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <span className="font-bold text-white text-[13px] block">{formatTurnover(user.turnover)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Bottom Current User Row in Liquid Glass */}
      {currentUser && (
        <div className="fixed bottom-[95px] left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-sm mx-auto pointer-events-auto">
            <div className="group relative overflow-hidden bg-white/[0.09] backdrop-blur-2xl border border-white/[0.14] rounded-full px-3 py-2 flex items-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_15px_35px_rgba(0,0,0,0.85)]">
              {/* верхний блик */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />
              
              <div className={`relative z-10 w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${getRankStyle(currentUser.rank)}`}>
                {currentUser.rank > 999 ? '999+' : currentUser.rank}
              </div>
              
              <div className="relative z-10 w-[34px] h-[34px] shrink-0 rounded-full overflow-hidden bg-white/[0.08] border border-white/[0.10] shadow-sm">
                {currentUser.photoUrl ? <img src={currentUser.photoUrl || undefined} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#18181b]" />}
              </div>
              
              <div className="relative z-10 flex-1 min-w-0 flex items-center">
                <span className="px-2.5 py-0.5 rounded-full bg-brand/20 border border-brand/40 text-brand text-[11px] font-bold tracking-wide shadow-sm">{t('you')}</span>
              </div>

              {(() => {
                let prizeUrl = config.prizeNftUrl;
                if (config.prizes && currentUser.rank in config.prizes) {
                  prizeUrl = config.prizes[currentUser.rank] ? config.prizes[currentUser.rank].url : null;
                } else if (currentUser.rank > config.places) {
                  prizeUrl = null;
                }
                
                if (prizeUrl) {
                  return (
                    <div className="relative z-10 flex flex-col items-center justify-center shrink-0 w-10">
                      <PremiumImage src={prizeUrl} alt="Prize" className="w-7 h-7 object-contain drop-shadow-md" />
                      <span className="text-[8px] text-brand/80 font-bold uppercase">{t('prize')}</span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="relative z-10 text-right shrink-0">
                <div className="bg-white/[0.08] border border-white/[0.10] px-2.5 py-1 rounded-full flex items-center justify-center min-w-[56px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <span className="font-bold text-white text-[12px] block">{formatTurnover(currentUser.turnover)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <LiquidDialog
          title={t('how_to_participate')}
          subtitle="Правила турнира"
          icon={<Trophy className="w-4 h-4" />}
          onClose={() => setShowRules(false)}
          actionLabel={t('got_it')}
        >
          <div className="space-y-2.5 pb-1">
            <p className="text-center text-white/90 text-[13px] rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08]">
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
