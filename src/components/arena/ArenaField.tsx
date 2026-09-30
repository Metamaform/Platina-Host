/*
  ArenaField — игровое поле AICE ARENA: «платформа взлёта» в визуальном
  языке Rocket.

  По полю идёт стартовая платформа — ледовая полоса взлёта из нижнего
  левого угла в правый верхний. Геометрия и деление территорий — в
  arenaPlatform.ts (чистая математика, покрыта тестами).

  Платформа разделена на территории игроков с гарантией видимости
  (даже мелкие ставки защищены от растворения в 0px).

  Движение шарика:
  · WAITING / ACCEPTING_BETS — отдыхает на стартовой отметке платформы,
    плавно покачивается с мягким ледовым свечением;
  · LOCKED — «заряжается» энергией перед стартом;
  · DRAWING — динамично скользит ПО ДУГЕ ПЛАТФОРМЫ, проходя по всем
    территориям игроков с физикой и поворотом по касательной;
  · COMPLETED — плавно тормозит по дуге платформы ровно в точку выигрышного
    билета (provably fair: ticket = roll × банк).
    Победная вспышка, корона и золотая метка билета.
*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { GramIcon } from '../GramIcon';
import type { ArenaRoundState } from '../../lib/arenaShared';
import { playersWord } from '../../lib/arenaShared';
import { PlayerAvatar, ArenaStatusChip } from './arenaUi';
import type { ArenaCountdown } from './useArenaCountdown';
import {
  buildPlatformLayout,
  type PlatformSegment,
} from './arenaPlatform';

interface ArenaFieldProps {
  round: ArenaRoundState;
  countdown: ArenaCountdown;
  myUserId?: number;
  lang: string;
  onJoin: () => void;
  t: (k: string) => string;
}

// Толщина «палубы» платформы, px (в экранных координатах).
const DECK_W = 26;
// Размер шарика, px.
const BALL_SIZE = 34;

type BallPhase = 'idle' | 'charging' | 'drawing' | 'landing' | 'parked';

/**
 * Направление и период вращения текстуры шарика для раунда.
 * Детерминировано от id раунда — общий источник правды для всех игроков.
 */
