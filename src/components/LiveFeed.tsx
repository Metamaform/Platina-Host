import React, { useState, useEffect, useRef } from 'react';
import { GramIcon } from './GramIcon';
import { getNftBackdrop } from '../lib/nftUtils';

interface RealDrop {
  id: string;
  ts: string;
  firstName: string;
  gift?: { id?: string; name: string; image_url?: string; slug?: string; isGram?: boolean; backdrop?: string; rarity?: string };
  price: number;
  isGram?: boolean;
}

const POLL_MS = 4000;
const CACHE_KEY = 'platina_live_drops';

/**
 * Lightweight LiveFeed — no framer-motion, no lottie, no backdrop-blur.
 * Uses CSS animations and plain img tags for 60fps on weak devices.
 */
export const LiveFeed: React.FC = () => {
  const [drops, setDrops] = useState<RealDrop[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as RealDrop[];
        setDrops(parsed.filter(d => !d.isGram && d.gift && !d.gift.isGram).slice(0, 14));
      }
    } catch (e) {}

    let cancelled = false;

    const poll = () => {
      fetch('/api/opens/recent?limit=20')
        .then((res) => res.json())
        .then((data: RealDrop[]) => {
          if (!cancelled) {
            setDrops((prev) => {
              const nftData = data.filter(d => !d.isGram && d.gift && !d.gift.isGram);
              const seenIds = new Set<string>();
              const unique: RealDrop[] = [];
              for (const item of [...nftData, ...prev]) {
                if (seenIds.has(item.id)) continue;
                seenIds.add(item.id);
                unique.push(item);
                if (unique.length >= 14) break;
              }
              unique.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
              const final = unique.slice(0, 14);
              try { localStorage.setItem(CACHE_KEY, JSON.stringify(final)); } catch (e) {}
              return final;
            });
            setLoaded(true);
          }
        })
        .catch(() => { if (!cancelled) setLoaded(true); });
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loaded && drops.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-2 mb-4">
      <h3 className="px-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white font-black text-[13px] tracking-wide uppercase">Live drops</span>
      </h3>
      <div className="flex flex-row gap-1.5 h-[46px] relative overflow-hidden px-1 w-full items-center gpu-layer">
        {drops.map((drop, i) => {
          const backdrop = getNftBackdrop(drop.gift);
          const isOnyx = backdrop === 'Onyx Black';
          const isBlack = backdrop === 'Black';
          return (
            <div
              key={drop.id}
              className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center relative animate-card-in ${
                isBlack
                  ? 'bg-[#222] border-white/10'
                  : isOnyx
                    ? 'bg-[#2a2620] border-amber-900/30'
                    : 'bg-white/5 border-white/5'
              }`}
              title={`${drop.firstName} — ${drop.isGram ? (drop.price || 0) + ' GRAM' : drop.gift?.name}`}
              style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}
            >
              {drop.isGram ? (
                <div className="w-7 h-7 flex items-center justify-center">
                  <GramIcon className="w-full h-full text-[#0098EA]" />
                </div>
              ) : drop.gift?.image_url ? (
                <img
                  src={drop.gift.image_url}
                  alt={drop.gift.name || ""}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
