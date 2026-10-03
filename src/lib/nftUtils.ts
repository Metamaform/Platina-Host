export const cleanNftName = (name?: string): string => {
  if (!name) return '';
  return name
    .replace(/\s*\((Onyx Black|Black)\)/gi, '')
    .replace(/\s+(Onyx Black|Black)$/gi, '')
    .trim();
};

export const getNftBackdrop = (item?: { backdrop?: string; name?: string; rarity?: string; id?: string } | null): 'Onyx Black' | 'Black' | 'Default' => {
  if (!item) return 'Default';
  const bd = String(item.backdrop || '').trim().toLowerCase();
  const name = String(item.name || '').toLowerCase();
  const rarity = String(item.rarity || '').toLowerCase();
  const id = String(item.id || '').toLowerCase();

  if (
    bd === 'onyx black' || bd === 'onyx' ||
    name.includes('onyx') ||
    rarity.includes('onyx') ||
    id.includes('_onyx')
  ) {
    return 'Onyx Black';
  }

  if (
    bd === 'black' ||
    name.includes('(black)') ||
    name.includes(' black') ||
    name.endsWith('black') ||
    rarity.includes('black') ||
    id.includes('_black')
  ) {
    return 'Black';
  }

  return 'Default';
};

export type RarityType = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityConfig {
  type: RarityType;
  label: string;
  pillClass: string;
  cardBg: string;
  liveFeedBg: string;
}

export const getRarityConfig = (item?: {
  rarity?: string;
  price?: number;
  floor_price_gram?: number;
  isGram?: boolean;
  backdrop?: string;
  name?: string;
} | null): RarityConfig | null => {
  if (!item) return null;
  const backdrop = getNftBackdrop(item);
  if (backdrop === 'Black' || backdrop === 'Onyx Black') {
    return null;
  }

  const r = String(item.rarity || '').trim().toLowerCase();
  const price = Number(item.floor_price_gram || item.price || 0);

  if (r === 'legendary' || r === 'mythic' || price > 80) {
    return {
      type: 'legendary',
      label: 'Legendary',
      pillClass: 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      cardBg: 'bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.22)_0%,rgba(180,83,9,0.18)_55%,#1c1004_100%)] border-amber-500/35 shadow-[0_4px_20px_rgba(245,158,11,0.18)]',
      liveFeedBg: 'bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.36)_0%,#241203_100%)] border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
    };
  }
  if (r === 'epic' || price > 50) {
    return {
      type: 'epic',
      label: 'Epic',
      pillClass: 'bg-gradient-to-r from-purple-500 to-violet-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]',
      cardBg: 'bg-[radial-gradient(circle_at_50%_35%,rgba(147,51,234,0.22)_0%,rgba(88,28,135,0.18)_55%,#13081e_100%)] border-purple-500/35 shadow-[0_4px_20px_rgba(147,51,234,0.18)]',
      liveFeedBg: 'bg-[radial-gradient(circle_at_top,rgba(147,51,234,0.36)_0%,#180826_100%)] border-purple-500/40 shadow-[0_0_10px_rgba(147,51,234,0.2)]'
    };
  }
  if (r === 'rare' || price > 20) {
    return {
      type: 'rare',
      label: 'Rare',
      pillClass: 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
      cardBg: 'bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.22)_0%,rgba(30,58,138,0.18)_55%,#080d1e_100%)] border-blue-500/35 shadow-[0_4px_20px_rgba(37,99,235,0.18)]',
      liveFeedBg: 'bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.36)_0%,#081028_100%)] border-blue-500/40 shadow-[0_0_10px_rgba(37,99,235,0.2)]'
    };
  }
  return {
    type: 'common',
    label: 'Common',
    pillClass: 'bg-gradient-to-r from-[#00BFFF] to-[#38bdf8] shadow-[0_0_8px_rgba(0,191,255,0.6)]',
    cardBg: 'bg-[radial-gradient(circle_at_50%_35%,rgba(0,191,255,0.22)_0%,rgba(0,90,130,0.18)_55%,#071018_100%)] border-[#00BFFF]/35 shadow-[0_4px_20px_rgba(0,191,255,0.18)]',
    liveFeedBg: 'bg-[radial-gradient(circle_at_top,rgba(0,191,255,0.36)_0%,#071520_100%)] border-[#00BFFF]/40 shadow-[0_0_10px_rgba(0,191,255,0.2)]'
  };
};
