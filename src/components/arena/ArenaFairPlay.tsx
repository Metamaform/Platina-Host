/*
  🛡 ЧЕСТНАЯ ИГРА — provably fair информация о раунде.

  Результат формируется ТОЛЬКО на сервере:
    serverSeed = random 32 bytes (секретный)
    hash       = SHA-256(serverSeed)             — публикуется ДО розыгрыша
    roll       = HMAC-SHA256(serverSeed, "arena:<id>")[0..48bit] / 2^48
    ticket     = roll × totalPool
    победитель = участник, на чьём накопленном интервале долей остановился билет

  После завершения раунда сервер раскрывает serverSeed, и любой игрок может
  нажать «Проверить»: страница сама пересчитает хэш, roll, билет и победителя.
*/

import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Copy, Check, Loader2 } from 'lucide-react';
import { X } from 'lucide-react';
import type { ArenaRoundState } from '../../lib/arenaShared';

interface FairData {
  id: number;
  status: string;
  serverSeedHash: string;
  serverSeed?: string;
  roll?: number;
  ticket?: number;
  totalPool: number;
  winnerId?: string;
  participants: { id: string; contribution: number; percentage: number; status: string }[];
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacRollHex(serverSeed: string, roundId: number): Promise<number> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serverSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`arena:${roundId}`));
  const bytes = new Uint8Array(sig);
  // 48 бит, как на сервере
  const int = bytes[0] * 2 ** 40 + bytes[1] * 2 ** 32 + bytes[2] * 2 ** 24 + bytes[3] * 2 ** 16 + bytes[4] * 2 ** 8 + bytes[5];
  return int / 2 ** 48;
}

const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
      }}
      className="shrink-0 w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center transition-transform cursor-pointer"
      aria-label="copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/60" />}
    </button>
  );
};

const MonoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">{label}</div>
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 bg-black/40 border border-white/[0.08] rounded-[12px] px-3 py-2 text-[10px] font-mono text-white/70 break-all leading-relaxed">
        {value}
      </code>
      <CopyBtn text={value} />
    </div>
  </div>
);

interface FairPlayModalProps {
  round: ArenaRoundState;
  onClose: () => void;
  t: (k: string) => string;
}

export const FairPlayModal: React.FC<FairPlayModalProps> = ({ round, onClose, t }) => {
  const [fair, setFair] = useState<FairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');
  const [verifyDetail, setVerifyDetail] = useState<string>('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/arena/fair/${round.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setFair(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [round.id]);

  const revealed = !!fair?.serverSeed;

  const runVerify = async () => {
    if (!fair?.serverSeed) return;
    setVerifyState('checking');
    try {
      const hash = await sha256Hex(fair.serverSeed);
      if (hash !== fair.serverSeedHash) {
        setVerifyState('fail');
        setVerifyDetail(t('arena_fair_fail_hash'));
        return;
      }
      const roll = await hmacRollHex(fair.serverSeed, fair.id);
      const ticket = roll * fair.totalPool;
      let acc = 0;
      let winner: string | null = null;
      for (const p of fair.participants) {
        acc += p.contribution;
        if (ticket < acc) { winner = p.id; break; }
      }
      if (!winner && fair.participants.length) winner = fair.participants[fair.participants.length - 1].id;
      if (winner === fair.winnerId) {
        setVerifyState('ok');
        setVerifyDetail(t('arena_fair_ok'));
      } else {
        setVerifyState('fail');
        setVerifyDetail(t('arena_fair_fail_winner'));
      }
    } catch {
      setVerifyState('fail');
      setVerifyDetail(t('arena_fair_fail_hash'));
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#16171b]/95 backdrop-blur-2xl rounded-t-[32px] p-5 pb-8 border-t border-white/[0.12] shadow-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[16px] font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            {t('arena_fair_title')}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center transition-transform cursor-pointer"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">{t('arena_round')}</span>
                <span className="font-display font-bold text-white/90">#{round.id}</span>
              </div>
              <p className="text-[12px] text-white/55 leading-relaxed">{t('arena_fair_desc')}</p>
            </div>

            {fair && (
              <>
                <MonoRow label={t('arena_fair_hash')} value={fair.serverSeedHash} />

                {revealed ? (
                  <>
                    <MonoRow label={t('arena_fair_seed')} value={fair.serverSeed!} />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('arena_fair_roll')}</div>
                        <div className="font-display font-bold text-white/90 text-[14px] mt-0.5">{fair.roll?.toFixed(6)}</div>
                      </div>
                      <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('arena_fair_ticket')}</div>
                        <div className="font-display font-bold text-white/90 text-[14px] mt-0.5">{fair.ticket?.toFixed(2)}</div>
                      </div>
                    </div>

                    <button
                      onClick={runVerify}
                      disabled={verifyState === 'checking'}
                      className="w-full h-[48px] rounded-full font-display font-bold text-[14px] tracking-wide bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.2)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {verifyState === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      {t('arena_fair_check_btn')}
                    </button>

                    {verifyState === 'ok' && (
                      <div className="rounded-[16px] border border-emerald-500/40 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[12px] font-semibold text-emerald-300 text-center">
                        ✔ {verifyDetail}
                      </div>
                    )}
                    {verifyState === 'fail' && (
                      <div className="rounded-[16px] border border-red-500/40 bg-red-500/[0.08] px-3.5 py-2.5 text-[12px] font-semibold text-red-400 text-center">
                        ✕ {verifyDetail}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-[12px] text-white/50 leading-relaxed">
                    {t('arena_fair_pending')}
                  </div>
                )}

                <p className="text-[11px] text-white/35 leading-relaxed px-1">{t('arena_fair_formula')}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
