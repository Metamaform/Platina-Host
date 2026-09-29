/*
  ArenaField — игровое поле AICE ARENA: «платформа взлёта» в визуальном
  языке Rocket.

  Никаких кружков и донок: по полю идёт единственная стартовая платформа —
  линия взлёта из нижнего левого угла в правый верхний, той же сигнатурой,
  по которой в Rocket летит ракета. Геометрия и деление территорий — в
  arenaPlatform.ts (чистая математика, покрыта тестами).

  Платформа разделена на территории игроков: длина сегмента = доля игрока
  в банке, порядок сегментов совпадает с порядком, в котором сервер обходит
  участников при выборе победителя (pickWinner).

  В центре поля — шарик:
  · WAITING / ACCEPTING_BETS — лежит в центре поля, плавно покачивается
    и медленно вращается;
  · LOCKED — «заряжается»: свечение пульсирует;
  · DRAWING — вращается быстрее, направление вращения рандомное каждый
    раунд (детерминировано от id раунда — все клиенты видят одно и то же);
  · COMPLETED — шарик запускается ИЗ ЦЕНТРА ПОЛЯ и летит в точку розыгрыша,
    садясь ровно на позицию выигрышного билета (provably fair:
    ticket = roll × банк) — чья территория под шариком, тот и забирает
    банк. Территория победителя светится, сверху — корона и янтарная
    метка билета.
*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { GramIcon } from '../GramIcon';
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
// Размер шарика, px.
const BALL_SIZE = 34;
// Длительность запуска шарика из центра в точку розыгрыша, ms
// (раунд завершён на 9s — закладываемся с запасом).
const FLY_MS = 850;

const easeInQuad = (t: number) => t * t;

/**
 * Направление и период вращения шарика для раунда. Детерминировано от id
 * раунда — каждый раунд шарик крутится в случайную сторону/скорость,
 * но все клиенты видят одинаковое вращение (общий источник правды — сервер).
 */
