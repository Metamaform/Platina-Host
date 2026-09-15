import { useTranslation } from '../lib/i18n';
import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Users, X } from 'lucide-react';
import { PremiumImage } from './PremiumImage';
import { GramIcon } from './GramIcon';
import { motion, AnimatePresence } from 'motion/react';

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
    if (rank === 1) return 'bg-gradient-to-b from-[#FDE047] to-[#EAB308] text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-300';
    if (rank === 2) return 'bg-gradient-to-b from-[#E2E8F0] to-[#94A3B8] text-slate-900 shadow-[0_0_15px_rgba(148,163,184,0.4)] border border-slate-300';
    if (rank === 3) return 'bg-gradient-to-b from-[#FDBA74] to-[#EA580C] text-orange-950 shadow-[0_0_15px_rgba(234,88,12,0.4)] border border-orange-300';
    return 'bg-[#292929] text-white border border-white/5';
  };

  const getRowStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/15 to-[#18181b] border border-yellow-500/20';
    if (rank === 2) return 'bg-gradient-to-r from-slate-400/15 to-[#18181b] border border-slate-400/20';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/15 to-[#18181b] border border-orange-500/20';
    return 'bg-[#18181b] border border-transparent';
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
    <div className="flex flex-col px-4 pb-24 relative">
      <div className="flex flex-col items-center justify-center text-center mt-6 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 flex items-center justify-center text-yellow-400 mb-4 shadow-[0_0_30px_rgba(250,204,21,0.3)] border border-yellow-400/30">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-[22px] font-bold text-white mb-1">{t('leaderboard_title')}</h2>
        <p className="text-[#a1a1aa] text-[13px] max-w-[280px] leading-relaxed">
          {t('top_players')}
        </p>

        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
             <Clock className="w-3.5 h-3.5 text-white/40" />
             <span className="text-[12px] font-medium text-white/70">{timeLeft || '...'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
             <Users className="w-3.5 h-3.5 text-white/40" />
             <span className="text-[12px] font-medium text-white/70">{config.places} {t('places')}</span>
          </div>
          <button onClick={() => setShowRules(true)} className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors active:scale-95">
             <span className="text-white/70 font-bold text-sm">?</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 px-3 py-1.5 bg-white/5 border border-white/5 rounded-[12px] text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">
          <div className="w-[42px] shrink-0 text-center"></div>
          <div className="flex-1 min-w-0">{t('user')}</div>
          <div className="w-12 shrink-0 text-center">{t('prize')}</div>
          <div className="shrink-0 text-right min-w-[60px]">{t('turnover_col')}</div>
        </div>
        {top.length === 0 ? (
          <div className="text-center py-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
             <p className="text-muted text-sm">{t('no_players_yet')}</p>
          </div>
        ) : (
          top.map((user, idx) => (
            <div key={user.id} className={`rounded-[16px] p-3 flex items-center gap-4 relative ${getRowStyle(user.rank)}`}>
              <div className={`w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(user.rank)}`}>
                {user.rank}
              </div>
              
              <div className="w-[42px] h-[42px] shrink-0 rounded-full overflow-hidden bg-white/10 border border-white/5">
                {user.photoUrl ? <img src={user.photoUrl || undefined} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#18181b]" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium text-[16px] truncate block leading-tight">{maskName(user.firstName || user.username)}</span>
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
                    <div className="flex flex-col items-center justify-center shrink-0 w-12" title="Expected prize at the end of the timer"><PremiumImage src={prizeUrl} alt="Prize" className="w-10 h-10 object-contain drop-shadow-lg" /><span className="text-[9px] text-brand/70 font-bold uppercase mt-0.5">{t('prize')}</span></div>
                  );
                }
                return null;
              })()}

              <div className="text-right shrink-0">
                <div className="bg-[#b490fa]/15 border border-[#b490fa]/20 px-2.5 py-1 rounded-lg flex items-center justify-center min-w-[64px]">
                  <span className="font-bold text-[#b490fa] text-[14px] block">{formatTurnover(user.turnover)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Bottom Current User Row */}
      {currentUser && (
        <div className="fixed bottom-[105px] left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="bg-[#16161a]/60 backdrop-blur-md border border-white/10 rounded-[20px] px-3 py-4 flex items-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] relative overflow-hidden">
              <div className="absolute inset-0 bg-brand/5 pointer-events-none" />
              
              <div className={`w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(currentUser.rank)}`}>
                {currentUser.rank > 999 ? '999+' : currentUser.rank}
              </div>
              
              <div className="w-[42px] h-[42px] shrink-0 rounded-full overflow-hidden bg-white/10 border border-white/5">
                {currentUser.photoUrl ? <img src={currentUser.photoUrl || undefined} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#18181b]" />}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center">
                  <span className="px-2 py-0.5 rounded bg-[#4b3582] text-white text-[12px] font-bold tracking-wide shadow-sm">{t('you')}</span>
                </div>
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
                    <div className="flex flex-col items-center justify-center shrink-0 w-12" title="Expected prize at the end of the timer"><PremiumImage src={prizeUrl} alt="Prize" className="w-10 h-10 object-contain drop-shadow-lg" /><span className="text-[9px] text-brand/70 font-bold uppercase mt-0.5">{t('prize')}</span></div>
                  );
                }
                return null;
              })()}

              <div className="text-right shrink-0">
                <div className="bg-[#b490fa]/15 border border-[#b490fa]/20 px-2.5 py-1 rounded-lg flex items-center justify-center min-w-[64px]">
                  <span className="font-bold text-[#b490fa] text-[14px] block">{formatTurnover(currentUser.turnover)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowRules(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#181a20] rounded-[24px] p-6 shadow-2xl border border-white/10 overflow-hidden"
            >
              <button 
                onClick={() => setShowRules(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center text-brand mb-3">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{t('how_to_participate')}</h3>
              </div>
              
              <div className="space-y-4 text-[14px] text-white/70">
                <p>
                  {t('play_modes')} <GramIcon className="w-3.5 h-3.5 mx-1 inline-block" /> <b>GRAM</b>.
                </p>
                
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <p className="font-medium text-white mb-1">{t('how_turnover')}</p>
                  <p className="text-[13px]">
                    {t('turnover_desc')}
                  </p>
                </div>
                
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <p className="font-medium text-white mb-1">{t('prizes_to_winners')}</p>
                  <p className="text-[13px]">
                    {t('prizes_desc')}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowRules(false)}
                className="w-full mt-6 py-3.5 rounded-xl font-bold bg-brand text-black active:scale-[0.98] transition-transform"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
