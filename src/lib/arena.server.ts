/*
  AICE ARENA — серверный движок джекпот-арены.

  Вся игровая логика живёт здесь, на сервере:
  · создание раундов и приватных арен;
  · приём ставок (GRAM + NFT) и списание средств;
  · таймер и машина состояний WAITING → ACCEPTING_BETS → LOCKED → DRAWING → COMPLETED;
  · provably fair определение победителя (serverSeed + HMAC);
  · выплата банку победителю, рефанды при отмене;
  · история завершённых раундов (персистится в data/arena_history.json);
  · push-рассылка состояний клиентам по SSE (см. /api/arena/stream).

  Frontend только отображает состояние и отправляет действия —
  никаких решений о результате на клиенте.
*/

import crypto from 'crypto';
import fs from 'fs';
import type express from 'express';
import { getUser, saveUserState, recordOpen } from './store.server.ts';
import {
  ArenaParticipant,
  ArenaRoundState,
  ArenaHistoryEntry,
  ArenaStatus,
  ARENA_TIMINGS,
  ARENA_LIMITS,
  arenaPercent,
} from './arenaShared.ts';

// ---------------------------------------------------------------------------
// Персист метаданных (счётчик id) и истории
// ---------------------------------------------------------------------------

const DATA_DIR = 'data';
const META_FILE = `${DATA_DIR}/arena_meta.json`;
const HISTORY_FILE = `${DATA_DIR}/arena_history.json`;
const HISTORY_CAP = 200;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    ensureDataDir();
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf-8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`[arena] не смог прочитать ${file}:`, e);
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  try {
    ensureDataDir();
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  } catch (e) {
    console.error(`[arena] не смог записать ${file}:`, e);
  }
}

interface ArenaMeta { nextId: number }
let meta: ArenaMeta = readJson<ArenaMeta>(META_FILE, { nextId: 449085 });

// Первый публичный пул — ровно как в ТЗ: #449085
function nextRoundId(): number {
  const id = meta.nextId || 449085;
  meta.nextId = id + 1;
  writeJson(META_FILE, meta);
  return id;
}

let historyCache: ArenaHistoryEntry[] | null = null;
function history(): ArenaHistoryEntry[] {
  if (!historyCache) historyCache = readJson<ArenaHistoryEntry[]>(HISTORY_FILE, []);
  return historyCache;
}

function pushHistory(entry: ArenaHistoryEntry) {
  const h = history();
  h.unshift(entry);
  if (h.length > HISTORY_CAP) h.length = HISTORY_CAP;
  writeJson(HISTORY_FILE, h);
  broadcast({ type: 'history' });
}

// ---------------------------------------------------------------------------
// Provably fair
// ---------------------------------------------------------------------------

function makeSeed(): { seed: string; hash: string } {
  const seed = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return { seed, hash };
}

/** Число [0..1) из HMAC-SHA256(serverSeed, "arena:<roundId>"). */
function rollFromSeed(serverSeed: string, roundId: number): number {
  const hmac = crypto.createHmac('sha256', serverSeed).update(`arena:${roundId}`).digest();
  // первые 8 байт → целое → нормируем в [0..1)
  const int = hmac.readUIntBE(0, 6); // 48 бит — достаточно и не теряет точность float
  return int / 2 ** 48;
}

// ---------------------------------------------------------------------------
// Модель раунда
// ---------------------------------------------------------------------------

interface ArenaRound {
  id: number;
  isPrivate: boolean;
  code?: string;
  mode: 'STANDARD';
  status: ArenaStatus;
  createdAt: number;
  endsAt?: number;
  lockedAt?: number;
  drawAt?: number;
  completedAt?: number;
  archivedAt?: number;
  participants: ArenaParticipant[];
  totalPool: number;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  creatorId?: number;
  winnerId?: string;
  winAmount?: number;
  serverSeed: string;
  serverSeedHash: string;
  seedRevealed: boolean;
  roll?: number;
  ticket?: number;
  // планировщик демо-ботов
  botTarget: number;
  nextBotAt: number;
}

