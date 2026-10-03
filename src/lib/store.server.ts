import fs from 'fs';
import path from 'path';
import { supabaseServer } from './supabase.server';

/**
 * Простое файловое хранилище (JSON на диске) — заменяет localStorage,
 * который был привязан к браузеру, а не к реальному Telegram-юзеру.
 *
 * Этого достаточно для одного сервера/демо. Если будет второй инстанс
 * сервера (масштабирование) или важна надёжность при падениях —
 * замени на настоящую БД (Postgres/SQLite), интерфейс функций ниже
 * можно оставить тем же.
 */

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OPENS_FILE = path.join(DATA_DIR, 'opens.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin_config.json');
const MAINTENANCE_FILE = path.join(DATA_DIR, 'maintenance.json');
const CASES_FILE = path.join(DATA_DIR, "cases.json");

export interface CaseItemConfig {
  giftId: string;
  chance: number;
}
export interface Promocode {
  code: string;
  type: 'gram' | 'nft';
  value: string;
  maxUses: number;
  currentUses: number;
  active: boolean;
}

export interface PromoRedemptions {
  [userId: string]: string[];
}

export interface CaseConfig {
  id: string;
  name: string;
  price: number;
  image: string;
  items: CaseItemConfig[];
}

const PROMOCODES_FILE = path.join(DATA_DIR, 'promocodes.json');
const REDEMPTIONS_FILE = path.join(DATA_DIR, 'promo_redemptions.json');

export function getPromocodes(): Promocode[] {
  return readJson<Promocode[]>(PROMOCODES_FILE, []);
}
export function savePromocodes(codes: Promocode[]) {
  writeJson(PROMOCODES_FILE, codes);
}
export function getPromoRedemptions(): PromoRedemptions {
  return readJson<PromoRedemptions>(REDEMPTIONS_FILE, {});
}
export function savePromoRedemptions(reds: PromoRedemptions) {
  writeJson(REDEMPTIONS_FILE, reds);
}

export function getCasesConfig(): CaseConfig[] {
  return readJson<CaseConfig[]>(CASES_FILE, []);
}

