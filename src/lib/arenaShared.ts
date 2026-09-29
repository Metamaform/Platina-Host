/*
  AICE ARENA — общие типы и константы для клиента и сервера.

  Arena — это джекпот-игра: игроки делают ставки (GRAM и/или NFT),
  общий банк делится на доли пропорционально взносам, сервер по
  provably-fair схеме выбирает победителя, который забирает весь банк.
*/

export type ArenaStatus =
  | 'WAITING'         // лобби создано (приватная арена), ждём первую ставку
  | 'ACCEPTING_BETS'  // приём ставок, таймер идёт
  | 'LOCKED'          // ставки закрыты, фиксируем состав
  | 'DRAWING'         // сервер определяет победителя
  | 'COMPLETED'       // победитель определён, выплата произведена
  | 'CANCELLED'       // раунд отменён (ставки возвращены)
  | 'ERROR';          // серверная ошибка (ставки возвращены)

export type ArenaBetStatus = 'ACTIVE' | 'WON' | 'LOST' | 'REFUNDED';

export type ArenaMode = 'STANDARD';

/** Участник Arena (одна ставка). */
export interface ArenaParticipant {
  id: string;              // id ставки
  userId: number;          // telegram id (у ботов отрицательный)
  username?: string;
  firstName?: string;
  avatar?: string;         // photoUrl
  /** денежная часть ставки (GRAM) */
  betAmount: number;
  /** NFT/предмет, добавленный к ставке (если есть) */
  gift?: {
    id?: string;
    uniqueId?: string;
    name?: string;
    image_url?: string;
    lottie_url?: string;
    price?: number;
    floor_price_gram?: number;
    backdrop?: string;
  };
  /** вклад в банк: деньги + стоимость предмета */
  contribution: number;
  /** доля в банке, % (0..100) */
  percentage: number;
  status: ArenaBetStatus;
  joinedAt: number;
  isBot?: boolean;
}

/** Круг состояния раунда, который сервер отдаёт всем клиентам. */
export interface ArenaRoundState {
  id: number;
  mode: ArenaMode;
  status: ArenaStatus;
  createdAt: number;
  /** конец приёма ставок (unix ms) */
  endsAt?: number;
  /** момент завершения (unix ms) */
  completedAt?: number;
  totalPool: number;
  participants: ArenaParticipant[];
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  creatorId?: number;
  /** provably fair: sha256(serverSeed), публикуется с самого начала */
  serverSeedHash: string;
  /** раскрывается после COMPLETED для проверки */
  serverSeed?: string;
  /** выпавшее число [0..1) */
  roll?: number;
  /** билет победителя = roll * totalPool */
  ticket?: number;
  /** id ставки победителя */
  winnerId?: string;
  /** выплата победителю (= totalPool) */
  winAmount?: number;
  serverTime: number;
}

/** Запись в истории завершённых игр. */
export interface ArenaHistoryEntry {
  id: number;
  mode: ArenaMode;
  status: Exclude<ArenaStatus, 'WAITING' | 'ACCEPTING_BETS' | 'LOCKED' | 'DRAWING'>;
  createdAt: number;
  completedAt: number;
  totalPool: number;
  winAmount: number;
  participantsCount: number;
  winner?: {
    id: string;
    userId: number;
    username?: string;
    firstName?: string;
    avatar?: string;
    contribution: number;
    percentage: number;
  };
  participants: ArenaParticipant[];
  serverSeedHash: string;
  serverSeed?: string;
  roll?: number;
  ticket?: number;
}

/** Тайминги жизненного цикла раунда. */
export const ARENA_TIMINGS = {
  /** окно приёма ставок */
  BETTING_MS: 25_000,
  /** пауза «Ставки закрыты» */
  LOCKED_MS: 2_200,
  /** «Определение победителя...» */
  DRAWING_MS: 2_600,
  /** сколько завершённый раунд остаётся на экране */
  COMPLETED_MS: 9_000,
  /** время жизни приватного лобби до первой ставки */
  PRIVATE_WAITING_MS: 30 * 60_000,
} as const;

export const ARENA_LIMITS = {
  MIN_BET: 0.1,
  MAX_BET: 2500,
  DEFAULT_MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
} as const;

export function arenaPercent(contribution: number, totalPool: number): number {
  if (totalPool <= 0) return 0;
  return Math.min(100, (contribution / totalPool) * 100);
}

export function formatArenaAmount(n: number): string {
  return n.toFixed(2);
}

/** Русские формы слова «игрок»: 1 игрок / 2 игрока / 5 игроков. */
export function playersWord(n: number, lang: string = 'ru'): string {
  if (lang !== 'ru') return n === 1 ? 'player' : 'players';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'игрок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'игрока';
  return 'игроков';
}

export function arenaStatusLabel(status: ArenaStatus): string {
  switch (status) {
    case 'WAITING': return 'Ожидание игроков';
    case 'ACCEPTING_BETS': return 'Приём ставок';
    case 'LOCKED': return 'Ставки закрыты';
    case 'DRAWING': return 'Определение победителя';
    case 'COMPLETED': return 'Завершена';
    case 'CANCELLED': return 'Отменён';
    case 'ERROR': return 'Ошибка';
  }
}