const rounds = new Map<number, ArenaRound>();
/** id последнего публичного раунда */
let publicRoundId: number | null = null;

function newRound(opts: { isPrivate?: boolean; code?: string; creatorId?: number; maxPlayers?: number }): ArenaRound {
  const { seed, hash } = makeSeed();
  const round: ArenaRound = {
    id: nextRoundId(),
    isPrivate: !!opts.isPrivate,
    code: opts.code,
    mode: 'STANDARD',
    status: opts.isPrivate ? 'WAITING' : 'ACCEPTING_BETS',
    createdAt: Date.now(),
    participants: [],
    totalPool: 0,
    maxPlayers: opts.maxPlayers || ARENA_LIMITS.DEFAULT_MAX_PLAYERS,
    minBet: ARENA_LIMITS.MIN_BET,
    maxBet: ARENA_LIMITS.MAX_BET,
    creatorId: opts.creatorId,
    serverSeed: seed,
    serverSeedHash: hash,
    seedRevealed: false,
    botTarget: 0,
    nextBotAt: 0,
  };
  if (!opts.isPrivate) {
    round.endsAt = Date.now() + ARENA_TIMINGS.BETTING_MS;
    scheduleBots(round);
  }
  rounds.set(round.id, round);
  return round;
}

function currentPublicRound(): ArenaRound {
  if (publicRoundId != null) {
    const r = rounds.get(publicRoundId);
    if (r) return r;
  }
  const r = newRound({});
  publicRoundId = r.id;
  broadcastRound(r);
  return r;
}

function recomputeShares(round: ArenaRound) {
  for (const p of round.participants) {
    p.percentage = Number(arenaPercent(p.contribution, round.totalPool).toFixed(1));
  }
}

function findParticipant(round: ArenaRound, userId: number): ArenaParticipant | undefined {
  return round.participants.find((p) => p.userId === userId);
}

// ---------------------------------------------------------------------------
// Демо-боты (только для демонстрации: bypass-режим / ARENA_DEMO_BOTS=1).
// В реальной эксплуатации с Telegram-пользователями выключены.
// ---------------------------------------------------------------------------

const BOT_NAMES = [
  'PlayerOne', 'PlayerTwo', 'CryptoKing', 'LuckyStar', 'NftHunter',
  'MoonRider', 'DiamondHand', 'FastFinger', 'WhaleWatch', 'SniperX',
];

let giftsDbCache: any[] | null = null;
function getGiftsDb(): any[] {
  if (!giftsDbCache) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      giftsDbCache = JSON.parse(fs.readFileSync('src/gifts_data.json', 'utf-8'));
    } catch {
      try {
        giftsDbCache = JSON.parse(fs.readFileSync('dist/gifts_data.json', 'utf-8'));
      } catch {
        giftsDbCache = [];
      }
    }
  }
  return giftsDbCache || [];
}

export function arenaBotsEnabled(): boolean {
  const env = (process.env.ARENA_DEMO_BOTS || '').trim();
  if (env === '1') return true;
  if (env === '0') return false;
  // по умолчанию — только в веб-bypass (демо) режиме
  try {
    const cfg = readJson<any>(`${DATA_DIR}/admin_config.json`, {});
    return !!cfg.allowWebBypass;
  } catch {
    return false;
  }
}

function scheduleBots(round: ArenaRound) {
  if (!arenaBotsEnabled()) return;
  round.botTarget = 2 + Math.floor(Math.random() * 3); // 2..4 бота
  round.nextBotAt = Date.now() + 2500 + Math.floor(Math.random() * 3500);
}

