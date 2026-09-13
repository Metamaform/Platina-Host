export interface LayerMetadata {
  modelName: string;
  modelRarity: number;
  backdropName: string;
  backdropRarity: number;
  patternName: string;
  patternRarity: number;
  cleanModelPreviewUrl?: string;
}

const memoryCache = new Map<string, any>();
const pendingPromises = new Map<string, Promise<any>>();

let activeCount = 0;
const MAX_CONCURRENT = 3;
const queue: (() => void)[] = [];

async function acquireLock() {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return;
  }
  return new Promise<void>(resolve => {
    queue.push(resolve);
  });
}

function releaseLock() {
  if (queue.length > 0) {
    const next = queue.shift();
    if (next) next();
  } else {
    activeCount--;
  }
}

export async function generateCleanPreview(url: string, trait: 'Model' | 'Symbol') {
  if (!url) return null;
  const cacheKey = url + '_' + trait;
  
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }
  
  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey);
  }
  
  const promise = (async () => {
    try {
      await acquireLock();
      
      let fetchUrl = url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        fetchUrl = `/api/proxy/lottie?url=${encodeURIComponent(url)}`;
      }
      
      let retries = 3;
      let res: Response | null = null;
      while (retries > 0) {
        res = await fetch(fetchUrl);
        if (res.status === 429) {
          retries--;
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
          continue;
        }
        
        // Sometimes the AI Studio nginx returns a 403 or 502 with HTML on overload
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          if (retries > 1) {
            retries--;
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          const text = await res.text();
          console.log("[generateCleanPreview] Not JSON! Content-Type:", contentType, "Status:", res.status, "Body:", text.substring(0, 100));
          return null;
        }
        
        break;
      }
      
      if (!res || !res.ok) return null;
      
      const json = await res.json();
      
      if (json._proxy_error) return null;
      
      // Filter layers
      if (json.layers && Array.isArray(json.layers) && !url.includes('.tgs')) {
        json.layers = json.layers.filter((layer: any) => {
          const name = (layer.nm || '').toLowerCase();
          if (trait === 'Model') {
            return name.includes('gift') || name === 'model';
          } else if (trait === 'Symbol') {
            return name.includes('pattern') || name.includes('symbol');
          }
          return false;
        });
      }
      
      memoryCache.set(cacheKey, json);
      return json;
    } catch (e: any) {
      console.log("Failed to extract layer:", e?.name, e?.message, e);
      return null;
    } finally {
      releaseLock();
      pendingPromises.delete(cacheKey);
    }
  })();
  
  pendingPromises.set(cacheKey, promise);
  return promise;
}
