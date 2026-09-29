import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { PremiumImage } from './PremiumImage';
import { GramIcon } from './GramIcon';
import { cleanNftName, getNftBackdrop } from '../lib/nftUtils';
import { useTranslation } from '../lib/i18n';

interface NftSelectorGridProps {
  inventory: any[];
  selectedIds: string[];
  onSelect: (item: any) => void;
  maxBetGram?: number;
  maxSelections?: number;
  maxContainerHeight?: string;
  disabled?: boolean;
  emptyText?: string;
}

export function NftSelectorGrid({
  inventory,
  selectedIds,
  onSelect,
  maxBetGram = 2500,
  maxSelections,
  maxContainerHeight = 'max-h-[340px]',
  disabled = false,
  emptyText
}: NftSelectorGridProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [backdropFilter, setBackdropFilter] = useState<'black' | 'onyx' | null>(null);

  const availableInventory = useMemo(() => {
    return (inventory || []).filter(i => !i.isWithdrawing);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return availableInventory
      .filter(item => {
        if (!item || !item.name) return false;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const bd = getNftBackdrop(item);
        const matchesBackdrop = !backdropFilter || 
          (backdropFilter === 'black' && bd === 'Black') || 
          (backdropFilter === 'onyx' && bd === 'Onyx Black');
        return matchesSearch && matchesBackdrop;
      })
      .sort((a, b) => {
        const pA = Number(a.floor_price_gram || a.price || 0);
        const pB = Number(b.floor_price_gram || b.price || 0);
        return sortOrder === 'desc' ? pB - pA : pA - pB;
      });
  }, [availableInventory, searchQuery, backdropFilter, sortOrder]);

  return (
    <div className="w-full flex flex-col">
      {/* Search and Filters Header (Upgrade Style) */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input 
            type="text" 
            placeholder={t('search_item')} 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="w-full bg-[#1a1b1f] border border-white/5 rounded-[12px] py-2 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-white/20 transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => setBackdropFilter(prev => prev === 'black' ? null : 'black')}
          disabled={disabled}
          className={`py-2 px-2.5 rounded-[12px] text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            backdropFilter === 'black'
              ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/40 text-white shadow-md ring-1 ring-white/20'
              : 'bg-[#1a1b1f] border-white/5 text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title={t('filter_black')}
        >
          <span className="w-2 h-2 rounded-full bg-black border border-white/30 inline-block shrink-0" />
          <span>Black</span>
        </button>
        <button
          type="button"
          onClick={() => setBackdropFilter(prev => prev === 'onyx' ? null : 'onyx')}
          disabled={disabled}
          className={`py-2 px-2.5 rounded-[12px] text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            backdropFilter === 'onyx'
              ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/40 text-white shadow-md ring-1 ring-white/20'
              : 'bg-[#1a1b1f] border-white/5 text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title={t('filter_onyx')}
        >
          <span className="w-2 h-2 rounded-full bg-[#393d3f] border border-white/30 inline-block shrink-0" />
          <span>Onyx</span>
        </button>
        <button 
          type="button"
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          disabled={disabled}
          className="bg-[#1a1b1f] border border-white/5 rounded-[12px] px-3 py-2 text-[12px] font-medium text-white flex items-center gap-1 shrink-0 cursor-pointer hover:bg-white/5 transition-colors"
        >
          {t('price')} {sortOrder === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Grid of NFTs */}
      <div className={`overflow-y-auto no-scrollbar pr-0.5 ${maxContainerHeight}`}>
        {filteredInventory.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-[13px] font-medium">
            {emptyText || t('no_available_items')}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 pb-2">
            {filteredInventory.map((item, idx) => {
              const uid = item.uniqueId || `${item.id || 'item'}-${idx}`;
              const isSelected = selectedIds.includes(item.uniqueId || item.id);
              const itemBackdrop = getNftBackdrop(item);
              const isOnyx = itemBackdrop === 'Onyx Black';
              const isBlack = itemBackdrop === 'Black';
              const price = Number(item.floor_price_gram || item.price || 0);
              const exceedsMaxBet = price > maxBetGram;

              return (
                <button
                  key={uid}
                  type="button"
                  disabled={disabled || exceedsMaxBet}
                  onClick={() => onSelect(item)}
                  className={`relative overflow-hidden w-full aspect-[3/4] rounded-[16px] border flex flex-col items-center p-2 transition-all cursor-pointer select-none ${
                    isSelected 
                      ? 'border-brand bg-[#fbc740]/10 scale-95 shadow-[0_4px_15px_rgba(251,199,64,0.15)]' 
                      : isBlack 
                        ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/10 hover:border-white/20' 
                        : isOnyx 
                          ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/10 hover:border-white/20' 
                          : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                  } ${exceedsMaxBet ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                >
                  {(isOnyx || isBlack) && (
                    <span className={`absolute top-1.5 left-0 right-0 z-20 text-[9px] font-bold uppercase tracking-widest text-center ${
                      isOnyx ? 'text-zinc-300' : 'text-zinc-400'
                    }`}>
                      {isOnyx ? 'Onyx Black' : 'Black'}
                    </span>
                  )}
                  <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1">
                    <PremiumImage 
                      staticMode 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-[52%] h-[52%] object-contain drop-shadow-md" 
                    />
                  </div>
                  <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0">
                    <span className="text-[10px] text-white/90 truncate w-[95%] text-center leading-none mb-1">
                      {cleanNftName(item.name)}
                    </span>
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span className="text-[12px] font-bold text-white flex items-center gap-1">
                        {price.toFixed(2)} <GramIcon className="w-3 h-3" />
                      </span>
                      {exceedsMaxBet && (
                        <span className="text-[8px] font-bold text-red-400 bg-red-500/20 px-1 py-0.5 rounded border border-red-500/30 whitespace-nowrap">
                          &gt;2500
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