function spawnBotBet(round: ArenaRound) {
  const giftsDb = getGiftsDb();
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  // суммы с уклоном в мелкие ставки, как в живой арене
  const amount = Number((Math.random() < 0.7 ? 0.1 + Math.random() * 0.9 : 1 + Math.random() * 4).toFixed(2));
  let gift: ArenaParticipant['gift'];
  let contribution = amount;
  if (giftsDb.length && Math.random() < 0.18) {
    const g = giftsDb[Math.floor(Math.random() * giftsDb.length)];
    const value = Number(g.floor_price_gram || g.price || 0);
    if (value > 0 && round.totalPool + value < round.maxBet * 4) {
      gift = {
        id: g.id,
        name: g.name,
        image_url: g.image_url || g.lottie_url,
        lottie_url: g.lottie_url || g.image_url,
        price: value,
        floor_price_gram: value,
        backdrop: g.backdrop || 'Default',
      };
      contribution = Number((amount + value).toFixed(2));
    }
  }
  const botUserId = -(1_000_000 + Math.floor(Math.random() * 8_999_999));
  const p: ArenaParticipant = {
    id: `bet-${round.id}-${botUserId}`,
    userId: botUserId,
    username: name,
    firstName: name,
    betAmount: amount,
    gift,
    contribution,
    percentage: 0,
    status: 'ACTIVE',
    joinedAt: Date.now(),
    isBot: true,
  };
  round.participants.push(p);
  round.totalPool = Number((round.totalPool + contribution).toFixed(2));
  recomputeShares(round);
  broadcastRound(round);
}

// ---------------------------------------------------------------------------
// Цикл движка (машина состояний)
// ---------------------------------------------------------------------------

function pickWinner(round: ArenaRound): { participant: ArenaParticipant; roll: number; ticket: number } | null {
  if (round.participants.length === 0 || round.totalPool <= 0) return null;
  const roll = rollFromSeed(round.serverSeed, round.id);
  const ticket = round.totalPool * roll;
  let acc = 0;
  for (const p of round.participants) {
    acc += p.contribution;
    if (ticket < acc) return { participant: p, roll, ticket };
  }
  // страховка от погрешности float — последний участник
  const last = round.participants[round.participants.length - 1];
  return { participant: last, roll, ticket: round.totalPool };
}

function refundRound(round: ArenaRound, status: ArenaStatus) {
  round.status = status;
  for (const p of round.participants) {
    if (p.isBot) { p.status = 'REFUNDED'; continue; }
    const user = getUser(p.userId);
    if (!user) { p.status = 'REFUNDED'; continue; }
    let balance = user.balance;
    const inv = [...(user.inventory || [])];
    if (p.betAmount > 0) balance = Number((balance + p.betAmount).toFixed(2));
    if (p.gift) {
      // вернуть NFT (без дубля uniqueId)
      if (!inv.some((i: any) => p.gift!.uniqueId && i.uniqueId === p.gift!.uniqueId)) {
        inv.push(p.gift as any);
      }
    }
    p.status = 'REFUNDED';
    saveUserState(p.userId, balance, inv, user.turnover, user.topups);
    broadcastToUser(p.userId, { type: 'balance', balance, inventory: inv });
  }
}

function completeRound(round: ArenaRound) {
  const picked = round.winnerId
    ? null // уже выбран (не бывает, но на всякий случай)
    : pickWinner(round);

  if (!picked) {
    // ставок не было (приватное лобби истекло) — отменяем
    refundRound(round, 'CANCELLED');
    round.completedAt = Date.now();
    pushHistory(snapshotHistory(round));
    return;
  }

  const { participant, roll, ticket } = picked;
  round.roll = roll;
  round.ticket = Number(ticket.toFixed(4));
  round.winnerId = participant.id;
  round.winAmount = round.totalPool;
  round.seedRevealed = true;
  round.status = 'COMPLETED';
  round.completedAt = Date.now();

  // статусы участников
  for (const p of round.participants) {
    p.status = p.id === participant.id ? 'WON' : 'LOST';
  }

  // выплата: победитель забирает весь банк в GRAM
  if (!participant.isBot) {
    const user = getUser(participant.userId);
    if (user) {
      const newBalance = Number((user.balance + round.totalPool).toFixed(2));
      saveUserState(participant.userId, newBalance, user.inventory || [], user.turnover, user.topups);
      broadcastToUser(participant.userId, { type: 'balance', balance: newBalance, inventory: user.inventory || [] });
    }
  }

  // в живую ленту — победа реального игрока
  if (!participant.isBot) {
    recordOpen({
      id: `arena-${round.id}-${participant.userId}`,
      ts: new Date().toISOString(),
      firstName: participant.firstName || participant.username || 'Player',
      price: round.totalPool,
      isGram: true,
      gift: undefined,
      multiplier: undefined,
    });
  }

  pushHistory(snapshotHistory(round));
}

