/*
  ArenaField — игровое поле AICE ARENA: «платформа взлёта» в визуальном
  языке Rocket.

  Никаких кружков и донок: по полю идёт единственная стартовая платформа —
  линия взлёта из нижнего левого угла в правый верхний, той же сигнатурой,
  по которой в Rocket летит ракета. Геометрия и деление территорий — в
  arenaPlatform.ts (чистая математика, покрыта тестами).

  Платформа разделена на территории игроков: длина сегмента = доля игрока
  в банке, порядок сегментов совпадает с порядком, в котором сервер обходит
  участников при выборе победителя (pickWinner). Победа читается буквально:
  ракета взлетает со старта и садится ровно на позицию выигрышного билета
  (provably fair: ticket = roll × банк) — чья территория под ракетой,
  тот и забирает банк.

  Жизненный цикл раунда на платформе:
  · WAITING / ACCEPTING_BETS — ракета ждёт на старте полосы;
  · LOCKED — «старт»: ракета подрагивает, выхлоп пульсирует;
  · DRAWING — взлёт: ракета летит по платформе, позади тянется световой след;
  · COMPLETED — ракета тормозит и садится на позиции билета, территория
    победителя светится, сверху — корона и янтарная метка билета.
*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { GramIcon } from '../GramIcon';
import { CleanModelLottie } from '../CleanModelLottie';
import type { ArenaRoundState } from '../../lib/arenaShared';
import { playersWord } from '../../lib/arenaShared';
import { ArenaAvatar, ArenaStatusChip } from './arenaUi';
import type { ArenaCountdown } from './useArenaCountdown';
import {
  buildPlatformLayout,
  ticketToFrac,
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
// Размер ракеты, px.
const ROCKET_SIZE = 46;
// Доля длины платформы, куда ракета разгоняется в DRAWING (билет ещё не опубликован).
const LAUNCH_FAR_FRAC = 0.965;
// Длительность взлёта, ms (сервер держит DRAWING ~2.6s — укладываемся с запасом).
const LAUNCH_MS = 2000;
const LAND_MS = 650;

const easeInQuad = (t: number) => t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

type FlightPhase = 'idle' | 'launch' | 'land' | 'parked';

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

  // Территории: тот же порядок, что обходит сервер в pickWinner,
  // та же мера — вклад в банке. ticketFrac — позиция билета на дуге.
  const ticketFrac = isCompleted && round.ticket != null && layout
    ? ticketToFrac(round.ticket as number, layout.sumC)
    : null;

  // ------------------------------------------------------------------
  // Ракета: idle (на старте) → launch (DRAWING) → land (COMPLETED) → parked.
  // Позиция хранится долей длины дуги — при ресайзе всё пересчитывается.
  // ------------------------------------------------------------------
  const flightRef = useRef({
    phase: 'idle' as FlightPhase,
    raf: 0,
    start: 0,
    from: 0,
    to: 0,
    dur: 0,
    backward: false,
  });
  const [flightFrac, setFlightFrac] = useState(0);
  const [phase, setPhase] = useState<FlightPhase>('idle');
  const [landPulse, setLandPulse] = useState(0);

  // Актуальная доля для старта фазы «land» (без добавления в зависимости).
  const flightFracRef = useRef(0);
  useEffect(() => { flightFracRef.current = flightFrac; }, [flightFrac]);

  // Сброс при новом раунде.
  useEffect(() => {
    const f = flightRef.current;
    cancelAnimationFrame(f.raf);
    f.phase = 'idle';
    f.from = 0; f.to = 0; f.dur = 0;
    setPhase('idle');
    setFlightFrac(0);
  }, [round.id]);

  useEffect(() => {
    const f = flightRef.current;
    cancelAnimationFrame(f.raf);

    const tick = () => {
      const el = Math.max(0, performance.now() - f.start);
      const k = Math.min(1, el / f.dur);
      const eased = f.backward ? easeInOutQuad(k) : (f.phase === 'launch' ? easeInQuad(k) : easeOutCubic(k));
      setFlightFrac(f.from + (f.to - f.from) * eased);
      if (k < 1) {
        f.raf = requestAnimationFrame(tick);
      } else {
        setFlightFrac(f.to);
        f.phase = 'parked';
        setPhase('parked');
        setLandPulse((n) => n + 1);
      }
    };

    const begin = (from: number, to: number, dur: number, backward: boolean, next: FlightPhase) => {
      f.from = from; f.to = to; f.dur = Math.max(1, dur); f.backward = backward;
      f.phase = next;
      setPhase(next);
      f.raf = requestAnimationFrame(tick);
    };

    if (isDrawing) {
      if (reducedMotion) {
        // reduced-motion: ракета остаётся на старте, пока сервер думает
      } else if (f.phase === 'idle') {
        begin(0, LAUNCH_FAR_FRAC, LAUNCH_MS, false, 'launch');
      } else if (f.phase === 'launch') {
        // Эффект мог пережить повторный запуск (StrictMode) — продолжаем
        // полёт с текущей позиции, а не с нуля.
        const cur = Math.max(0, Math.min(LAUNCH_FAR_FRAC, flightFracRef.current));
        const remaining = LAUNCH_FAR_FRAC - cur;
        if (remaining > 0.01) {
          // easeInQuad: время ∝ √остатка
          begin(cur, LAUNCH_FAR_FRAC, Math.max(120, LAUNCH_MS * Math.sqrt(remaining / LAUNCH_FAR_FRAC)), false, 'launch');
        }
      }
    } else if (isCompleted && ticketFrac != null) {
      if (f.phase === 'launch' || f.phase === 'land') {
        // Ракета уже в полёте — тормозим и садимся на позиции билета.
        const cur = Math.max(0, Math.min(1, flightFracRef.current));
        const remaining = Math.abs(ticketFrac - cur);
        if (remaining > 0.004) {
          begin(cur, ticketFrac, Math.max(140, Math.min(LAND_MS * 1.4, remaining * 900)), ticketFrac < cur - 0.002, 'land');
        } else {
          f.phase = 'parked';
          setPhase('parked');
          setFlightFrac(ticketFrac);
          setLandPulse((n) => n + 1);
        }
      } else if (f.phase === 'idle') {
        // Подключились уже после определения победителя — сразу на месте.
        f.phase = 'parked';
        setPhase('parked');
        setFlightFrac(ticketFrac);
        setLandPulse((n) => n + 1);
      }
    } else if (round.status === 'CANCELLED' || round.status === 'ERROR') {
      // Отмена: ракета не взлетает (нет билета) — тихо возвращаем на старт.
      f.phase = 'idle';
      setPhase('idle');
      setFlightFrac(0);
    }

    return () => cancelAnimationFrame(f.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawing, isCompleted, ticketFrac, round.id, round.status, reducedMotion]);

  const rocketFrac = phase === 'idle' ? 0 : flightFrac;
  const rocket = layout ? layout.geo.pointAt(rocketFrac) : null;

  // След за ракетой (только когда ракета ушла с места).
  const trailLen = (phase === 'launch' || phase === 'land' || phase === 'parked')
    ? flightFrac * (layout?.geo.total || 0)
    : 0;

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
  const showTicket = isCompleted && ticketFrac != null && layout != null;
  const ticketPt = showTicket ? layout.geo.pointAt(ticketFrac!) : null;
  const empty = participants.length === 0;

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

      {/* Статус-пилюля (короткая, секунды — в центре поля) */}
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

        {/* Таймер приёма ставок — полоса, без крутящегося круга */}
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

      {/* ПЛАТФОРМА ВЗЛЁТА: территории игроков + ракета */}
      <div ref={areaRef} className="relative z-10 w-full h-[190px] mt-1.5">
        {layout && (
          <>
            {/* SVG: палуба платформы, территории, след */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="arenaTrailGrad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="45%" stopColor="rgba(125,211,252,0.7)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.95)" />
                </linearGradient>
                <filter id="arenaTrailBlur" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
              </defs>

              {/* Основа взлётной полосы (тёмная палуба, закруглённые концы) */}
              <path d={layout.geo.d} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={DECK_W + 12} strokeLinecap="round" />
              {/* Осевая «россыпь огней» — видна в зазорах между территориями */}
              <path d={layout.geo.d} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1.5} />

              {empty ? (
                /* Пустая полоса — пунктир, слот свободен */
                <path
                  d={layout.geo.d}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={2}
                  strokeDasharray="10 12"
                  strokeLinecap="round"
                />
              ) : (
                /* Территории: strokeDasharray по длине дуги = честная доля банка */
                layout.segs.map((s) => {
                  if (s.dashLen <= 0.5) return null;
                  const isWinner = isCompleted && s.participant.id === round.winnerId;
                  const dimmed = roundFinished && !isWinner;
                  return (
                    <path
                      key={s.participant.id}
                      d={layout.geo.d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={DECK_W - 6}
                      strokeLinecap="butt"
                      strokeDasharray={`${s.dashLen} ${layout.geo.total}`}
                      strokeDashoffset={-s.dashStart}
                      opacity={dimmed ? 0.32 : 0.95}
                      style={isWinner ? { filter: `drop-shadow(0 0 10px ${s.color}) drop-shadow(0 0 22px ${s.color}66)` } : undefined}
                    >
                      <title>{`${s.participant.username || s.participant.firstName || 'Player'} — ${s.participant.percentage.toFixed(1)}%`}</title>
                    </path>
                  );
                })
              )}

              {/* Периодическая пульсация территории победителя */}
              {isCompleted && winnerSeg && (
                <path
                  d={layout.geo.d}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={DECK_W - 6}
                  strokeLinecap="butt"
                  strokeDasharray={`${winnerSeg.dashLen} ${layout.geo.total}`}
                  strokeDashoffset={-winnerSeg.dashStart}
                  opacity={0.12}
                >
                  <animate attributeName="opacity" values="0.05;0.35;0.05" dur="1.6s" repeatCount="indefinite" />
                </path>
              )}

              {/* Световой след за ракетой */}
              {trailLen > 4 && (
                <>
                  <path
                    d={layout.geo.d}
                    fill="none"
                    stroke="url(#arenaTrailGrad)"
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${trailLen} ${layout.geo.total}`}
                    filter="url(#arenaTrailBlur)"
                    opacity={0.5}
                  />
                  <path
                    d={layout.geo.d}
                    fill="none"
                    stroke="url(#arenaTrailGrad)"
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    strokeDasharray={`${trailLen} ${layout.geo.total}`}
                  />
                </>
              )}
            </svg>

            {/* HTML-слой: метки территорий, YOU, корона, метка билета, ракета */}
            {!empty &&
              layout.segs.map((s) => {
                const name = s.participant.username || s.participant.firstName || 'Player';
                const isMe = myUserId != null && s.participant.userId === myUserId;
                const isWinner = isCompleted && s.participant.id === round.winnerId;
                const showPct = s.lenPx >= 26;
                const showCard = s.lenPx >= 90;
                // Подпись ставим с той стороны палубы, где больше места:
                // на нижней половине кривой — сверху, на верхней — снизу.
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
                          className={`inline-block rounded-md px-1 py-px text-[10px] font-black tabular-nums leading-tight ${
                            isWinner ? 'bg-black/55 text-amber-300' : 'bg-black/40 text-white/90'
                          }`}
                        >
                          {s.participant.percentage.toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {/* Аватар + имя (если на сегменте хватает места) */}
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
                          <ArenaAvatar participant={s.participant} className="w-[22px] h-[22px]" />
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
                    {/* Моя территория — маркер, если сегмент мал для карточки */}
                    {isMe && !showCard && showPct && (
                      <div
                        className="absolute z-10 w-2 h-2 rounded-full border-2 border-white bg-[#0098ea] shadow-[0_0_8px_rgba(0,152,234,0.9)] pointer-events-none -translate-x-1/2"
                        style={{ left: s.mid.x, top: s.mid.y - DECK_W / 2 - 5 }}
                        title={`${name} — ${s.participant.percentage.toFixed(1)}% (YOU)`}
                      />
                    )}
                  </React.Fragment>
                );
              })}

            {/* Метка выигрышного билета (provably fair: билет / банк) */}
            {ticketPt && (
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

            {/* Вспышка посадки */}
            <AnimatePresence>
              {landPulse > 0 && phase === 'parked' && ticketPt && (
                <motion.div
                  key={landPulse}
                  initial={{ opacity: 0.85, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 1.9 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="absolute z-10 pointer-events-none w-[74px] h-[74px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: ticketPt.x,
                    top: ticketPt.y,
                    background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(251,191,36,0.45) 38%, transparent 70%)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Ракета: ждёт на старте → взлетает → садится на билет */}
            {rocket && (
              <div
                className="absolute z-20 pointer-events-none will-change-transform"
                style={{
                  left: rocket.x - ROCKET_SIZE / 2,
                  top: rocket.y - ROCKET_SIZE / 2,
                  width: ROCKET_SIZE,
                  height: ROCKET_SIZE,
                }}
              >
                <motion.div
                  animate={
                    phase === 'idle' && isLocked
                      ? { rotate: 45, x: [0, 1.2, -1.2, 0] }
                      : phase === 'idle'
                        ? { rotate: 45 }
                        : { rotate: rocket.angle + 45 }
                  }
                  transition={
                    phase === 'idle' && isLocked
                      ? { rotate: { duration: 0.2 }, x: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } }
                      : { duration: 0.1, ease: 'linear' }
                  }
                  className="w-full h-full"
                >
                  <CleanModelLottie
                    lottieUrl="/stellarrocket-1-nobg.lottie.json"
                    loop
                    className={`w-full h-full drop-shadow-[0_4px_20px_rgba(79,195,255,0.35)] ${
                      phase === 'idle' && (round.status === 'WAITING' || isBetting) ? 'opacity-90' : ''
                    }`}
                  />
                </motion.div>
                {/* Выхлоп: рычит на LOCKED, горит в полёте (сзади по вектору движения) */}
                {(isLocked || phase === 'launch' || phase === 'land') && (
                  <motion.div
                    className="absolute rounded-full"
                    animate={{ scale: [1, 1.45, 1], opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: phase === 'launch' ? 0.22 : 0.9, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 16,
                      height: 16,
                      left: (ROCKET_SIZE - 16) / 2,
                      top: (ROCKET_SIZE - 16) / 2,
                      background: 'radial-gradient(circle, rgba(255,196,87,0.95) 0%, rgba(255,122,26,0.55) 45%, transparent 72%)',
                      transform: phase === 'idle'
                        ? `rotate(-45deg) translateX(-${ROCKET_SIZE * 0.56}px)`
                        : `rotate(${rocket.angle}deg) translateX(-${ROCKET_SIZE * 0.56}px)`,
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Пустая арена: слот свободен (CTA поверх пунктирной полосы) */}
        {empty && (
          <button
            onClick={onJoin}
            className="absolute inset-0 m-auto h-[104px] w-[210px] rounded-[20px] border border-dashed border-white/[0.14] bg-black/25 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 active:scale-[0.99] transition-transform cursor-pointer"
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
