import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PremiumImage } from './PremiumImage';
import { GramIcon } from './GramIcon';

interface RealDrop {
  id: string;
  ts: string;
  firstName: string;
  gift?: { name: string; image_url?: string; slug?: string; isGram?: boolean };
  price: number;
  isGram?: boolean;
}

const POLL_MS = 3000;
const CACHE_KEY = 'platina_live_drops';

export const LiveFeed: React.FC = () => {
  const [drops, setDrops] = useState<RealDrop[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Восстанавливаем из кэша при старте
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as RealDrop[];
        setDrops(parsed.filter(d => !d.isGram && d.gift && !d.gift.isGram));
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
              const prevNft = prev.filter(d => !d.isGram && d.gift && !d.gift.isGram);
              const all = [...nftData, ...prevNft];
              // Deduplicate by ID and by player + gift + price within 8-second window
              const seenIds = new Set<string>();
              const seenSignatures = new Set<string>();
              const unique: RealDrop[] = [];

              for (const item of all) {
                if (seenIds.has(item.id)) continue;
                seenIds.add(item.id);

                const timeBucket = Math.floor(new Date(item.ts).getTime() / 8000);
                const giftName = item.gift?.name || 'unknown';
                const signature = `${item.firstName}_${giftName}_${Number(item.price || 0).toFixed(2)}_${timeBucket}`;

                if (seenSignatures.has(signature)) continue;
                seenSignatures.add(signature);

                unique.push(item);
              }

              // Сортируем по времени (новые первыми)
              unique.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
              const final = unique.slice(0, 20);
              
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(final));
              } catch (e) {}
              return final;
            });
            setLoaded(true);
          }
        })
        .catch(() => {
          if (!cancelled) setLoaded(true);
        });
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loaded && drops.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-2 mb-6">
      <h3 className="text-white/50 text-[10px] font-bold uppercase tracking-widest px-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live Drops
      </h3>
      <div className="flex flex-row gap-2 h-[50px] relative overflow-hidden px-1 w-full items-center">
        <AnimatePresence>
          {drops.map((drop, i) => (
            <motion.div
              key={drop.id}
              initial={{ opacity: 0, x: -20, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.4 }}
              className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-tr from-white/5 to-white/10 shrink-0 border border-white/5 shadow-lg flex items-center justify-center relative"
              title={`${drop.firstName} — ${drop.isGram ? (drop.price || 0) + ' GRAM' : drop.gift?.name}`}
            >
              {drop.isGram ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <GramIcon className="w-full h-full text-[#0098EA]" />
                </div>
              ) : (
                <PremiumImage 
                  delayMs={i * 800} 
                  src={drop.gift?.image_url} 
                  alt={drop.gift?.name || ""} 
                  className={drop.gift?.isGram ? "w-8 h-8" : "w-full h-full"} 
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