function snapshotHistory(round: ArenaRound): ArenaHistoryEntry {
  const winner = round.participants.find((p) => p.id === round.winnerId);
  return {
    id: round.id,
    mode: round.mode,
    isPrivate: round.isPrivate,
    status: (round.status === 'CANCELLED' || round.status === 'ERROR' ? round.status : 'COMPLETED') as ArenaHistoryEntry['status'],
    createdAt: round.createdAt,
    completedAt: round.completedAt || Date.now(),
    totalPool: round.totalPool,
    winAmount: round.winAmount || 0,
    participantsCount: round.participants.length,
    winner: winner
      ? {
          id: winner.id,
          userId: winner.userId,
          username: winner.username,
          firstName: winner.firstName,
          avatar: winner.avatar,
          contribution: winner.contribution,
          percentage: winner.percentage,
        }
      : undefined,
    participants: round.participants,
    serverSeedHash: round.serverSeedHash,
    serverSeed: round.seedRevealed ? round.serverSeed : undefined,
    roll: round.roll,
    ticket: round.ticket,
  };
}

let lastTick = 0;
export function tickArenaEngine() {
  const now = Date.now();
  if (now - lastTick < 200) return; // защита от частых вызовов из роутов
  lastTick = now;

  // --- публичный раунд ---
  const pub = currentPublicRound();

  if (pub.status === 'ACCEPTING_BETS') {
    // демо-боты подтягиваются в раунд
    if (arenaBotsEnabled() && pub.participants.length < pub.maxPlayers - 1 && pub.participants.filter((p) => p.isBot).length < pub.botTarget && now >= pub.nextBotAt) {
      spawnBotBet(pub);
      pub.nextBotAt = now + 1800 + Math.floor(Math.random() * 4200);
    }
    if (now >= (pub.endsAt || 0)) {
      pub.status = 'LOCKED';
      pub.lockedAt = now;
      pub.drawAt = now + ARENA_TIMINGS.LOCKED_MS;
      broadcastRound(pub);
    }
  } else if (pub.status === 'LOCKED' && now >= (pub.drawAt || 0)) {
    pub.status = 'DRAWING';
    pub.drawAt = now + ARENA_TIMINGS.DRAWING_MS;
    broadcastRound(pub);
  } else if (pub.status === 'DRAWING' && now >= (pub.drawAt || 0)) {
    if (pub.participants.length === 0) {
      // совсем без ставок — сразу новый раунд
      rounds.delete(pub.id);
      publicRoundId = null;
      currentPublicRound();
    } else {
      completeRound(pub);
      broadcastRound(pub);
    }
  } else if (pub.status === 'COMPLETED' && now >= (pub.completedAt || 0) + ARENA_TIMINGS.COMPLETED_MS) {
    // архивируем и начинаем следующий раунд
    rounds.delete(pub.id);
    publicRoundId = null;
    currentPublicRound();
  } else if ((pub.status === 'CANCELLED' || pub.status === 'ERROR') && now >= (pub.completedAt || pub.lockedAt || 0) + ARENA_TIMINGS.COMPLETED_MS) {
    rounds.delete(pub.id);
    publicRoundId = null;
    currentPublicRound();
  }

  // --- приватные раунды ---
  for (const r of rounds.values()) {
    if (!r.isPrivate) continue;
    if (r.status === 'WAITING' && now >= r.createdAt + ARENA_TIMINGS.PRIVATE_WAITING_MS) {
      refundRound(r, 'CANCELLED');
      r.completedAt = now;
      if (r.participants.length > 0) pushHistory(snapshotHistory(r));
      broadcastRound(r);
    } else if (r.status === 'ACCEPTING_BETS' && now >= (r.endsAt || 0)) {
      r.status = 'LOCKED';
      r.lockedAt = now;
      r.drawAt = now + ARENA_TIMINGS.LOCKED_MS;
      broadcastRound(r);
    } else if (r.status === 'LOCKED' && now >= (r.drawAt || 0)) {
      r.status = 'DRAWING';
      r.drawAt = now + ARENA_TIMINGS.DRAWING_MS;
      broadcastRound(r);
    } else if (r.status === 'DRAWING' && now >= (r.drawAt || 0)) {
      completeRound(r);
      broadcastRound(r);
    } else if ((r.status === 'COMPLETED' || r.status === 'CANCELLED' || r.status === 'ERROR') && now >= (r.completedAt || 0) + 60_000) {
      rounds.delete(r.id);
    }
  }

  pruneRounds();
}

