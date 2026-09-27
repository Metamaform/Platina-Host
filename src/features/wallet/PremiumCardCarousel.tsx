import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

type PremiumCardType = 'PLATINUM' | 'BLACK';

interface PremiumCardData {
  type: PremiumCardType;
  balance: string;
  changePercent: number;
  changeFiat: string;
  networkLabel: string;
}

const cards: PremiumCardData[] = [
  {
    type: 'PLATINUM',
    balance: '$9,999.99',
    changePercent: 21,
    changeFiat: '$703.15',
    networkLabel: 'Multichain',
  },
  {
    type: 'BLACK',
    balance: '$9,999.99',
    changePercent: 21,
    changeFiat: '$703.15',
    networkLabel: 'Multichain',
  },
];

function WavePatternPlatinum() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 250" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="platinumWaveGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Thin wavy lines */}
      <g fill="none" stroke="black" strokeWidth="0.8" opacity="0.9">
        {Array.from({ length: 24 }).map((_, i) => {
          const offset = i * 6;
          return (
            <path
              key={i}
              d={`M -50 ${40 + offset} C 80 ${10 + offset}, 150 ${90 + offset}, 280 ${30 + offset} S 420 ${70 + offset}, 500 ${20 + offset}`}
            />
          );
        })}
      </g>
      {/* Second layer of waves bottom left */}
      <g fill="none" stroke="black" strokeWidth="0.6" opacity="0.7">
        {Array.from({ length: 18 }).map((_, i) => {
          const offset = i * 5;
          return (
            <path
              key={`b-${i}`}
              d={`M -80 ${160 + offset} C 40 ${120 + offset}, 120 ${200 + offset}, 220 ${140 + offset}`}
            />
          );
        })}
      </g>
    </svg>
  );
}

function GlowBlack() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]" aria-hidden="true">
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/[0.12] rounded-full blur-[50px]" />
      <div className="absolute top-0 right-20 w-40 h-40 bg-white/[0.08] rounded-full blur-[30px]" />
    </div>
  );
}

export function PremiumCardCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const idx = Math.round(scrollLeft / (clientWidth * 0.85));
    if (idx !== activeIdx && idx >= 0 && idx < cards.length) {
      setActiveIdx(idx);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-display text-[18px] font-bold text-white tracking-tight">Мои карты</h2>
        <div className="flex items-center gap-1.5" aria-label="Пагинация карт" role="tablist">
          {cards.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={activeIdx === i}
              aria-label={`Карта ${i + 1}`}
              onClick={() => {
                setActiveIdx(i);
                if (scrollRef.current) {
                  const cardWidth = scrollRef.current.clientWidth * 0.85;
                  scrollRef.current.scrollTo({ left: i * (cardWidth + 16), behavior: 'smooth' });
                }
              }}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                activeIdx === i ? 'w-5 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cards.map((card) => {
          const isPlatinum = card.type === 'PLATINUM';
          return (
            <div
              key={card.type}
              className={`relative shrink-0 snap-start w-[85%] md:w-[calc(50%-8px)] min-h-[200px] rounded-[32px] border overflow-hidden select-none transition-transform duration-200 ${
                isPlatinum
                  ? 'bg-[#303136] border-[#8a8d93]/40 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'bg-[#070708] border-white/15 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]'
              }`}
            >
              {/* Background effects */}
              {isPlatinum ? <WavePatternPlatinum /> : <GlowBlack />}

              {/* Sheen for platinum */}
              {isPlatinum && (
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(115deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_25%,transparent_45%)]" />
              )}

              {/* Content */}
              <div className="relative z-10 p-5 flex flex-col h-full min-h-[200px]">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <span className="font-display text-white/90 text-[20px] font-bold tracking-tight">Platina</span>
                  <span
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-wider ${
                      isPlatinum
                        ? 'bg-white/10 border-white/20 text-white/80'
                        : 'bg-white/[0.06] border-white/15 text-white/60'
                    }`}
                  >
                    {card.type}
                  </span>
                </div>

                {/* Balance */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="font-display font-bold text-white text-[32px] md:text-[36px] leading-none tracking-tight drop-shadow-sm">
                    {card.balance}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.08] w-fit">
                    <span className="text-white/70 text-[13px] font-semibold">↑ {card.changePercent}% · {card.changeFiat}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6">
                  <span className="text-white/60 text-[14px] font-medium tracking-wide">{card.networkLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
