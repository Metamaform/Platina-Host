export const cleanNftName = (name?: string): string => {
  if (!name) return '';
  return name
    .replace(/\s*\((Onyx Black|Black)\)/gi, '')
    .replace(/\s+(Onyx Black|Black)$/gi, '')
    .trim();
};

export const getNftBackdrop = (item?: { backdrop?: string; name?: string; rarity?: string; id?: string } | null): 'Onyx Black' | 'Black' | 'Default' => {
  if (!item) return 'Default';
  if (item.backdrop === 'Onyx Black') return 'Onyx Black';
  if (item.backdrop === 'Black') return 'Black';
  if (item.name?.includes('(Onyx Black)') || item.name?.toLowerCase().includes('onyx') || item.rarity === 'Onyx Black' || item.id?.endsWith('_onyx')) {
    return 'Onyx Black';
  }
  if (item.name?.includes('(Black)') || item.name?.toLowerCase().endsWith('black') || item.rarity === 'Black' || item.id?.endsWith('_black')) {
    return 'Black';
  }
  return 'Default';
};