/** Храним ограниченное число раундов в памяти. */
function pruneRounds() {
  if (rounds.size <= 400) return;
  const entries = [...rounds.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  const toDelete = entries.slice(0, rounds.size - 400);
  for (const [id, r] of toDelete) {
    if (id === publicRoundId) continue;
    if (r.status === 'COMPLETED' || r.status === 'CANCELLED' || r.status === 'ERROR' || r.status === 'WAITING') rounds.delete(id);
  }
}

// Запускаем цикл раз и навсегда (аналог rocket-движка)
setInterval(tickArenaEngine, 250);

// ---------------------------------------------------------------------------
// Публичное состояние (то, что уходит клиентам)
// ---------------------------------------------------------------------------


/** Пуш полного состояния раунда всем подписчикам его скоупа. */
function broadcastRound(round: ArenaRound) {
  broadcast({
    type: 'state',
    scope: round.isPrivate ? `private:${round.code}` : 'public',
    round: publicState(round),
  });
}

function publicState(round: ArenaRound): ArenaRoundState {
  return {
    id: round.id,
    isPrivate: round.isPrivate,
    code: round.code,
    mode: round.mode,
    status: round.status,
    createdAt: round.createdAt,
    endsAt: round.endsAt,
    completedAt: round.completedAt,
    totalPool: round.totalPool,
    participants: round.participants,
    maxPlayers: round.maxPlayers,
    minBet: round.minBet,
    maxBet: round.maxBet,
    creatorId: round.creatorId,
    serverSeedHash: round.serverSeedHash,
    serverSeed: round.seedRevealed ? round.serverSeed : undefined,
    roll: round.roll,
    ticket: round.ticket,
    winnerId: round.winnerId,
    winAmount: round.winAmount,
    serverTime: Date.now(),
  };
}

export function getArenaState(code?: string): ArenaRoundState {
  tickArenaEngine();
  if (code) {
    const r = findPrivateRound(code);
    if (r) return publicState(r);
  }
  return publicState(currentPublicRound());
}

export function getArenaHistory(limit = 30): ArenaHistoryEntry[] {
  return history().slice(0, Math.min(limit, HISTORY_CAP));
}

export function getArenaRoundEntry(id: number): ArenaHistoryEntry | null {
  return history().find((h) => h.id === id) || null;
}

export function getArenaFair(id: number) {
  const r = rounds.get(id);
  if (r) {
    return {
      id: r.id,
      status: r.status,
      serverSeedHash: r.serverSeedHash,
      serverSeed: r.seedRevealed ? r.serverSeed : undefined,
      roll: r.roll,
      ticket: r.ticket,
      totalPool: r.totalPool,
      winnerId: r.winnerId,
      participants: r.participants.map((p) => ({ id: p.id, contribution: p.contribution, percentage: p.percentage, status: p.status })),
      completedAt: r.completedAt,
    };
  }
  const h = getArenaRoundEntry(id);
  if (!h) return null;
  return {
    id: h.id,
    status: h.status,
    serverSeedHash: h.serverSeedHash,
    serverSeed: h.serverSeed,
    roll: h.roll,
    ticket: h.ticket,
    totalPool: h.totalPool,
    winnerId: h.winner?.id,
    participants: h.participants.map((p) => ({ id: p.id, contribution: p.contribution, percentage: p.percentage, status: p.status })),
    completedAt: h.completedAt,
  };
}

function findPrivateRound(code: string): ArenaRound | undefined {
  const norm = String(code || '').trim().toUpperCase();
  for (const r of rounds.values()) {
    if (r.isPrivate && r.code === norm) return r;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Действия игрока
// ---------------------------------------------------------------------------

export interface ArenaActionResult {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  round?: ArenaRoundState;
  balance?: number;
  inventory?: any[];
  code?: string;
}

function normalizeGift(gift: any): ArenaParticipant['gift'] {
  const value = Number(gift?.floor_price_gram || gift?.price || 0);
  return {
    id: gift?.id,
    uniqueId: gift?.uniqueId,
    name: gift?.name,
    image_url: gift?.image_url || gift?.lottie_url,
    lottie_url: gift?.lottie_url || gift?.image_url,
    price: value,
    floor_price_gram: value,
    backdrop: gift?.backdrop || 'Default',
  };
}

export function placeArenaBet(
  userId: number,
  opts: { amount?: number; gift?: any; code?: string }
): ArenaActionResult {
  tickArenaEngine();

  const user = getUser(userId);
  if (!user) return { error: 'Пользователь не найден', errorCode: 'no_user' };

  // выбираем раунд: приватный по коду или текущий публичный
  let round: ArenaRound;
  if (opts.code) {
    const found = findPrivateRound(opts.code);
    if (!found) return { error: 'Приватная Arena не найдена или уже завершена', errorCode: 'round_not_found' };
    round = found;
  } else {
    round = currentPublicRound();
  }

  if (round.status === 'WAITING') {
    // первая ставка в приватном лобби открывает окно приёма ставок
    round.status = 'ACCEPTING_BETS';
    round.endsAt = Date.now() + ARENA_TIMINGS.BETTING_MS;
  } else if (round.status !== 'ACCEPTING_BETS') {
    return { error: 'Ставки в этом раунде уже закрыты', errorCode: 'bets_closed' };
  }

  if (round.participants.length >= round.maxPlayers) {
    return { error: 'В этом раунде нет свободных мест', errorCode: 'round_full' };
  }
  if (findParticipant(round, userId)) {
    return { error: 'Ставка в этом раунде уже сделана', errorCode: 'bet_already_placed' };
  }

  const amount = Number((Math.max(0, Number(opts.amount) || 0)).toFixed(2));
  const hasGift = !!opts.gift;
  if (!hasGift && amount < round.minBet) {
    return { error: `Минимальная ставка ${round.minBet.toFixed(2)} GRAM`, errorCode: 'bet_too_small' };
  }
  if (amount > round.maxBet) {
    return { error: `Максимальная ставка ${round.maxBet.toFixed(0)} GRAM`, errorCode: 'bet_too_big' };
  }

  let validatedGift: ArenaParticipant['gift'];
  let contribution = amount;

  if (hasGift) {
    const invItem = (user.inventory || []).find((i: any) =>
      (opts.gift.uniqueId && i.uniqueId === opts.gift.uniqueId) || (opts.gift.id && i.id === opts.gift.id)
    );
    if (!invItem) return { error: 'Предмет не найден в инвентаре', errorCode: 'nft_not_found' };
    if (invItem.isWithdrawing) return { error: 'Предмет уже используется', errorCode: 'nft_already_used' };
    const normalized: ArenaParticipant['gift'] = normalizeGift(invItem);
    const value = Number(normalized?.floor_price_gram || 0);
    if (value <= 0) return { error: 'Не удалось определить стоимость предмета', errorCode: 'nft_no_price' };
    if (value > round.maxBet) return { error: `Максимальная стоимость NFT ${round.maxBet.toFixed(0)} GRAM`, errorCode: 'bet_too_big' };
    contribution = Number((amount + value).toFixed(2));
    validatedGift = normalized;
  }

  if (contribution <= 0) {
    return { error: 'Укажите сумму ставки', errorCode: 'bet_empty' };
  }

  // списание средств
  let balance = user.balance;
  let inventory = user.inventory || [];
  if (amount > 0) {
    if (amount > user.balance) {
      return { error: 'Недостаточно средств', errorCode: 'insufficient_balance' };
    }
    balance = Number((user.balance - amount).toFixed(2));
  }
  if (hasGift) {
    inventory = inventory.filter((i: any) =>
      !(validatedGift!.uniqueId && i.uniqueId === validatedGift!.uniqueId)
    );
  }
  const turnover = (user.turnover || 0) + contribution;
  saveUserState(userId, balance, inventory, turnover, user.topups);

  const participant: ArenaParticipant = {
    id: `bet-${round.id}-${userId}`,
    userId,
    username: user.username,
    firstName: user.firstName || 'Player',
    avatar: user.photoUrl,
    betAmount: amount,
    gift: validatedGift,
    contribution,
    percentage: 0,
    status: 'ACTIVE',
    joinedAt: Date.now(),
  };
  round.participants.push(participant);
  round.totalPool = Number((round.totalPool + contribution).toFixed(2));
  recomputeShares(round);

  broadcastRound(round);
  broadcastToUser(userId, { type: 'balance', balance, inventory });

  return {
    ok: true,
    round: publicState(round),
    balance,
    inventory,
    code: round.code,
  };
}

function makeInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export function createPrivateArena(
  userId: number,
  opts: { maxPlayers?: number }
): ArenaActionResult {
  tickArenaEngine();
  const user = getUser(userId);
  if (!user) return { error: 'Пользователь не найден', errorCode: 'no_user' };

  // у пользователя не должно быть активной приватной лобби
  for (const r of rounds.values()) {
    if (r.isPrivate && r.creatorId === userId && (r.status === 'WAITING' || r.status === 'ACCEPTING_BETS')) {
      return { error: 'У вас уже есть активная приватная Arena', errorCode: 'private_exists', code: r.code };
    }
  }

  const maxPlayers = Math.min(
    ARENA_LIMITS.MAX_PLAYERS,
    Math.max(ARENA_LIMITS.MIN_PLAYERS, Number(opts.maxPlayers) || ARENA_LIMITS.DEFAULT_MAX_PLAYERS)
  );
  const code = makeInviteCode();
  const round = newRound({ isPrivate: true, code, creatorId: userId, maxPlayers });
  broadcastRound(round);
  return { ok: true, code, round: publicState(round) };
}

// ---------------------------------------------------------------------------
// SSE: push-рассылка в реальном времени
// ---------------------------------------------------------------------------

interface ArenaClient {
  res: express.Response;
  userId: number | null;
  /** подписка: 'public' или 'private:<CODE>' */
  scope: string;
}

const clients = new Set<ArenaClient>();

export function addArenaClient(res: express.Response, userId: number | null, scope: string = 'public') {
  const client: ArenaClient = { res, userId, scope };
  clients.add(client);
  return client;
}

export function removeArenaClient(client: ArenaClient) {
  clients.delete(client);
}

export function arenaClientsCount(): number {
  return clients.size;
}

function send(client: ArenaClient, payload: object) {
  try {
    client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    // пробиваем compression-буфер, если он есть
    (client.res as any).flush?.();
  } catch {
    clients.delete(client);
  }
}

/**
 * Рассылка событий. События состояния уходят только клиентам с той же
 * подпиской (публичный раунд / конкретное приватное лобби),
 * balance — только владельцу, history — всем.
 */
export function broadcast(payload: { type: string; scope?: string; round?: unknown }) {
  for (const c of clients) {
    if (payload.type === 'history') { send(c, payload); continue; }
    if (payload.type === 'balance') { send(c, payload); continue; }
    if (payload.scope && c.scope && payload.scope !== c.scope) continue;
    send(c, payload);
  }
}

export function broadcastToUser(userId: number, payload: object) {
  for (const c of clients) {
    if (c.userId === userId) send(c, payload);
  }
}

// Пинг, чтобы соединение не рвалось на прокси
setInterval(() => {
  for (const c of clients) {
    try {
      c.res.write(': ping\n\n');
      (c.res as any).flush?.();
    } catch {
      clients.delete(c);
    }
  }
}, 15_000);