export function saveCasesConfig(cases: CaseConfig[]) {
  writeJson(CASES_FILE, cases);
}
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const MAX_OPENS = 200;
const STARTING_BALANCE = 0; // 0 стартовый баланс

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    ensureDataDir();
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf-8').trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return parsed as T;
    } else if (typeof fallback === 'object' && fallback !== null) {
      return { ...fallback, ...parsed } as T;
    }
    return parsed as T;
  } catch (e) {
    console.error(`[store] не смог прочитать ${file}:`, e);
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDataDir();
  // Atomic write: stage to a temp file then rename, so a crash mid-write can
  // never leave a truncated/corrupt JSON that readJson would fail to parse.
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export interface StoredUser {
  languageCode?: string;
  needsReload?: boolean;
  seasonTurnover?: number;
  id: number;
  referredBy?: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  balance: number;
  inventory: any[];
  turnover?: number;
  topups?: { id: string; amount: number; ts: string }[];
  createdAt: string;
  updatedAt: string;
  completedTasks?: Record<string, { completedAt: string }>;
  welcomeSeen?: boolean;
  welcomeSeenAt?: string;
}

let usersCache: Record<string, StoredUser> | null = null;
function users(): Record<string, StoredUser> {
  if (!usersCache) usersCache = readJson<Record<string, StoredUser>>(USERS_FILE, {});
  return usersCache;
}

export async function syncUserFromSupabase(id: number): Promise<void> {
  if (!supabaseServer) return;
  try {
    const { data, error } = await supabaseServer.from('users').select('*').eq('id', id).single();
    if (error || !data) return;
    
    const all = users();
    const key = String(id);
    
    if (!all[key]) {
      all[key] = {
        id: Number(data.id),
        firstName: data.first_name || '',
        lastName: data.last_name,
        username: data.username,
        photoUrl: data.photo_url || undefined,
        languageCode: data.language_code,
        balance: Number(data.balance) || 0,
        inventory: typeof data.inventory === 'string' ? JSON.parse(data.inventory) : (data.inventory || []),
        turnover: 0,
        topups: [],
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
      };
      writeJson(USERS_FILE, all);
    } else {
      // Only restore from Supabase if local user state is completely empty
      const isLocalEmpty = (all[key].balance === 0 || all[key].balance === undefined) && (!all[key].inventory || all[key].inventory.length === 0);
      if (isLocalEmpty && (Number(data.balance) > 0 || (Array.isArray(data.inventory) && data.inventory.length > 0))) {
        all[key].balance = Number(data.balance) || 0;
        all[key].inventory = typeof data.inventory === 'string' ? JSON.parse(data.inventory) : (data.inventory || []);
        writeJson(USERS_FILE, all);
      }
    }
  } catch (e) {
    console.error("[Supabase] Failed to sync down from Supabase:", e);
  }
}

export function getUser(id: number): StoredUser | null {
  return users()[String(id)] || null;
}

/** Разбирает реферальный start_param: «ref_<id>» (канон) и «r_<id>» (легаси). */
export function parseReferralStartParam(startParam?: string | null): number | undefined {
  if (!startParam) return undefined;
  const m = /^(?:ref|r)_([0-9]+)$/.exec(startParam.trim());
  if (!m) return undefined;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

export function upsertUserProfile(profile: {
  id: number;
  referredBy?: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}, startParam?: string | null): StoredUser {
  const all = users();
  const key = String(profile.id);
  const existing = all[key];
  const now = new Date().toISOString();

  const user: StoredUser = existing
    ? {
        ...existing,
        firstName: profile.first_name,
        lastName: profile.last_name,
        username: profile.username,
        photoUrl: profile.photo_url || existing.photoUrl,
        needsReload: false,
        updatedAt: now,
      }
    : {
        id: profile.id,
        referredBy: profile.referredBy ?? parseReferralStartParam(startParam),
        firstName: profile.first_name,
        lastName: profile.last_name,
        username: profile.username,
        photoUrl: profile.photo_url,
        balance: STARTING_BALANCE,
        inventory: [],
        turnover: 0,
        topups: [],
        createdAt: now,
        updatedAt: now,
      };

  all[key] = user;
  writeJson(USERS_FILE, all);

  // Sync to Supabase in the background (fire-and-forget)
  if (supabaseServer) {
    supabaseServer.from('users').upsert({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName || null,
      username: user.username || null,
      language_code: user.languageCode || null,
      balance: user.balance,
      inventory: user.inventory,
    }, { onConflict: 'id' }).then(({ error }: { error: any }) => {
      if (error) {
        console.error("[Supabase] Error syncing user:", error);
        try { const fs = require('fs'); fs.appendFileSync('data/supabase.log', new Date().toISOString() + ' Sync User Error: ' + JSON.stringify(error) + '\n'); } catch (e) {}
      }
    });
  }

  return user;
}

export function setWelcomeSeen(id: number): StoredUser | null {
  const all = users();
  const key = String(id);
  const existing = all[key];
  if (!existing) return null;
  existing.welcomeSeen = true;
  existing.welcomeSeenAt = new Date().toISOString();
  existing.updatedAt = new Date().toISOString();
  all[key] = existing;
  writeJson(USERS_FILE, all);
  return existing;
}

export function resetWelcomeSeen(id: number): StoredUser | null {
  const all = users();
  const key = String(id);
  const existing = all[key];
  if (!existing) return null;
  existing.welcomeSeen = false;
  existing.updatedAt = new Date().toISOString();
  all[key] = existing;
  writeJson(USERS_FILE, all);
  return existing;
}

export function saveUserState(id: number, balance: number, inventory: any[], turnover?: number, topups?: any[]): StoredUser | null {
  const all = users();
  const key = String(id);
  const existing = all[key];
  if (!existing) return null;
  existing.needsReload = false;
  existing.balance = balance;
  existing.inventory = inventory;
  if (typeof turnover === 'number') {
    const delta = Math.max(0, turnover - (existing.turnover || 0));
    if (existing.seasonTurnover === undefined || existing.seasonTurnover === null) {
      existing.seasonTurnover = turnover;
    } else {
      existing.seasonTurnover = (existing.seasonTurnover || 0) + delta;
    }
    existing.turnover = turnover;
  }
  if (Array.isArray(topups)) existing.topups = topups;
  existing.updatedAt = new Date().toISOString();
  all[key] = existing;
  writeJson(USERS_FILE, all);

  // Sync state update to Supabase in background
  if (supabaseServer) {
    supabaseServer.from('users').update({
      balance: existing.balance,
      inventory: existing.inventory,
    }).eq('id', existing.id).then(({ error }: { error: any }) => {
      if (error) {
        console.error("[Supabase] Error syncing user state:", error);
        try { const fs = require('fs'); fs.appendFileSync('data/supabase.log', new Date().toISOString() + ' Sync State Error: ' + JSON.stringify(error) + '\n'); } catch (e) {}
      }
    });
  }

  return existing;
}

export interface OpenEvent {
  id: string;
  ts: string;
  firstName: string;
  gift?: { id?: string; name: string; image_url?: string; slug?: string; price?: number; backdrop?: string; pattern?: string; lottieUrl?: string };
  price: number;
  isGram?: boolean;
  multiplier?: number;
  game?: string;
  photoUrl?: string;
}

let opensCache: OpenEvent[] | null = null;
function opens(): OpenEvent[] {
  if (!opensCache) opensCache = readJson<OpenEvent[]>(OPENS_FILE, []);
  return opensCache;
}

export function recordOpen(event: OpenEvent) {
  const list = opens();
  const eventTime = new Date(event.ts).getTime();

  // Prevent duplicate insertion if an identical event was recorded within 8 seconds
  const isDuplicate = list.slice(0, 10).some((existing) => {
    const existingTime = new Date(existing.ts).getTime();
    if (Math.abs(eventTime - existingTime) > 8000) return false;
    if (existing.firstName !== event.firstName) return false;
    if (Math.abs(existing.price - event.price) > 0.01) return false;
    const sameGift = (existing.gift?.name || '') === (event.gift?.name || '');
    return sameGift;
  });

  if (isDuplicate) {
    return;
  }

  list.unshift(event);
  if (list.length > MAX_OPENS) list.length = MAX_OPENS;
  writeJson(OPENS_FILE, list);
}

export function getRecentOpens(limit = 20): OpenEvent[] {
  const list = opens();
  const seen = new Set<string>();
  const unique: OpenEvent[] = [];

  for (const item of list) {
    const timeKey = Math.floor(new Date(item.ts).getTime() / 8000);
    const giftName = item.gift?.name || (item.isGram ? 'gram' : 'unknown');
    const key = `${item.firstName}_${giftName}_${Number(item.price || 0).toFixed(2)}_${timeKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique.slice(0, limit);
}

const LEADERBOARD_CONFIG_FILE = path.join(DATA_DIR, 'leaderboard_config.json');
const GIFTS_FILE = path.join(DATA_DIR, 'gifts.json');

export function getGiftsConfig() {
  return readJson(GIFTS_FILE, null);
}

export function saveGiftsConfig(gifts: any[]) {
  writeJson(GIFTS_FILE, gifts);
}


export interface LeaderboardPrize {
  url: string;
  name: string;
  price?: number;
}

export interface LeaderboardConfig {
  endTime: string;
  places: number;
  prizeNftUrl?: string;
  prizeNftName?: string;
  prizeNftPrice?: number;
  prizes?: Record<number, LeaderboardPrize>;
}

let lbConfigCache: LeaderboardConfig | null = null;

export interface MaintenanceConfig {
  isMaintenance: boolean;
  whitelist: number[];
}

let maintenanceCache: MaintenanceConfig | null = null;


export function getMaintenanceConfig(): MaintenanceConfig {
  if (!maintenanceCache) {
    maintenanceCache = readJson<MaintenanceConfig>(MAINTENANCE_FILE, { isMaintenance: false, whitelist: [] });
  }
  return maintenanceCache;
}

export function saveMaintenanceConfig(config: MaintenanceConfig) {
  maintenanceCache = config;
  writeJson(MAINTENANCE_FILE, config);
}


export interface AdminConfig {
  isMaintenance: boolean;
  whitelist: number[];
  allowWebBypass: boolean;
  botTopupPhoto?: string;
  botWithdrawPhoto?: string;
  botStartPhoto?: string;
  botSupportUrl?: string;
  botChannelUrl?: string;
  botAppUrl?: string;
  demoMode?: boolean;
  /** TON address that receives TON top-ups. If empty, TON top-up is disabled. */
  tonTopupAddress?: string;
}

let adminConfigCache: AdminConfig | null = null;

export function getAdminConfig(): AdminConfig {
  if (!adminConfigCache) {
    adminConfigCache = readJson<AdminConfig>(ADMIN_CONFIG_FILE, { 
      isMaintenance: false, 
      whitelist: [1198270529, 1337], 
      allowWebBypass: false,
      botTopupPhoto: '',
      botWithdrawPhoto: '',
      botStartPhoto: '',
      botSupportUrl: 'https://t.me/platina_help',
      botChannelUrl: 'https://t.me/platina_gift',
      botAppUrl: 'https://t.me/app_bot/app'
    });
  }
  return adminConfigCache;
}

export function saveAdminConfig(config: AdminConfig) {
  adminConfigCache = config;
  writeJson(ADMIN_CONFIG_FILE, config);
}

export function getLeaderboardConfig(): LeaderboardConfig {
  if (!lbConfigCache) {
    lbConfigCache = readJson<LeaderboardConfig>(LEADERBOARD_CONFIG_FILE, {
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      places: 100,
      prizeNftUrl: 'https://nft.fragment.com/gift/heroichelmet-1.lottie.json',
      prizeNftName: 'Heroic Helmet'
    });
  }
  return lbConfigCache;
}

export function saveLeaderboardConfig(config: LeaderboardConfig) {
  lbConfigCache = config;
  writeJson(LEADERBOARD_CONFIG_FILE, config);
}


export function checkLeaderboardEnd() {
  const config = getLeaderboardConfig();
  const now = new Date();
  const endTime = new Date(config.endTime);
  
  console.log(`[checkLeaderboardEnd] Now: ${now.toISOString()} | EndTime: ${endTime.toISOString()} | NowMs: ${now.getTime()} | EndMs: ${endTime.getTime()}`);

  if (now.getTime() > endTime.getTime()) {
    console.log(`[checkLeaderboardEnd] LEADERBOARD ENDED! TRIGGERING PRIZES!`);
    const all = users();
    const sorted = Object.values(all)
      .filter(u => (u.seasonTurnover ?? u.turnover ?? 0) > 0)
      .sort((a, b) => (b.seasonTurnover ?? b.turnover ?? 0) - (a.seasonTurnover ?? a.turnover ?? 0));
    
    const top = sorted.slice(0, config.places || 100).map((u, i) => ({
      rank: i + 1,
      id: u.id
    }));

    let giftsDb = [];
    try {
      giftsDb = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/gifts_data.json'), 'utf8'));
    } catch (e) {
      console.error('Failed to read gifts_data.json in checkLeaderboardEnd:', e);
    }

    for (const winner of top) {
      const u = all[winner.id];
      if (u) {
        const rank = winner.rank;
        const specificPrize = config.prizes && config.prizes[rank];
        let prize = specificPrize;
        if (!prize && config.prizeNftUrl && config.prizeNftName) {
          prize = { url: config.prizeNftUrl, name: config.prizeNftName, price: config.prizeNftPrice };
        }
        if (prize) {
          const dbGift = giftsDb.find((g: any) => g.name === prize.name || g.image_url === prize.url || g.lottie_url === prize.url);
          const finalPrice = dbGift?.floor_price_gram ?? prize.price ?? 10000;
          
          const giftItem = {
            id: Date.now().toString() + '-' + rank,
            uniqueId: Date.now().toString() + '-' + rank,
            name: prize.name,
            image_url: prize.url,
            lottie_url: prize.url,
            rarity: dbGift?.rarity || 'Mythic',
            price: finalPrice
          };
          u.inventory.push(giftItem);
        }
      }
    }

    for (const key of Object.keys(all)) {
      all[key].seasonTurnover = 0;
    }

    writeJson(USERS_FILE, all);

    config.endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    saveLeaderboardConfig(config);
    return true;
  }
  return false;
}

let lastEndCheck = 0;
export function getLeaderboardData(currentUserId: number, limit: number = 100) {
  // Throttle season-end processing to once a minute instead of every request.
  const now = Date.now();
  if (now - lastEndCheck > 60_000) {
    lastEndCheck = now;
    checkLeaderboardEnd();
  }
  const allUsers = Object.values(users());
  const getUserTurnover = (u: StoredUser) => {
    if (typeof u.seasonTurnover === 'number' && u.seasonTurnover > 0) return u.seasonTurnover;
    return u.turnover || 0;
  };

  const sorted = allUsers
    .filter(u => getUserTurnover(u) > 0)
    .sort((a, b) => getUserTurnover(b) - getUserTurnover(a));

  const resolvePersonalAvatar = (u: StoredUser): string => {
    if (u.photoUrl && typeof u.photoUrl === 'string' && u.photoUrl.trim() !== '') {
      return u.photoUrl;
    }
    const key = `${u.id || ''} ${u.username || ''} ${u.firstName || ''}`.toLowerCase();
    if (key.includes('metamaform')) {
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    }
    if (key.includes('bigchif') || key.includes('goychick') || key.includes('chif')) {
      return 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80';
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username || u.firstName || String(u.id))}`;
  };
    
  const top = sorted.slice(0, limit).map((u, i) => ({
    rank: i + 1,
    id: u.id,
    firstName: u.firstName,
    username: u.username,
    photoUrl: resolvePersonalAvatar(u),
    turnover: getUserTurnover(u)
  }));
  
  const currentUserIndex = sorted.findIndex(u => u.id === currentUserId);
  const currentUser = currentUserIndex !== -1 ? {
    rank: currentUserIndex + 1,
    id: sorted[currentUserIndex].id,
    firstName: sorted[currentUserIndex].firstName,
    username: sorted[currentUserIndex].username,
    photoUrl: resolvePersonalAvatar(sorted[currentUserIndex]),
    turnover: getUserTurnover(sorted[currentUserIndex])
  } : null;
  
  return { top, currentUser };
}

export function getReferrals(userId: number) {
  const all = users();
  const referrals = [];
  for (const key in all) {
    const user = all[key];
    if (user.referredBy === userId) {
      const topupSum = user.topups ? user.topups.reduce((acc, t) => acc + (t.amount || 0), 0) : 0;
      referrals.push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        topupSum,
        createdAt: user.createdAt
      });
    }
  }
  return referrals.sort((a, b) => b.topupSum - a.topupSum);
}


