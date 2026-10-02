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
