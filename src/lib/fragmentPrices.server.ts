import fs from 'fs';
import path from 'path';

export interface FragmentGiftPrice {
  slug: string;
  floorPriceTon: number | null;
  floorPriceUsd: number | null;
  currency: 'TON';
  sourceUrl: string;
  fetchedAt: string;
}

export interface BackdropPriceInfo {
  slug: string;
  blackTon: number;
  blackMult: number;
  onyxTon: number;
  onyxMult: number;
  fetchedAt: string;
}

const KARTOSHKA_TOKEN = "261:0CgnTn8q9AOKlue9kfrgKiTIWKGTnPgp";

interface CacheEntry {
  data: FragmentGiftPrice;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const backdropCache = new Map<string, { data: BackdropPriceInfo; expires: number }>();
// 3 hours interval as requested: "Тяни флоры всех нфт, даже с блек фонами и оникс фонами, раз в 3 часа"
export const TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export let lastSyncTime: number = 0;
export let isSyncing: boolean = false;
export let lastSyncStats = {
  regularCount: 0,
  backdropsCount: 0,
  timestamp: '',
  success: true,
  error: null as string | null
};

// Load bundled fallback prices if present
function getStaticBackdropFallback(): Record<string, { blackTon?: number; blackMult?: number; onyxTon?: number; onyxMult?: number }> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'backdrop_prices.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    // Ignore fallback read error
  }
  return {};
}

export async function getFragmentGiftPrices(slugs: string[]): Promise<FragmentGiftPrice[]> {
  const now = Date.now();
  const results: FragmentGiftPrice[] = [];
  const slugsToFetch: string[] = [];

  for (const slug of slugs) {
    const cached = cache.get(slug);
    if (cached && cached.expires > now) {
      results.push(cached.data);
    } else {
      slugsToFetch.push(slug);
    }
  }

  if (slugsToFetch.length > 0) {
    try {
      const url = `https://kartoshka.free/v1/floors?collection=${encodeURIComponent(slugsToFetch.join(','))}&limit=200`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${KARTOSHKA_TOKEN}`,
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const items = json?.result?.items || [];
        
        // Map items by slug (case-insensitive)
        const itemsBySlug = new Map<string, any>();
        for (const item of items) {
          itemsBySlug.set((item.slug || '').toLowerCase(), item);
        }

        for (const slug of slugsToFetch) {
          const item = itemsBySlug.get((slug || '').toLowerCase());
          const data: FragmentGiftPrice = {
            slug,
            floorPriceTon: item ? item.floorTon : null,
            floorPriceUsd: item ? item.floorUsd : null,
            currency: 'TON',
            sourceUrl: `https://kartoshka.free/v1/floors`, 
            fetchedAt: new Date().toISOString(),
          };
          cache.set(slug, { data, expires: now + TTL_MS });
          results.push(data);
        }
      } else {
        throw new Error(`Kartoshka API returned ${res.status}`);
      }
    } catch (e: any) {
      for (const slug of slugsToFetch) {
        results.push({
          slug,
          floorPriceTon: null,
          floorPriceUsd: null,
          currency: 'TON',
          sourceUrl: `https://kartoshka.free`,
          fetchedAt: new Date().toISOString(),
        });
      }
    }
  }

  return results;
}

export async function getFragmentGiftPrice(slug: string): Promise<FragmentGiftPrice> {
  const [result] = await getFragmentGiftPrices([slug]);
  return result;
}

/**
 * Fetches backdrop floor prices for Black and Onyx Black variants for given collection slugs.
 * Queries Kartoshka API `/v1/gifts?collection={slug}&backdrop={backdrop}` and caches the results.
 */
