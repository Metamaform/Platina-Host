export interface FragmentGiftPrice {
  slug: string;
  floorPriceTon: number | null;
  floorPriceUsd: number | null;
  currency: 'TON';
  sourceUrl: string;
  fetchedAt: string;
}

const KARTOSHKA_TOKEN = "261:0CgnTn8q9AOKlue9kfrgKiTIWKGTnPgp";

interface CacheEntry {
  data: FragmentGiftPrice;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

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
      console.error(`[kartoshka api error]:`, e?.message || e);
      // Fallback
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