export interface TaskConfig {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'daily' | 'all';
  expiresAt?: string;
  link?: string;
  icon?: string;
  reqs?: {
    game: 'upgrade' | 'mines' | 'craft' | 'cases' | 'turnover';
    targetAmount: number;
    minBet?: number;
    minMultiplier?: number;
  };
}

export function getTasksConfig(): TaskConfig[] {
  return readJson<TaskConfig[]>(TASKS_FILE, []);
}

export function saveTasksConfig(tasks: TaskConfig[]) {
  writeJson(TASKS_FILE, tasks);
}

export function isSameUtcDay(a: string | number | Date, b: Date): boolean {
  const d = new Date(a);
  return (
    d.getUTCFullYear() === b.getUTCFullYear() &&
    d.getUTCMonth() === b.getUTCMonth() &&
    d.getUTCDate() === b.getUTCDate()
  );
}

export function completeUserTask(
  userId: number,
  taskId: string,
  reward: number,
  daily = false
): boolean {
  const allUsers = users();
  const user = allUsers[String(userId)];
  if (!user) return false;

  if (!user.completedTasks) {
    user.completedTasks = {};
  }

  const existing = user.completedTasks[taskId];
  const now = new Date();

  // Daily tasks reset each UTC day: a completion from a previous day does not
  // block today's claim. One-off tasks stay completed forever.
  if (existing) {
    if (daily && isSameUtcDay(existing.completedAt, now)) {
      return false; // already claimed today
    }
    if (!daily) {
      return false; // one-off already completed
    }
    // daily from a previous day → fall through and re-claim
  }

  user.completedTasks[taskId] = { completedAt: now.toISOString() };
  user.balance = (user.balance || 0) + reward;

  writeJson(USERS_FILE, allUsers);
  return true;
}

export function setUserLanguage(id: number, languageCode: string, profile?: any) {
  const all = users();
  const key = String(id);
  let existing = all[key];
  
  if (!existing) {
    if (profile) {
      existing = {
        id,
        firstName: profile.first_name || 'Player',
        lastName: profile.last_name || '',
        username: profile.username || '',
        photoUrl: profile.photo_url || '',
        balance: STARTING_BALANCE,
        inventory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      return;
    }
  }
  
  existing.languageCode = languageCode;
  all[key] = existing;
  writeJson(USERS_FILE, all);
}