function roundSpin(id: number): { dir: 1 | -1; dur: number } {
  let x = (id ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  const dir: 1 | -1 = x % 2 === 0 ? 1 : -1;
  const dur = 0.9 + ((x % 1000) / 1000) * 1.5;
  return { dir, dur };
}

function statusDot(status: ArenaRoundState['status']): string {
  switch (status) {
    case 'ACCEPTING_BETS': return 'bg-green-400 animate-ping';
    case 'LOCKED': return 'bg-amber-400';
    case 'DRAWING': return 'bg-cyan-300 animate-pulse';
    case 'COMPLETED': return 'bg-emerald-400';
    case 'WAITING': return 'bg-amber-400 animate-pulse';
    default: return 'bg-red-500';
  }
}

/** Размер контейнера через ResizeObserver (px). */
function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) => (Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5 ? prev : { w: r.width, h: r.height }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

export const ArenaField: React.FC<ArenaFieldProps> = ({
  round, countdown, myUserId, lang, onJoin, t,
}) => {
  const [areaRef, size] = useElementSize<HTMLDivElement>();
  const layout = useMemo(
    () => (size.w > 40 && size.h > 40
      ? buildPlatformLayout(size.w, size.h, round.participants)
      : null),
    [size.w, size.h, round.participants]
  );

  const participants = round.participants;
  const totalPool = round.totalPool;
  const roundFinished = round.status === 'COMPLETED' || round.status === 'CANCELLED' || round.status === 'ERROR';
  const isCompleted = round.status === 'COMPLETED';
  const isDrawing = round.status === 'DRAWING';
  const isLocked = round.status === 'LOCKED';
  const isBetting = round.status === 'ACCEPTING_BETS';

  const reducedMotion = useMemo(
    () => (typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false),
    []
  );

  const spin = useMemo(() => roundSpin(round.id), [round.id]);
  const empty = participants.length === 0;

  // Точка выигрышного билета на платформе
  const ticketFrac = useMemo(() => {
    if (!layout || round.ticket == null || !isCompleted) return null;
    return layout.ticketToFrac(round.ticket);
  }, [layout, round.ticket, isCompleted]);

  const ticketPt = useMemo(() => {
    if (!layout || ticketFrac == null) return null;
    return layout.geo.pointAt(ticketFrac);
  }, [layout, ticketFrac]);

  // ------------------------------------------------------------------
  // Передвижение шарика по дуге платформы
  // ------------------------------------------------------------------
  const [ballFrac, setBallFrac] = useState<number>(0.04);
  const [ballPhase, setBallPhase] = useState<BallPhase>('idle');
  const [landPulse, setLandPulse] = useState(0);

  const ballFracRef = useRef(0.04);
  useEffect(() => { ballFracRef.current = ballFrac; }, [ballFrac]);

  // Сброс при смене раунда
  useEffect(() => {
    setBallFrac(0.04);
    setBallPhase('idle');
  }, [round.id]);

  useEffect(() => {
    if (!layout) return;

    let rafId = 0;

    if (isCompleted && ticketFrac != null) {
      if (reducedMotion) {
        setBallFrac(ticketFrac);
        setBallPhase('parked');
        setLandPulse((p) => p + 1);
        return;
      }

      // Если уже запаркован на нужном билете, повторно не анимируем
      if (ballPhase === 'parked' && Math.abs(ballFracRef.current - ticketFrac) < 0.003) {
        return;
      }

      // Плавное торможение по дуге прямо в выигрышный билет
      const startFrac = ballFracRef.current;
      const targetFrac = ticketFrac;
      const startTime = performance.now();
      const duration = 1050; // ~1 c на финальное скольжение по дуге

      setBallPhase('landing');

      const animateLanding = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // easeOutCubic: естественная инерция скольжения по льду
        const ease = 1 - Math.pow(1 - progress, 3);
        const cur = startFrac + (targetFrac - startFrac) * ease;
        setBallFrac(cur);

        if (progress < 1) {
          rafId = requestAnimationFrame(animateLanding);
        } else {
          setBallFrac(targetFrac);
          setBallPhase('parked');
          setLandPulse((p) => p + 1);
        }
      };

      rafId = requestAnimationFrame(animateLanding);
    } else if (isDrawing) {
      // РОЗЫГРЫШ: шарик динамично скользит по дуге платформы
      // туда и обратно через территории игроков
      setBallPhase('drawing');
      const startTime = performance.now();
      const startFrac = ballFracRef.current;

      const animateDrawing = (now: number) => {
        const elapsed = now - startTime;
        // Синусоидальное скольжение от 0.08 до 0.92 по дуге
        const sweep = 0.5 + 0.42 * Math.sin(elapsed / 260);
        const blend = Math.min(1, elapsed / 280);
        const cur = startFrac * (1 - blend) + sweep * blend;
        setBallFrac(cur);
        rafId = requestAnimationFrame(animateDrawing);
      };

      rafId = requestAnimationFrame(animateDrawing);
    } else if (isLocked) {
      // СТАВКИ ЗАКРЫТЫ: шарик заряжается энергией на старте
      setBallPhase('charging');
      setBallFrac(0.04);
    } else {
      // ОЖИДАНИЕ / СТАВКИ: шарик покоится на стартовой отметке
      setBallPhase('idle');
      setBallFrac(0.04);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isCompleted, isDrawing, isLocked, ticketFrac, layout, reducedMotion, round.id]);

  // Координаты шарика на экране (ровно на дуге платформы)
  const ballPt = useMemo(() => {
    if (!layout) return { x: size.w / 2, y: size.h / 2, angle: 0 };
    return layout.geo.pointAt(ballFrac);
  }, [layout, ballFrac]);

  // Вращение: быстрое в розыгрыше, мягкое в покое
  const spinning = isDrawing || ballPhase === 'landing';
  const spinDur = reducedMotion ? 0 : spinning ? spin.dur : spin.dur * 5 + 3;
  const glowStrong = isLocked || isDrawing || ballPhase === 'landing';
  const bobbing = ballPhase === 'idle' && (round.status === 'WAITING' || isBetting);

  // ------------------------------------------------------------------
  let timerLabel: string;
  switch (round.status) {
    case 'WAITING': timerLabel = t('arena_status_waiting'); break;
    case 'ACCEPTING_BETS': timerLabel = countdown.secondsLeft != null && countdown.secondsLeft > 0
      ? `${t('arena_bets_open')}: ${countdown.secondsLeft}s`
      : t('arena_bets_closed');
      break;
    case 'LOCKED': timerLabel = t('arena_bets_closed'); break;
    case 'DRAWING': timerLabel = t('arena_drawing'); break;
    case 'COMPLETED': timerLabel = t('arena_round_finished'); break;
    default: timerLabel = t('arena_round_cancelled');
  }

  const winnerSeg: PlatformSegment | null = layout
    ? (round.winnerId ? layout.segs.find((s) => s.participant.id === round.winnerId) ?? null : null)
    : null;
  const showTicket = isCompleted && ticketPt != null && ballPhase === 'parked';

  return (
    <div className="w-full relative">
      {/* Фон-визуализатор в стиле Rocket */}
      <div className="absolute inset-0 rounded-[28px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.10] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)] pointer-events-none">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0098ea]/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>

      {/* Статус-пилюля */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(round.status)}`} />
        <span className="text-[9px] font-bold tracking-wider uppercase text-white/70 max-w-[140px] truncate">
          {isBetting ? t('arena_bets_open') : timerLabel}
        </span>
      </div>

      {/* Номер раунда */}
      <div className="absolute top-4 right-4 z-10 flex items-center justify-center bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-[9px] font-bold tracking-wider text-white/70 uppercase">
        #{round.id}
      </div>

      {/* Центр: банк + таймер */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-[54px]">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.16em]">
          {t('arena_bank')}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="font-display text-[38px] leading-none font-black text-white tabular-nums drop-shadow-md">
            {totalPool.toFixed(2)}
          </span>
          <GramIcon className="w-6 h-6 text-brand drop-shadow-[0_0_8px_rgba(0,152,234,0.6)]" />
        </div>
        <div className="mt-1 text-[11px] font-semibold text-white/45">
          {participants.length} {playersWord(participants.length, lang)}
        </div>

        {/* Таймер приёма ставок */}
        {isBetting ? (
          <div className="w-full mt-2.5">
            <div className="text-center text-[12px] font-bold text-[#4fc3ff] tabular-nums">
              {countdown.secondsLeft != null && countdown.secondsLeft > 0
                ? `${countdown.secondsLeft}s`
                : timerLabel}
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full w-full rounded-full bg-gradient-to-r from-[#0098ea] to-[#00b4d8] shadow-[0_0_10px_rgba(0,152,234,0.7)]"
                style={{ transform: `scaleX(${countdown.progress})`, transformOrigin: 'left center', willChange: 'transform' }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-2.5">
            <ArenaStatusChip status={round.status} label={timerLabel} />
          </div>
        )}
      </div>

      {/* ПЛАТФОРМА ВЗЛЁТА: территории игроков + шарик */}
      <div ref={areaRef} className="relative z-10 w-full h-[190px] mt-1.5">
        {layout && (
          <>
            {/* SVG: палуба платформы и территории */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" aria-hidden="true">
              {/* Основа взлётной полосы (тёмная палуба, закруглённые концы) */}
              <path d={layout.geo.d} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={DECK_W + 12} strokeLinecap="round" />
              {/* Осевая светящаяся полоса льда */}
              <path d={layout.geo.d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />

              {empty ? (
                /* Пустая полоса — пунктир */
                <path
                  d={layout.geo.d}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={2}
                  strokeDasharray="10 12"
                  strokeLinecap="round"
                />
              ) : (
                /* Территории: каждый игрок имеет видимый сегмент, не пропадает при больших ставках */
                layout.segs.map((s) => {
                  const isWinner = isCompleted && s.participant.id === round.winnerId;
                  const dimmed = roundFinished && !isWinner;
                  return (
                    <path
                      key={s.participant.id}
                      d={layout.geo.d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={DECK_W - 6}
                      strokeLinecap="round"
                      strokeDasharray={`${s.dashLen} ${layout.geo.total}`}
                      strokeDashoffset={-s.dashStart}
                      opacity={dimmed ? 0.35 : 0.95}
                      style={isWinner ? { filter: `drop-shadow(0 0 10px ${s.color}) drop-shadow(0 0 22px ${s.color}88)` } : undefined}
                    >
                      <title>{`${s.participant.username || s.participant.firstName || 'Player'} — ${s.participant.percentage.toFixed(1)}%`}</title>
                    </path>
                  );
                })
              )}

              {/* Пульсация территории победителя */}
              {isCompleted && winnerSeg && (
                <path
                  d={layout.geo.d}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={DECK_W - 6}
                  strokeLinecap="round"
                  strokeDasharray={`${winnerSeg.dashLen} ${layout.geo.total}`}
                  strokeDashoffset={-winnerSeg.dashStart}
                  opacity={0.15}
                >
                  <animate attributeName="opacity" values="0.05;0.40;0.05" dur="1.5s" repeatCount="indefinite" />
                </path>
              )}
            </svg>

            {/* HTML-слой: метки территорий, имена, проценты и маркеры */}
            {!empty &&
              layout.segs.map((s) => {
                const name = s.participant.username || s.participant.firstName || 'Player';
                const isMe = myUserId != null && s.participant.userId === myUserId;
                const isWinner = isCompleted && s.participant.id === round.winnerId;
                const showPct = s.lenPx >= 18;
                const showCard = s.lenPx >= 75;
                const showMiniAvatar = !showCard && s.lenPx >= 24;
                const side: 'above' | 'below' = s.mid.y > size.h * 0.52 ? 'above' : 'below';
                const lx = Math.max(34, Math.min(size.w - 34, s.mid.x));
                const topY = side === 'above' ? s.mid.y - DECK_W / 2 - 8 : s.mid.y + DECK_W / 2 + 8;
                return (
                  <React.Fragment key={`lbl-${s.participant.id}`}>
                    {/* % прямо на палубе */}
                    {showPct && (
                      <div
                        className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                        style={{ left: s.mid.x, top: s.mid.y, opacity: roundFinished && !isWinner ? 0.5 : 1 }}
                      >
                        <span
                          className={`inline-block rounded-md px-1 py-px text-[9.5px] font-black tabular-nums leading-tight shadow-sm ${
                            isWinner ? 'bg-black/70 text-amber-300 ring-1 ring-amber-400/60' : 'bg-black/50 text-white/95'
                          }`}
                        >
                          {s.participant.percentage >= 1 ? `${s.participant.percentage.toFixed(0)}%` : '<1%'}
                        </span>
                      </div>
                    )}
                    {/* Аватар + имя (если хватает места) */}
                    {showCard && (
                      <div
                        className="absolute z-10 flex flex-col items-center gap-0.5 pointer-events-none"
                        style={{
                          left: lx,
                          top: topY,
                          transform: side === 'above' ? 'translate(-50%,-100%)' : 'translate(-50%,0)',
                          opacity: roundFinished && !isWinner ? 0.45 : 1,
                        }}
                        title={`${name} — ${s.participant.percentage.toFixed(1)}%`}
                      >
                        <div className="flex items-center gap-1">
                          <PlayerAvatar participant={s.participant} className="w-[22px] h-[22px]" />
                          <span className="max-w-[86px] truncate text-[10px] font-bold text-white/85 leading-tight drop-shadow">
                            {name}
                          </span>
                          {isMe && (
                            <span className="px-1 rounded text-[7px] font-extrabold tracking-wider bg-[#0098ea]/30 text-[#9fe0ff] border border-[#0098ea]/50">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Мини-аватар для компактных сегментов */}
                    {showMiniAvatar && (
                      <div
                        className="absolute z-10 flex flex-col items-center pointer-events-none"
                        style={{
                          left: lx,
                          top: topY,
                          transform: side === 'above' ? 'translate(-50%,-100%)' : 'translate(-50%,0)',
                          opacity: roundFinished && !isWinner ? 0.45 : 1,
                        }}
                        title={`${name} — ${s.participant.percentage.toFixed(1)}%`}
                      >
                        <div className="relative">
                          <PlayerAvatar participant={s.participant} className="w-[18px] h-[18px] border" style={{ borderColor: s.color }} />
                          {isMe && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0098ea] border border-white" />
                          )}
                        </div>
                      </div>
                    )}
                    {/* Моя территория — маркер "YOU", если сегмент очень маленький */}
                    {isMe && !showCard && !showMiniAvatar && (
                      <div
                        className="absolute z-10 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#0098ea] shadow-[0_0_8px_rgba(0,152,234,0.9)] pointer-events-none -translate-x-1/2"
                        style={{ left: s.mid.x, top: s.mid.y - DECK_W / 2 - 5 }}
                        title={`${name} — ${s.participant.percentage.toFixed(1)}% (YOU)`}
                      />
                    )}
                  </React.Fragment>
                );
              })}

            {/* Метка выигрышного билета */}
            {showTicket && ticketPt && (
              <div className="absolute z-20 pointer-events-none" style={{ left: ticketPt.x, top: 0 }}>
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute -translate-x-1/2"
                  style={{ top: Math.max(2, ticketPt.y - 26), height: 52, transformOrigin: 'top center' }}
                  title={`${t('arena_fair_ticket')}: ${(round.ticket as number).toFixed(2)}`}
                >
                  <span className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                  <span className="absolute left-1/2 -top-[3px] w-2 h-2 -translate-x-1/2 rotate-45 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                </motion.div>
                {/* Корона победителя */}
                <motion.div
                  initial={{ scale: 0, y: 6 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.15 }}
                  className="absolute -translate-x-1/2 -translate-y-full text-[19px] leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  style={{ top: Math.max(4, ticketPt.y - DECK_W / 2 - 10) }}
                >
                  👑
                </motion.div>
              </div>
            )}

            {/* Вспышка при посадке шарика */}
            <AnimatePresence>
              {landPulse > 0 && ballPhase === 'parked' && ticketPt && (
                <motion.div
                  key={landPulse}
                  initial={{ opacity: 0.85, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="absolute z-10 pointer-events-none w-[76px] h-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: ticketPt.x,
                    top: ticketPt.y,
                    background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.5) 38%, transparent 70%)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* ШАРИК: скользит по дуге платформы */}
            {size.w > 40 && (
              <div
                className="absolute z-20 pointer-events-none will-change-transform"
                style={{
                  left: ballPt.x - BALL_SIZE / 2,
                  top: ballPt.y - BALL_SIZE / 2,
                  width: BALL_SIZE,
                  height: BALL_SIZE,
                  transform: `rotate(${ballPt.angle}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Покачивание на старте */}
                <motion.div
                  animate={bobbing ? { y: [0, -3.5, 0] } : { y: 0 }}
                  transition={bobbing ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }}
                  className="relative w-full h-full"
                >
                  {/* Ледовое свечение вокруг шарика */}
                  <motion.div
                    className="absolute rounded-full"
                    animate={{ scale: [1, 1.25, 1], opacity: glowStrong ? [0.6, 1, 0.6] : [0.35, 0.6, 0.35] }}
                    transition={{ duration: glowStrong ? 0.7 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: BALL_SIZE * 2.2,
                      height: BALL_SIZE * 2.2,
                      left: (BALL_SIZE - BALL_SIZE * 2.2) / 2,
                      top: (BALL_SIZE - BALL_SIZE * 2.2) / 2,
                      background: 'radial-gradient(circle, rgba(79,195,255,0.55) 0%, rgba(0,152,234,0.25) 45%, transparent 70%)',
                    }}
                  />
                  {/* Сфера шарика */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.98) 0%, rgba(190,235,255,0.95) 22%, rgba(0,152,234,0.92) 55%, rgba(6,38,74,0.96) 100%)',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 -5px 10px rgba(0,40,90,0.55), inset 0 3px 6px rgba(255,255,255,0.5)',
                    }}
                  >
                    {/* Вращающиеся ледовые полосы */}
                    {spinDur > 0 && (
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent 0deg 30deg, rgba(255,255,255,0.30) 55deg, transparent 85deg 175deg, rgba(255,255,255,0.22) 205deg, transparent 235deg 360deg)',
                          animation: `arena-ball-spin ${spinDur}s linear infinite`,
                          animationDirection: spin.dir > 0 ? 'normal' : 'reverse',
                        }}
                      />
                    )}
                    {/* Блик сферы */}
                    <span
                      aria-hidden="true"
                      className="absolute rounded-full bg-white/95 blur-[1px]"
                      style={{ width: BALL_SIZE * 0.3, height: BALL_SIZE * 0.2, left: BALL_SIZE * 0.18, top: BALL_SIZE * 0.14 }}
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}

        {/* Пустая арена: слот свободен (CTA внизу поля) */}
        {empty && (
          <button
            onClick={onJoin}
            className="absolute left-1/2 -translate-x-1/2 bottom-[10px] h-[86px] w-[210px] rounded-[20px] border border-dashed border-white/[0.14] bg-black/25 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <span className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.10] flex items-center justify-center">
              <Plus className="w-4 h-4 text-white/40" />
            </span>
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              {t('arena_free_slot')}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4fc3ff]/80">
              <GramIcon className="w-3 h-3" />
              {t('arena_free_slot_hint')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ArenaField;