export async function getFragmentBackdropPrices(slugs: string[]): Promise<Record<string, BackdropPriceInfo>> {
  const now = Date.now();
  const results: Record<string, BackdropPriceInfo> = {};
  const slugsToFetch: string[] = [];
  const staticFallback = getStaticBackdropFallback();

  for (const slug of slugs) {
    const sLower = slug.toLowerCase();
    const cached = backdropCache.get(sLower);
    if (cached && cached.expires > now) {
      results[sLower] = cached.data;
    } else {
      slugsToFetch.push(slug);
    }
  }

  if (slugsToFetch.length > 0) {
    const concurrency = 10;
    let idx = 0;

    async function fetchOneSlug(slug: string) {
      const sLower = slug.toLowerCase();
      const fb = staticFallback[sLower] || {};

      try {
        const [resBlack, resOnyx] = await Promise.all([
          fetch(`https://kartoshka.free/v1/gifts?collection=${encodeURIComponent(slug)}&backdrop=Black&limit=1`, {
            headers: { 'Authorization': `Bearer ${KARTOSHKA_TOKEN}`, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
          }).then(r => r.json()).catch(() => null),
          fetch(`https://kartoshka.free/v1/gifts?collection=${encodeURIComponent(slug)}&backdrop=Onyx+Black&limit=1`, {
            headers: { 'Authorization': `Bearer ${KARTOSHKA_TOKEN}`, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
          }).then(r => r.json()).catch(() => null),
        ]);

        const bTonRaw = resBlack?.result?.items?.[0]?.estimate?.ton;
        const bMultRaw = resBlack?.result?.items?.[0]?.estimate?.backdropMult;
        const oTonRaw = resOnyx?.result?.items?.[0]?.estimate?.ton;
        const oMultRaw = resOnyx?.result?.items?.[0]?.estimate?.backdropMult;

        const blackTon = bTonRaw ? Number(bTonRaw.toFixed(2)) : (fb.blackTon || 0);
        const blackMult = bMultRaw ? Number(bMultRaw.toFixed(2)) : (fb.blackMult || 5.5);
        const onyxTon = oTonRaw ? Number(oTonRaw.toFixed(2)) : (fb.onyxTon || 0);
        const onyxMult = oMultRaw ? Number(oMultRaw.toFixed(2)) : (fb.onyxMult || 1.85);

        const info: BackdropPriceInfo = {
          slug,
          blackTon,
          blackMult,
          onyxTon,
          onyxMult,
          fetchedAt: new Date().toISOString(),
        };

        backdropCache.set(sLower, { data: info, expires: now + TTL_MS });
        results[sLower] = info;
      } catch (err) {
        // Fallback to static pre-parsed file or defaults
        const info: BackdropPriceInfo = {
          slug,
          blackTon: fb.blackTon || 0,
          blackMult: fb.blackMult || 5.5,
          onyxTon: fb.onyxTon || 0,
          onyxMult: fb.onyxMult || 1.85,
          fetchedAt: new Date().toISOString(),
        };
        backdropCache.set(sLower, { data: info, expires: now + (TTL_MS / 2) });
        results[sLower] = info;
      }
    }

    const workers = Array.from({ length: concurrency }).map(async () => {
      while (idx < slugsToFetch.length) {
        const slug = slugsToFetch[idx++];
        await fetchOneSlug(slug);
      }
    });

    await Promise.all(workers);
  }

  return results;
}

/**
 * Force or scheduled refresh of all NFT floor prices (regular, Black, Onyx Black).
 * Runs on server boot and every 3 hours.
 */
export async function syncAllNftPrices(slugs: string[], force: boolean = false): Promise<{
  prices: FragmentGiftPrice[];
  backdrops: Record<string, BackdropPriceInfo>;
}> {
  if (isSyncing) {
    console.log('[Price Sync] Sync already in progress, skipping duplicate call');
    return {
      prices: Array.from(cache.values()).map(c => c.data),
      backdrops: Object.fromEntries(Array.from(backdropCache.entries()).map(([k, v]) => [k, v.data]))
    };
  }

  isSyncing = true;
  console.log(`[Price Sync] Starting price update for ${slugs.length} collections (force=${force})...`);

  if (force) {
    for (const slug of slugs) {
      cache.delete(slug);
      backdropCache.delete(slug.toLowerCase());
    }
  }

  try {
    const [prices, backdrops] = await Promise.all([
      getFragmentGiftPrices(slugs),
      getFragmentBackdropPrices(slugs)
    ]);

    lastSyncTime = Date.now();
    lastSyncStats = {
      regularCount: prices.length,
      backdropsCount: Object.keys(backdrops).length,
      timestamp: new Date().toISOString(),
      success: true,
      error: null
    };

    console.log(`[Price Sync] Successfully updated prices: ${prices.length} regular floors, ${Object.keys(backdrops).length} Black/Onyx floors`);
    return { prices, backdrops };
  } catch (err: any) {
    console.error('[Price Sync] Error during prices synchronization:', err);
    lastSyncStats = {
      ...lastSyncStats,
      timestamp: new Date().toISOString(),
      success: false,
      error: err?.message || String(err)
    };
    throw err;
  } finally {
    isSyncing = false;
  }
}