function roundSpin(id: number): { dir: 1 | -1; dur: number } {
  let x = (id ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  const dir: 1 | -1 = x % 2 === 0 ? 1 : -1;
  const dur = 0.9 + ((x % 1000) / 1000) * 1.6; // 0.9–2.5 c на оборот
  return { dir, dur };
}

type BallPhase = 'center' | 'launch' | 'parked';

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

  // Территории: тот же порядок, что обходит сервер в pickWinner,
  // та же мера — вклад в банке. ticketFrac — позиция билета на дуге.
  const ticketFrac = isCompleted && round.ticket != null && layout
    ? ticketToFrac(round.ticket as number, layout.sumC)
    : null;
  const ticketPt = isCompleted && ticketFrac != null && layout
    ? layout.geo.pointAt(ticketFrac)
    : null;

  // ------------------------------------------------------------------
  // Шарик: center (в центре поля) → launch (запуск из центра при
  // COMPLETED) → parked (на позиции выигрышного билета).
  // Позиция запуска/посадки — в px текущей области; при ресайзе
  // «parked» пересчитывается из ticketFrac автоматически.
  // ------------------------------------------------------------------
  const flightRef = useRef({
    phase: 'center' as BallPhase,
    raf: 0,
    start: 0,
    fx: 0, fy: 0, tx: 0, ty: 0,
    dur: 0,
  });
  const [phase, setPhase] = useState<BallPhase>('center');
  const [flyPos, setFlyPos] = useState<{ x: number; y: number } | null>(null);
  const [landPulse, setLandPulse] = useState(0);

  const flyPosRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { flyPosRef.current = flyPos; }, [flyPos]);

  const centerX = size.w / 2;
  const centerY = size.h / 2;
  // В пустой арене шарик парит выше (CTA-кнопка внизу поля).
  const centerPos = empty ? { x: centerX, y: size.h * 0.3 } : { x: centerX, y: centerY };

  // Сброс при новом раунде.
  useEffect(() => {
    const f = flightRef.current;
    cancelAnimationFrame(f.raf);
    f.phase = 'center';
    setPhase('center');
    setFlyPos(null);
  }, [round.id]);

  useEffect(() => {
    const f = flightRef.current;
    cancelAnimationFrame(f.raf);

    const tick = () => {
      const el = Math.max(0, performance.now() - f.start);
      const k = Math.min(1, el / f.dur);
      const e = easeInQuad(k);
      setFlyPos({ x: f.fx + (f.tx - f.fx) * e, y: f.fy + (f.ty - f.fy) * e });
      if (k < 1) {
        f.raf = requestAnimationFrame(tick);
      } else {
        f.phase = 'parked';
        setPhase('parked');
        setFlyPos(null);
        setLandPulse((n) => n + 1);
      }
    };

    const beginFlight = (fx: number, fy: number, tx: number, ty: number, dur: number) => {
      f.fx = fx; f.fy = fy; f.tx = tx; f.ty = ty; f.dur = Math.max(1, dur);
      f.phase = 'launch';
      setPhase('launch');
      f.start = performance.now();
      f.raf = requestAnimationFrame(tick);
    };

    const park = () => {
      f.phase = 'parked';
      setPhase('parked');
      setFlyPos(null);
      setLandPulse((n) => n + 1);
    };

    if (isCompleted && ticketPt != null) {
      if (f.phase === 'center') {
        if (reducedMotion) {
          park(); // без анимации — сразу в точке розыгрыша
        } else {
          // Запуск ИЗ ЦЕНТРА ПОЛЯ в точку розыгрыша
          beginFlight(centerPos.x, centerPos.y, ticketPt.x, ticketPt.y, FLY_MS);
        }
      } else if (f.phase === 'launch') {
        // Эффект мог перезапуститься (StrictMode) — продолжаем из текущей точки.
        const cur = flyPosRef.current ?? { x: centerPos.x, y: centerPos.y };
        const dist = Math.hypot(ticketPt.x - cur.x, ticketPt.y - cur.y);
        if (dist > 2) {
          beginFlight(cur.x, cur.y, ticketPt.x, ticketPt.y, Math.max(120, (dist / 260) * FLY_MS));
        } else {
          park();
        }
      }
    } else if (round.status === 'CANCELLED' || round.status === 'ERROR') {
      // Отмена: нет точки розыгрыша — шарик возвращается в центр поля.
      if (f.phase !== 'center') {
        f.phase = 'center';
        setPhase('center');
        setFlyPos(null);
      }
    }

    return () => cancelAnimationFrame(f.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted, ticketFrac, round.id, round.status, reducedMotion, size.w, size.h]);

  // Текущая позиция шарика.
  const ballPos = phase === 'launch'
    ? (flyPos ?? centerPos)
    : phase === 'parked' && ticketPt
      ? ticketPt
      : centerPos;

  // Вращение: быстрое — в розыгрыше и в полёте, медленное — в покое.
  // Направление рандомное каждый раунд (см. roundSpin).
  const spinning = isDrawing || phase === 'launch';
  const spinDur = reducedMotion ? 0 : spinning ? spin.dur : spin.dur * 6 + 4;
  const glowStrong = isLocked || isDrawing || phase === 'launch';
  const bobbing = phase === 'center' && (round.status === 'WAITING' || isBetting);

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
  const showTicket = isCompleted && ticketPt != null;

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

      {/* ПЛАТФОРМА ВЗЛЁТА: территории игроков + шарик */}
      <div ref={areaRef} className="relative z-10 w-full h-[190px] mt-1.5">
        {layout && (
          <>
            {/* SVG: палуба платформы и территории */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" aria-hidden="true">
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
            </svg>

            {/* HTML-слой: метки территорий и YOU */}
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

            {/* ШАРИК: в центре поля → вращается (рандомная сторона) →
                запускается из центра и садится на позицию билета */}
            {size.w > 40 && (
              <div
                className="absolute z-20 pointer-events-none will-change-transform"
                style={{
                  left: ballPos.x - BALL_SIZE / 2,
                  top: ballPos.y - BALL_SIZE / 2,
                  width: BALL_SIZE,
                  height: BALL_SIZE,
                }}
              >
                {/* Покачивание в покое */}
                <motion.div
                  animate={bobbing ? { y: [0, -4, 0] } : { y: 0 }}
                  transition={bobbing ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                  className="relative w-full h-full"
                >
                  {/* Свечение под шариком */}
                  <motion.div
                    className="absolute rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: glowStrong ? [0.55, 1, 0.55] : [0.3, 0.55, 0.3] }}
                    transition={{ duration: glowStrong ? 0.8 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: BALL_SIZE * 2.3,
                      height: BALL_SIZE * 2.3,
                      left: (BALL_SIZE - BALL_SIZE * 2.3) / 2,
                      top: (BALL_SIZE - BALL_SIZE * 2.3) / 2,
                      background: 'radial-gradient(circle, rgba(79,195,255,0.5) 0%, rgba(0,152,234,0.22) 42%, transparent 70%)',
                    }}
                  />
                  {/* Сфера */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.98) 0%, rgba(190,235,255,0.95) 22%, rgba(0,152,234,0.9) 55%, rgba(6,38,74,0.95) 100%)',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 -5px 10px rgba(0,40,90,0.55), inset 0 3px 6px rgba(255,255,255,0.5)',
                    }}
                  >
                    {/* Вращающиеся «полосы» — видно, как крутится шарик.
                        Направление/скорость — рандомные каждый раунд. */}
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
                    {/* Блик (не вращается) */}
                    <span
                      aria-hidden="true"
                      className="absolute rounded-full bg-white/90 blur-[1.5px]"
                      style={{ width: BALL_SIZE * 0.3, height: BALL_SIZE * 0.2, left: BALL_SIZE * 0.18, top: BALL_SIZE * 0.14 }}
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}

        {/* Пустая арена: слот свободен (CTA внизу поля, шарик парит сверху) */}
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
