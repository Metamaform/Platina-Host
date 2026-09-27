import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, X, ChevronRight, ShieldCheck, History, Users, Settings } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { GramIcon } from './GramIcon';
import { NftSelectorGrid } from './NftSelectorGrid';
import { cleanNftName } from '../lib/nftUtils';
import { PremiumImage } from './PremiumImage';
import { BetHistoryModal, BetHistoryRecord } from './BetHistoryModal';
import { GameRoundInfoModal } from './GameRoundInfoModal';

export interface PlinkoProps {
  onBack: () => void;
  inventory?: any[];
  setInventory?: (inv: any[] | ((prev: any[]) => any[])) => void;
  balance?: number;
  setBalance?: (b: number | ((prev: number) => number)) => void;
  onTurnover?: (amt: number) => void;
  onWin?: (amt: number, mode: 'gram' | 'nft', item?: any, mult?: number) => void;
  giftsDb?: any[];
  user?: any;
  token?: string | null;
}

export type RiskLevel = 'low' | 'medium' | 'high';

const BUCKET_CONFIGS: Record<RiskLevel, number[]> = {
  low: [5.6, 2.1, 1.2, 1.0, 0.7, 1.0, 1.2, 2.1, 5.6],
  medium: [13.0, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.0],
  high: [29.0, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.0]
};

interface DropHistoryItem {
  id: string;
  userId: number;
  firstName: string;
  username?: string;
  photoUrl?: string;
  betAmount: number;
  mode: 'gram' | 'nft';
  multiplier: number;
  isWon: boolean;
  winAmount: number;
  gift?: any;
  remainder?: number;
  timestamp: number;
  risk?: RiskLevel;
  path?: number[];
  targetBucket?: number;
  targetRtp?: number;
  isLuckyBoost?: boolean;
  serverSeedHash?: string;
  clientSeed?: string;
}

interface TrajectorySegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  apexHeight: number;
  /** Lateral bow of the arc (px) — keeps the ball clear of pegs while bouncing */
  bowX: number;
  durationMs: number;
  pegIndex?: number;
  isLast?: boolean;
}

interface PhysicsBall {
  id: string;
  x: number;
  y: number;
  rotation: number;
  squish: number;
  segments: TrajectorySegment[];
  currentSegment: number;
  segmentStartTime: number;
  targetBucket: number;
  betAmount: number;
  betGift?: any;
  mode: 'gram' | 'nft';
  risk: RiskLevel;
  targetRtp: number;
  isLuckyBoost: boolean;
  path: number[];
  settled: boolean;
}

const BOARD_WIDTH = 380;
const BOARD_HEIGHT = 390;
const ROWS = 8;
const START_Y = 46;
const ROW_GAP = 34;
const PIN_SPACING = 32;
const BALL_RADIUS = 9.0;
const PIN_RADIUS = 3.5;
const R_CONTACT = BALL_RADIUS + PIN_RADIUS + 0.3; // strictly outside peg perimeter
// Collision-normalized minimum: ball center never gets closer than this to any peg
const R_MIN = BALL_RADIUS + PIN_RADIUS + 0.25;
const R_MIN_SQ = R_MIN * R_MIN;
// Contact point on a peg: top rim, rotated toward the side the ball deflects to
const CONTACT_THETA = 0.45;
const CONTACT_DX = R_CONTACT * Math.sin(CONTACT_THETA);
const CONTACT_DY = -R_CONTACT * Math.cos(CONTACT_THETA);
// Flight speed used to normalize segment durations (~constant speed per drop)
const FLIGHT_SPEED_PX_PER_MS = 0.19;
const BUCKET_Y = START_Y + ROWS * ROW_GAP + 14;
const TOTAL_PEGS = 52; // 3+4+5+6+7+8+9+10 = 52

// Peg index in flat array: (r * (r + 5)) / 2 + c
const getPegIndex = (r: number, c: number): number => {
  return ((r * (r + 5)) >> 1) + c;
};

let dropIdCounter = 0;
const generateDropId = () => `PLK-${Date.now().toString(36).toUpperCase()}-${++dropIdCounter}`;

// Calculate exact probability distribution for Plinko buckets matching target RTP
function getRtpBucketProbabilities(risk: RiskLevel, targetRtp: number): number[] {
  const mults = BUCKET_CONFIGS[risk];
  const binomial = [1, 8, 28, 56, 70, 56, 28, 8, 1]; // 8-row binomial distribution

  let low = -3.0;
  let high = 3.0;
  let bestProbs = binomial.map(b => b / 256);

  for (let iter = 0; iter < 24; iter++) {
    const alpha = (low + high) / 2;
    const weights = binomial.map((b, i) => b * Math.exp(-alpha * mults[i]));
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (sumW <= 0) break;
    const probs = weights.map(w => w / sumW);
    const currentRtp = probs.reduce((sum, p, i) => sum + p * mults[i], 0);

    bestProbs = probs;
    if (Math.abs(currentRtp - targetRtp) < 0.0005) break;

    if (currentRtp > targetRtp) {
      low = alpha;
    } else {
      high = alpha;
    }
  }

  return bestProbs;
}

// Select bucket and generate physical path matching target RTP
function selectRtpBucketAndPath(risk: RiskLevel, targetRtp: number): { targetBucket: number; path: number[] } {
  const probs = getRtpBucketProbabilities(risk, targetRtp);
  const rand = Math.random();
  let cum = 0;
  let targetBucket = 4; // center fallback

  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (rand <= cum || i === probs.length - 1) {
      targetBucket = i;
      break;
    }
  }

  // Generate binary path (array of 8 elements) with exactly targetBucket ones
  const path: number[] = new Array(8).fill(0);
  for (let i = 0; i < targetBucket; i++) {
    path[i] = 1;
  }
  // Fisher-Yates shuffle for organic random left/right sequence
  for (let i = path.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = path[i];
    path[i] = path[j];
    path[j] = temp;
  }

  return { targetBucket, path };
}

export const Plinko: React.FC<PlinkoProps> = ({
  onBack,
  inventory = [],
  setInventory,
  balance = 0,
  setBalance,
  onTurnover,
  onWin,
  giftsDb = [],
  user,
  token
}) => {
  const { t } = useTranslation();
  const effectiveToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('pg_session_token') : null);

  // Active gifts list with automatic fallback
  const [activeGiftsDb, setActiveGiftsDb] = useState<any[]>(giftsDb || []);
  useEffect(() => {
    if (giftsDb && giftsDb.length > 0) {
      setActiveGiftsDb(giftsDb);
    } else {
      fetch('/api/gifts')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setActiveGiftsDb(data);
          }
        })
        .catch(() => {});
    }
  }, [giftsDb]);

  // Prop refs to avoid stale closures
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;

  const activeGiftsDbRef = useRef(activeGiftsDb);
  activeGiftsDbRef.current = activeGiftsDb;

  const userRef = useRef(user);
  userRef.current = user;

  const setBalanceRef = useRef(setBalance);
  setBalanceRef.current = setBalance;

  const setInventoryRef = useRef(setInventory);
  setInventoryRef.current = setInventory;

  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;

  const effectiveTokenRef = useRef(effectiveToken);
  effectiveTokenRef.current = effectiveToken;

  const MIN_BET_GRAM = 0.1;
  const MAX_BET_GRAM = 7000;

  // Personal user multiplier history (saved per user, strictly personal)
  const userStorageKey = `plinko_user_history_${user?.id || 'me'}`;
  const [userHistory, setUserHistory] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const recordUserMultiplier = (mult: number) => {
    setUserHistory(prev => {
      const next = [mult, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Personal user full games history (last 50 games for transparency)
  const userGamesKey = `plinko_user_games_${user?.id || 'me'}`;
  const [userGames, setUserGames] = useState<DropHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(userGamesKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 50);
      }
    } catch {}
    return [];
  });

  const recordUserGame = (gameItem: DropHistoryItem) => {
    setUserGames(prev => {
      const next = [gameItem, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(userGamesKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [showBetHistory, setShowBetHistory] = useState<boolean>(false);
  const [showRoundInfo, setShowRoundInfo] = useState<boolean>(false);

  const userPlinkoBetHistory: BetHistoryRecord[] = useMemo(() => {
    return userGames.map((g, idx) => {
      const isWon = g.multiplier >= 1.0;
      const profit = isWon ? Math.max(0, g.winAmount - g.betAmount) : g.betAmount;
      return {
        id: `${930000 + (idx * 17 + 104) % 65000}`,
        roundId: `${931000 + (idx * 23 + 2) % 65000}`,
        timestamp: g.timestamp,
        betAmount: g.betAmount,
        mode: g.mode,
        gift: g.gift,
        multiplier: g.multiplier,
        winAmount: g.winAmount,
        isWon,
        payoutGram: g.mode === 'gram' ? g.winAmount : (g.remainder || 0),
        payoutItem: g.gift?.name || (g.mode === 'nft' ? 'NFT' : '-'),
        cashoutType: `Корзина #${g.targetBucket ?? 4}`,
        cashoutMult: g.multiplier,
        acceptedAt: g.multiplier,
        crashMult: g.multiplier,
        balanceBefore: balance + (isWon ? -profit : g.betAmount),
        balanceAfter: balance
      };
    });
  }, [userGames, balance]);

  // Betting state
  const [showBetModal, setShowBetModal] = useState(false);
  const [mode, setMode] = useState<'gram' | 'nft'>(() => {
    try {
      return (localStorage.getItem('plinko_mode') as 'gram' | 'nft') || 'gram';
    } catch {
      return 'gram';
    }
  });
  const [betInput, setBetInput] = useState<string>(() => {
    try {
      return localStorage.getItem('plinko_bet') || '5';
    } catch {
      return '5';
    }
  });
  const betGram = parseFloat(betInput) || 0;
  const [selectedNft, setSelectedNft] = useState<any>(null);

  useEffect(() => {
    setSelectedNft((prev: any) => (prev && inventory.some(i => (i.uniqueId || i.id) === (prev.uniqueId || prev.id) && !i.isWithdrawing) ? prev : null));
  }, [inventory]);

  const [risk, setRisk] = useState<RiskLevel>(() => {
    try {
      return (localStorage.getItem('plinko_risk') as RiskLevel) || 'high';
    } catch {
      return 'high';
    }
  });

  const riskRef = useRef<RiskLevel>(risk);
  riskRef.current = risk;

  useEffect(() => {
    try {
      localStorage.setItem('plinko_mode', mode);
      localStorage.setItem('plinko_bet', betInput);
      localStorage.setItem('plinko_risk', risk);
    } catch {}
  }, [mode, betInput, risk]);

  // Drop status: strictly 1 ball at a time
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Inline latest drop banner (clean non-blocking feedback)
  const [lastBanner, setLastBanner] = useState<{
    text: string;
    subText?: string;
    isWon: boolean;
  } | null>(null);

  // Preload user avatar image for canvas rendering (without crossOrigin to prevent Telegram CDN CORS blockage)
  const avatarImgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (user?.photoUrl) {
      const img = new Image();
      img.src = user.photoUrl;
      img.onload = () => {
        avatarImgRef.current = img;
      };
    }
  }, [user?.photoUrl]);

  // Shared/global drop history (live drops feed, max 50)
  const [dropHistory, setDropHistory] = useState<DropHistoryItem[]>([
    {
      id: 'PLK-DEMO-1',
      userId: 991,
      firstName: 'Alex',
      betAmount: 10,
      mode: 'gram',
      multiplier: 4.0,
      isWon: true,
      winAmount: 40,
      timestamp: Date.now() - 15000,
      risk: 'high',
      targetBucket: 7,
      targetRtp: 0.95,
      serverSeedHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      clientSeed: 'tg:991'
    },
    {
      id: 'PLK-DEMO-2',
      userId: 992,
      firstName: 'CryptoWhale',
      betAmount: 50,
      mode: 'gram',
      multiplier: 29.0,
      isWon: true,
      winAmount: 1450,
      timestamp: Date.now() - 45000,
      risk: 'high',
      targetBucket: 8,
      targetRtp: 0.97,
      isLuckyBoost: true,
      serverSeedHash: 'sha256:cb8379ac2098aa165029e3938a51da0bcecfc008fd0097f47617ecd45ed5e21e',
      clientSeed: 'tg:992'
    },
    {
      id: 'PLK-DEMO-3',
      userId: 993,
      firstName: 'Elena',
      betAmount: 25,
      mode: 'gram',
      multiplier: 0.3,
      isWon: false,
      winAmount: 7.5,
      timestamp: Date.now() - 75000,
      risk: 'high',
      targetBucket: 3,
      targetRtp: 0.95,
      serverSeedHash: 'sha256:38b36e4f3f094f3fe852c083818e69882a201f92e92ec4ad076cc5c2195f4e66',
      clientSeed: 'tg:993'
    }
  ]);

  // Helper: X position for a given pin (row, col)
  const getPegX = useCallback((r: number, c: number) => {
    const pinCount = r + 3;
    const rowWidth = (pinCount - 1) * PIN_SPACING;
    const startX = (BOARD_WIDTH - rowWidth) / 2;
    return startX + c * PIN_SPACING;
  }, []);

  const getPegY = useCallback((r: number) => {
    return START_Y + r * ROW_GAP;
  }, []);

  // Generate all pegs for the board (memoized)
  const pegs = useMemo(() => {
    const list: { index: number; row: number; col: number; x: number; y: number; key: string }[] = [];
    for (let r = 0; r < ROWS; r++) {
      const pinCount = r + 3;
      for (let c = 0; c < pinCount; c++) {
        list.push({
          index: getPegIndex(r, c),
          row: r,
          col: c,
          x: getPegX(r, c),
          y: getPegY(r),
          key: `peg-${r}-${c}`
        });
      }
    }
    return list;
  }, [getPegX, getPegY]);

  // Helper: X position of bucket index (0 to 8)
  const getBucketX = useCallback((bucketIdx: number) => {
    const bucketWidth = 36;
    const totalWidth = 9 * bucketWidth;
    const startX = (BOARD_WIDTH - totalWidth) / 2;
    return startX + bucketIdx * bucketWidth + bucketWidth / 2;
  }, []);

  // Precomputed Buckets UI metrics
  const buckets = useMemo(() => {
    const bucketWidth = 36;
    const bucketHeight = 26;
    const totalWidth = 9 * bucketWidth;
    const startX = (BOARD_WIDTH - totalWidth) / 2;
    const mults = BUCKET_CONFIGS[risk];

    return mults.map((mult, idx) => {
      const x = startX + idx * bucketWidth + bucketWidth / 2;
      const left = startX + idx * bucketWidth;

      let textColor = '#22c55e';
      let bgStyle = 'rgba(34, 197, 94, 0.16)';
      let borderStyle = 'rgba(34, 197, 94, 0.4)';

      if (mult >= 20) {
        textColor = '#f59e0b';
        bgStyle = 'rgba(245, 158, 11, 0.22)';
        borderStyle = 'rgba(245, 158, 11, 0.6)';
      } else if (mult >= 10) {
        textColor = '#d946ef';
        bgStyle = 'rgba(217, 70, 239, 0.2)';
        borderStyle = 'rgba(217, 70, 239, 0.5)';
      } else if (mult >= 3.0) {
        textColor = '#06b6d4';
        bgStyle = 'rgba(6, 182, 212, 0.18)';
        borderStyle = 'rgba(6, 182, 212, 0.45)';
      } else if (mult < 1.0) {
        textColor = '#ef4444';
        bgStyle = 'rgba(239, 68, 68, 0.14)';
        borderStyle = 'rgba(239, 68, 68, 0.35)';
      }

      return {
        idx,
        multiplier: mult,
        label: mult >= 10 ? `${mult.toFixed(0)}x` : `${mult.toFixed(1)}x`,
        x,
        left,
        y: BUCKET_Y,
        width: bucketWidth,
        height: bucketHeight,
        textColor,
        bgStyle,
        borderStyle
      };
    });
  }, [risk]);

  const bucketsRef = useRef(buckets);
  bucketsRef.current = buckets;

  // Build a smooth, deterministic ballistic trajectory for the entire drop.
  // Collision-normalized: every arc is relaxed so the ball never enters a peg —
  // contacts touch the peg rim (R_CONTACT) and all in-between flight keeps at
  // least R_MIN clearance. Segments are quadratic arcs (lateral bow + apex).
  const buildTrajectory = useCallback((path: number[], targetBucket: number): TrajectorySegment[] => {
    // Funnel apex (drop entry)
    const funnelX = BOARD_WIDTH / 2;
    const funnelY = 14;

    // Peg columns hit: row 0 -> col 1 (center of 3 pins); path[r] = 1 steps
    // right into the next staggered row, path[r] = 0 steps left.
    const cols = new Array<number>(ROWS);
    cols[0] = 1;
    for (let r = 0; r < ROWS - 1; r++) {
      cols[r + 1] = cols[r] + (path[r] === 1 ? 1 : 0);
    }

    // The ball contacts each peg on the side it deflects to, so bounces never
    // cut through the peg they just hit. Last peg contacts on the bucket side.
    const sides = new Array<number>(ROWS);
    for (let r = 0; r < ROWS - 1; r++) {
      sides[r] = path[r] === 1 ? 1 : -1;
    }
    const lastPegX = getPegX(ROWS - 1, cols[ROWS - 1]);
    const bucketX = getBucketX(targetBucket);
    sides[ROWS - 1] = bucketX >= lastPegX ? 1 : -1;

    // Waypoints: funnel -> peg contacts (rows 0..ROWS-1) -> bucket
    const pts: { x: number; y: number; pegIndex?: number }[] = [{ x: funnelX, y: funnelY }];
    for (let r = 0; r < ROWS; r++) {
      const px = getPegX(r, cols[r]);
      const py = getPegY(r);
      pts.push({
        x: px + sides[r] * CONTACT_DX,
        y: py + CONTACT_DY,
        pegIndex: getPegIndex(r, cols[r])
      });
    }
    const targetBucketY = BUCKET_Y + 4;
    pts.push({ x: bucketX, y: targetBucketY });

    const segments: TrajectorySegment[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const seg: TrajectorySegment = {
        x0: pts[i].x,
        y0: pts[i].y,
        x1: pts[i + 1].x,
        y1: pts[i + 1].y,
        apexHeight: 6.0,
        bowX: 0,
        durationMs: 0,
        pegIndex: pts[i + 1].pegIndex,
        isLast: i === pts.length - 2
      };

      // Pegs that could possibly interfere with this arc
      const minX = Math.min(seg.x0, seg.x1) - 30;
      const maxX = Math.max(seg.x0, seg.x1) + 30;
      const minY = Math.min(seg.y0, seg.y1) - 50;
      const maxY = Math.max(seg.y0, seg.y1) + 30;
      const near: { x: number; y: number }[] = [];
      for (let pi = 0; pi < TOTAL_PEGS; pi++) {
        const peg = pegs[pi];
        if (peg.x >= minX && peg.x <= maxX && peg.y >= minY && peg.y <= maxY) near.push(peg);
      }

      // Relax the arc away from any peg it would intersect. Endpoints (the peg
      // contacts themselves) stay fixed — only the bow/apex are nudged.
      const sampleArc = (p: number) => {
        const q = 4 * p * (1 - p);
        return {
          x: seg.x0 + (seg.x1 - seg.x0) * p + q * seg.bowX,
          y: seg.y0 + (seg.y1 - seg.y0) * p - q * seg.apexHeight
        };
      };
      for (let iter = 0; iter < 40; iter++) {
        let worstD = Infinity;
        let worstP = 0.5;
        let worstPeg: { x: number; y: number } | null = null;
        for (let k = 1; k < 48; k++) {
          const p = k / 48;
          const s = sampleArc(p);
          for (let ni = 0; ni < near.length; ni++) {
            const dx = s.x - near[ni].x;
            const dy = s.y - near[ni].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < worstD) {
              worstD = d;
              worstP = p;
              worstPeg = near[ni];
            }
          }
        }
        if (worstD >= R_MIN || !worstPeg) break;
        const s = sampleArc(worstP);
        const dx = s.x - worstPeg.x;
        const dy = s.y - worstPeg.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-6);
        const need = R_MIN - d + 0.15;
        const lev = Math.max(4 * worstP * (1 - worstP), 0.12);
        seg.bowX += (dx / d) * need * (1.35 / lev);
        seg.apexHeight += -(dy / d) * need * (1.35 / lev);
        const bow = Math.hypot(seg.bowX, seg.apexHeight);
        if (bow > 42) {
          seg.bowX *= 42 / bow;
          seg.apexHeight *= 42 / bow;
        }
      }

      // Normalize flight speed: duration proportional to arc length
      let arcLen = 0;
      let px = seg.x0;
      let py = seg.y0;
      for (let k = 1; k <= 16; k++) {
        const s = sampleArc(k / 16);
        arcLen += Math.hypot(s.x - px, s.y - py);
        px = s.x;
        py = s.y;
      }
      seg.durationMs = Math.min(340, Math.max(115, arcLen / FLIGHT_SPEED_PX_PER_MS));

      segments.push(seg);
    }

    return segments;
  }, [getPegX, getPegY, getBucketX, pegs]);

  // Handle completed ball landing: grant NFT on ANY multiplier (including <= 1.0x) with remainder (>= 0.00) to balance
  const onBallCompleted = useCallback((ball: PhysicsBall, bucketIdx: number) => {
    const currentBuckets = bucketsRef.current;
    const mult = currentBuckets[bucketIdx]?.multiplier || 1.0;
    const wonGrams = Number((ball.betAmount * mult).toFixed(2));

    // Update personal user line of multipliers
    recordUserMultiplier(mult);

    // Update personal user casino stats
    const uKey = `plinko_user_casino_stats_${userRef.current?.id || 'me'}`;
    try {
      const uStats = JSON.parse(localStorage.getItem(uKey) || '{"totalBet":0,"totalWon":0,"rounds":0}');
      uStats.totalBet = Number((uStats.totalBet + ball.betAmount).toFixed(2));
      uStats.totalWon = Number((uStats.totalWon + wonGrams).toFixed(2));
      uStats.rounds += 1;
      localStorage.setItem(uKey, JSON.stringify(uStats));
    } catch {}

    // Update global casino stats
    const gKey = 'plinko_global_casino_stats';
    try {
      const gStats = JSON.parse(localStorage.getItem(gKey) || '{"totalBet":50000,"totalWon":46500,"rounds":1200}');
      gStats.totalBet = Number((gStats.totalBet + ball.betAmount).toFixed(2));
      gStats.totalWon = Number((gStats.totalWon + wonGrams).toFixed(2));
      gStats.rounds += 1;
      localStorage.setItem(gKey, JSON.stringify(gStats));
    } catch {}

    // Sort active gifts DB by price ascending
    const sorted = [...activeGiftsDbRef.current]
      .map(g => ({
        ...g,
        priceVal: Number(g.floor_price_gram || g.price || 0)
      }))
      .filter(g => g.priceVal > 0)
      .sort((a, b) => a.priceVal - b.priceVal);

    // Only grant NFT if wonGrams is high enough to afford at least the cheapest NFT (wonGrams >= sorted[0].priceVal)
    let chosenGift: any = null;
    let remainder = 0;

    if (sorted.length > 0 && wonGrams >= sorted[0].priceVal) {
      // Find highest gift affordable with wonGrams
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].priceVal <= wonGrams) {
          chosenGift = sorted[i];
          break;
        }
      }
    }

    let nextInventory = inventoryRef.current || [];
    let nextBalance = balanceRef.current;

    if (chosenGift) {
      const giftPrice = chosenGift.priceVal;
      // Remainder is strictly not less than 0.00
      remainder = Math.max(0, Number((wonGrams - giftPrice).toFixed(2)));

      const finalGift = {
        ...chosenGift,
        uniqueId: `nft-plinko-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      };

      nextInventory = [
        finalGift,
        ...nextInventory.filter(i => (i.uniqueId || i.id) !== (ball.betGift?.uniqueId || ball.betGift?.id))
      ];

      if (remainder > 0) {
        nextBalance = Number((nextBalance + remainder).toFixed(2));
      }

      if (setInventoryRef.current) {
        setInventoryRef.current(nextInventory);
      }

      if (setBalanceRef.current) {
        setBalanceRef.current(nextBalance);
      }

      if (onWinRef.current) {
        onWinRef.current(wonGrams, 'nft', finalGift, mult);
      }

      setLastBanner({
        text: mult <= 1.0
          ? `Выдан ${cleanNftName(finalGift.name)} (x${mult.toFixed(2)})`
          : `Выигран ${cleanNftName(finalGift.name)}! (x${mult.toFixed(2)})`,
        subText: remainder > 0 ? `+ остаток ${remainder.toFixed(2)} GRAM на баланс` : 'Остаток: 0.00 GRAM',
        isWon: mult >= 1.0
      });

      chosenGift = finalGift;
    } else {
      // Winnings are below cheapest NFT price -> full wonGrams credited to GRAM balance (no free NFT given!)
      remainder = 0;
      nextBalance = Number((nextBalance + wonGrams).toFixed(2));

      if (ball.betGift) {
        nextInventory = nextInventory.filter(i => (i.uniqueId || i.id) !== (ball.betGift?.uniqueId || ball.betGift?.id));
        if (setInventoryRef.current) {
          setInventoryRef.current(nextInventory);
        }
      }

      if (setBalanceRef.current) {
        setBalanceRef.current(nextBalance);
      }

      if (onWinRef.current) {
        onWinRef.current(wonGrams, 'gram', undefined, mult);
      }

      setLastBanner({
        text: mult >= 1.0
          ? `Выигрыш: +${wonGrams.toFixed(2)} GRAM (x${mult.toFixed(2)})`
          : `Результат: +${wonGrams.toFixed(2)} GRAM (x${mult.toFixed(2)})`,
        subText: mult < 1.0 ? `Ставка: ${ball.betAmount.toFixed(2)} GRAM` : undefined,
        isWon: mult >= 1.0
      });
    }

    // Sync with server if session available
    if (effectiveTokenRef.current) {
      fetch('/api/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveTokenRef.current}`
        },
        body: JSON.stringify({
          balance: nextBalance,
          inventory: nextInventory
        })
      }).catch(() => {});
    }

    const dropItem: DropHistoryItem = {
      id: generateDropId(),
      userId: userRef.current?.id || 1,
      firstName: userRef.current?.firstName || 'Вы',
      username: userRef.current?.username,
      photoUrl: userRef.current?.photoUrl,
      betAmount: ball.betAmount,
      mode: ball.mode,
      multiplier: mult,
      isWon: mult >= 1.0,
      winAmount: wonGrams,
      gift: chosenGift,
      remainder,
      timestamp: Date.now(),
      risk: ball.risk,
      path: ball.path,
      targetBucket: bucketIdx,
      targetRtp: ball.targetRtp,
      isLuckyBoost: ball.isLuckyBoost,
      serverSeedHash: `sha256:plk-${Date.now().toString(36)}-${mult.toFixed(2)}`,
      clientSeed: `tg:${userRef.current?.id || 'guest'}`
    };

    // Record to personal games history (max 50)
    recordUserGame(dropItem);

    // Record to shared drop history table (max 50)
    setDropHistory(prev => [dropItem, ...prev.slice(0, 49)]);

    // Re-enable drop button immediately
    setIsDropping(false);
  }, []);

  const onBallCompletedRef = useRef(onBallCompleted);
  onBallCompletedRef.current = onBallCompleted;

  // --- High Performance Canvas Engine (Single Continuous Loop, Zero Allocations) ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeBallRef = useRef<PhysicsBall | null>(null);

  // Flat Float32Arrays for zero garbage collection during flight
  const pegGlowsRef = useRef(new Float32Array(TOTAL_PEGS));
  const bucketBouncesRef = useRef(new Float32Array(9));

  // Ring buffer for trail positions (0 object allocations per frame)
  const trailXRef = useRef(new Float32Array(6));
  const trailYRef = useRef(new Float32Array(6));
  const trailHeadRef = useRef(0);
  const trailCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions once with high-DPI scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = BOARD_WIDTH * dpr;
    canvas.height = BOARD_HEIGHT * dpr;

    let animId: number;
    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const now = performance.now();
      const pegGlows = pegGlowsRef.current;
      const bucketBounces = bucketBouncesRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // 1. Decay peg glows (flat array, zero allocations)
      for (let i = 0; i < TOTAL_PEGS; i++) {
        if (pegGlows[i] > 0.02) {
          pegGlows[i] *= 0.88;
        } else {
          pegGlows[i] = 0;
        }
      }

      // 2. Decay bucket bounces (flat array, zero allocations)
      for (let i = 0; i < 9; i++) {
        if (bucketBounces[i] > 0.02) {
          bucketBounces[i] *= 0.85;
        } else {
          bucketBounces[i] = 0;
        }
      }

      // 3. Draw Pegs with soft lighting
      for (let i = 0; i < pegs.length; i++) {
        const peg = pegs[i];
        const glow = pegGlows[peg.index];

        if (glow > 0.05) {
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, PIN_RADIUS + (1 - glow) * 8 + 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${glow * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = glow > 0.05 ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
      }

      // 4. Draw Buckets
      const currentBuckets = bucketsRef.current;
      for (let i = 0; i < currentBuckets.length; i++) {
        const b = currentBuckets[i];
        const bounce = bucketBounces[i];
        const scale = 1 + bounce * 0.12;

        ctx.save();
        ctx.translate(b.x, b.y + b.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-b.x, -(b.y + b.height / 2));

        const radius = 6;
        ctx.beginPath();
        ctx.roundRect(b.left + 1, b.y, b.width - 2, b.height, radius);
        ctx.fillStyle = bounce > 0.05 ? '#ffffff' : b.bgStyle;
        ctx.fill();

        ctx.strokeStyle = bounce > 0.05 ? '#ffffff' : b.borderStyle;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = bounce > 0.05 ? '#000000' : b.textColor;
        ctx.fillText(b.label, b.x, b.y + b.height / 2);

        ctx.restore();
      }

      // 5. Update Ball Physics (Exact timestamp progression, 0 allocations)
      const ball = activeBallRef.current;
      let completedBall: { ball: PhysicsBall; bucketIdx: number } | null = null;

      if (ball && !ball.settled) {
        const seg = ball.segments[ball.currentSegment];
        if (seg) {
          const elapsed = now - ball.segmentStartTime;
          const progress = Math.min(1.0, elapsed / seg.durationMs);

          // Quadratic arc interpolation (lateral bow + vertical apex)
          const bow = 4 * progress * (1 - progress);
          ball.x = seg.x0 + (seg.x1 - seg.x0) * progress + bow * seg.bowX;
          ball.y = seg.y0 + (seg.y1 - seg.y0) * progress - bow * seg.apexHeight;

          // Collision normalization: keep the ball strictly outside every peg
          for (let pi = 0; pi < TOTAL_PEGS; pi++) {
            const dx = ball.x - pegs[pi].x;
            const dy = ball.y - pegs[pi].y;
            const dSq = dx * dx + dy * dy;
            if (dSq < R_MIN_SQ && dSq > 1e-6) {
              const d = Math.sqrt(dSq);
              const push = (R_MIN - d) / d;
              ball.x += dx * push;
              ball.y += dy * push;
            }
          }

          const dir = seg.x1 >= seg.x0 ? 1 : -1;
          ball.rotation += dir * 0.08;

          if (ball.squish < 1.0) {
            ball.squish = Math.min(1.0, ball.squish + 0.05);
          }

          // Record trail into ring buffer
          const head = trailHeadRef.current;
          trailXRef.current[head] = ball.x;
          trailYRef.current[head] = ball.y;
          trailHeadRef.current = (head + 1) % 6;
          if (trailCountRef.current < 6) trailCountRef.current++;

          // Arrival at peg or bucket
          if (progress >= 1.0) {
            if (seg.pegIndex !== undefined) {
              pegGlows[seg.pegIndex] = 1.0;
              ball.squish = 0.86;
              try {
                (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
              } catch {}
            }

            if (seg.isLast) {
              ball.settled = true;
              bucketBounces[ball.targetBucket] = 1.0;
              completedBall = { ball, bucketIdx: ball.targetBucket };
            } else {
              ball.currentSegment++;
              ball.segmentStartTime = ball.segmentStartTime + seg.durationMs;
            }
          }
        }

        // Draw Trail from Ring Buffer
        const count = trailCountRef.current;
        const h = trailHeadRef.current;
        for (let i = 0; i < count; i++) {
          const idx = (h - count + i + 6) % 6;
          const px = trailXRef.current[idx];
          const py = trailYRef.current[idx];
          const alpha = ((i + 1) / count) * 0.22;
          ctx.beginPath();
          ctx.arc(px, py, BALL_RADIUS * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
          ctx.fill();
        }

        // Draw Avatar Disc with Rotation and subtle impact squish
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.rotation);
        const scaleX = 1 + (1 - ball.squish);
        const scaleY = ball.squish;
        ctx.scale(scaleX, scaleY);

        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const avatarImg = avatarImgRef.current;
        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
          ctx.drawImage(
            avatarImg,
            -BALL_RADIUS,
            -BALL_RADIUS,
            BALL_RADIUS * 2,
            BALL_RADIUS * 2
          );
        } else {
          const grad = ctx.createLinearGradient(
            -BALL_RADIUS,
            -BALL_RADIUS,
            BALL_RADIUS,
            BALL_RADIUS
          );
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(1, '#d97706');
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const initial = userRef.current?.firstName?.charAt(0) || 'U';
          ctx.fillText(initial, 0, 0);
        }
        ctx.restore();

        // Golden ring border
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // When drop finishes: clear active ball and defer state updates outside RAF
        if (completedBall) {
          activeBallRef.current = null;
          trailCountRef.current = 0;
          const completedData = completedBall;
          setTimeout(() => {
            onBallCompletedRef.current(completedData.ball, completedData.bucketIdx);
          }, 16);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
    };
  }, [pegs]);

  // Handle Bet Submission & Ball Drop (Strictly 1 ball at a time)
  const handleDropBall = () => {
    if (isDropping || activeBallRef.current) return;
    setActionError(null);

    let betValue = 0;
    let betGift: any = null;

    if (mode === 'gram') {
      if (betGram < MIN_BET_GRAM) {
        setActionError(`Минимальная ставка — ${MIN_BET_GRAM} GRAM`);
        return;
      }
      if (betGram > balance) {
        setActionError('Недостаточно GRAM на балансе');
        return;
      }
      if (betGram > MAX_BET_GRAM) {
        setActionError(`Максимальная ставка — ${MAX_BET_GRAM} GRAM`);
        return;
      }
      betValue = betGram;
    } else {
      if (!selectedNft) {
        setActionError('Выберите NFT из инвентаря');
        return;
      }
      betValue = Number(selectedNft.floor_price_gram || selectedNft.price || 0);
      if (betValue > MAX_BET_GRAM) {
        setActionError(`Максимальная ставка в NFT — ${MAX_BET_GRAM} GRAM`);
        return;
      }
      betGift = selectedNft;
      setSelectedNft(null);
    }

    // Deduct bet from balance or inventory
    if (mode === 'gram' && setBalance) {
      setBalance(prev => Number((prev - betValue).toFixed(2)));
    } else if (mode === 'nft' && setInventory && betGift) {
      setInventory(prev => prev.filter(i => (i.uniqueId || i.id) !== (betGift.uniqueId || betGift.id)));
    }
    if (onTurnover) {
      onTurnover(betValue);
    }

    // 1. Calculate target RTP: default 95% for every user
    let targetRtp = 0.95;
    let isLuckyBoost = false;

    // Check project profit from Plinko
    const gKey = 'plinko_global_casino_stats';
    let globalProfit = 3500;
    try {
      const gStats = JSON.parse(localStorage.getItem(gKey) || '{"totalBet":50000,"totalWon":46500,"rounds":1200}');
      globalProfit = gStats.totalBet - gStats.totalWon;
    } catch {}

    // If project is in positive profit:
    // A random player can be granted a lucky 97% RTP boost on this round!
    if (globalProfit > 0) {
      const luckyRoll = Math.random();
      if (luckyRoll < 0.35) {
        targetRtp = 0.97;
        isLuckyBoost = true;
      }
    }

    // Check user's personal historical RTP to keep each user at 95%
    const uKey = `plinko_user_casino_stats_${user?.id || 'me'}`;
    try {
      const uStats = JSON.parse(localStorage.getItem(uKey) || '{"totalBet":0,"totalWon":0,"rounds":0}');
      if (uStats.rounds >= 4 && uStats.totalBet > 0) {
        const userRtp = uStats.totalWon / uStats.totalBet;
        if (userRtp < 0.90) {
          targetRtp = Math.min(0.97, targetRtp + 0.02);
        } else if (userRtp > 1.05 && !isLuckyBoost) {
          targetRtp = Math.max(0.91, targetRtp - 0.04);
        }
      }
    } catch {}

    // 2. Select target bucket and valid physical path matching exact target RTP
    const { targetBucket, path } = selectRtpBucketAndPath(riskRef.current, targetRtp);

    // 3. Pre-compute complete smooth ballistic trajectory
    const segments = buildTrajectory(path, targetBucket);

    // Initial drop starts at the top of the funnel
    const newBall: PhysicsBall = {
      id: `ball-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: BOARD_WIDTH / 2,
      y: 14,
      rotation: 0,
      squish: 1.0,
      segments,
      currentSegment: 0,
      segmentStartTime: performance.now(),
      targetBucket,
      betAmount: betValue,
      betGift,
      mode,
      risk: riskRef.current,
      targetRtp,
      isLuckyBoost,
      path,
      settled: false
    };

    activeBallRef.current = newBall;
    trailCountRef.current = 0;
    trailHeadRef.current = 0;
    setIsDropping(true);
    setShowBetModal(false);
  };

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '.');
    if (/^\d*\.?\d*$/.test(val)) {
      setBetInput(val);
    }
  };

  const setBetAdd = (add: number) => {
    setBetInput((prev) => {
      const cur = parseFloat(prev) || 0;
      return Math.min(balance, Math.max(MIN_BET_GRAM, Number((cur + add).toFixed(2)))).toString();
    });
  };

  const setBetMax = () => {
    setBetInput(Math.min(MAX_BET_GRAM, balance).toFixed(2));
  };

  // Top multiplier strip: strictly personal to user, exact same shape & colors as Rocket
  const topStripMults = useMemo(() => {
    const list: (number | null)[] = [];
    const recent = userHistory.slice(0, 6);
    for (let i = 0; i < 6; i++) {
      list.push(i < recent.length ? recent[i] : null);
    }
    return list;
  }, [userHistory]);

  const activeHistoryList = dropHistory;

  return (
    <div className="h-full w-full flex flex-col bg-canvas text-white relative select-none">
      {/* Top Header Bar */}
      <button
        id="plinko-back-button"
        onClick={onBack}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all hover:bg-white/20 border border-white/5 cursor-pointer z-20"
        title={t('back') || 'Back'}
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">
          Plinko
        </h1>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <div className="flex items-center gap-1.5 bg-white/5 px-3 h-10 rounded-full border border-white/5">
          <span className="text-white font-bold text-[13px]">{balance.toFixed(2)}</span>
          <GramIcon className="w-3.5 h-3.5 text-brand" />
        </div>
        <button
          onClick={() => setShowBetHistory(true)}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all hover:bg-white/20 border border-white/5 cursor-pointer text-white/80 hover:text-white"
          title="История ваших ставок"
        >
          <History className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-[72px] custom-scrollbar">
        <div className="max-w-md mx-auto flex flex-col items-center">

          {/* Personal Multipliers Line (Rocket-style: 6 identical rounded-xl pills, personal to user) */}
          <div className="w-full flex items-center gap-1.5 overflow-hidden select-none pointer-events-none py-1 mb-3">
            {topStripMults.map((hMult, idx) => (
              <div
                key={idx}
                className={`flex-1 text-center py-1.5 px-0.5 rounded-xl text-[12px] font-bold border transition-colors ${
                  hMult === null
                    ? 'bg-white/5 text-white/20 border-white/5'
                    : hMult >= 8.0
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                    : hMult >= 3.0
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : hMult >= 1.2
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/15 text-red-500 border-red-500/30'
                }`}
              >
                {hMult !== null ? `x${hMult.toFixed(2)}` : '—'}
              </div>
            ))}
          </div>

          {/* Clean Canvas Plinko Arena with User Avatar Ball */}
          <div className="w-full relative min-h-[390px] mb-3 rounded-[24px] bg-[#15161b] border border-white/10 overflow-hidden shadow-xl flex items-center justify-center">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* High Performance 2D Physics Canvas */}
            <canvas
              ref={canvasRef}
              style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
              className="select-none pointer-events-none z-10"
            />
          </div>

          {/* Inline Result Banner (Non-blocking notification) */}
          <AnimatePresence>
            {lastBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`w-full p-2.5 mb-2.5 text-xs text-center rounded-xl font-bold flex flex-col items-center border transition-all ${
                  lastBanner.isWon
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/70'
                }`}
              >
                <span>{lastBanner.text}</span>
                {lastBanner.subText && (
                  <span className="text-[11px] opacity-80 mt-0.5">{lastBanner.subText}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Error notification if any */}
          {actionError && (
            <div className="w-full p-2.5 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center rounded-xl font-medium">
              {actionError}
            </div>
          )}

          {/* Controls Bar: Risk selector & Stake summary */}
          <div className="w-full flex items-center gap-2 mb-3">
            <div className="flex bg-[#191a20] p-1 rounded-[16px] border border-white/5 flex-1">
              {(['low', 'medium', 'high'] as RiskLevel[]).map(r => (
                <button
                  key={r}
                  disabled={isDropping}
                  onClick={() => setRisk(r)}
                  className={`flex-1 py-2 rounded-[12px] text-[12px] font-bold uppercase transition-all cursor-pointer disabled:opacity-50 ${
                    risk === r
                      ? 'bg-brand text-black shadow-sm'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              disabled={isDropping}
              onClick={() => setShowBetModal(true)}
              className="px-4 py-2.5 bg-[#191a20] border border-white/10 rounded-[16px] text-[13px] font-bold text-white/80 hover:text-white flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{mode === 'gram' ? `${betGram} G` : (selectedNft?.name ? cleanNftName(selectedNft.name) : 'NFT')}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>
          </div>

          {/* Action Button: Strictly 1 ball at a time */}
          <button
            id="plinko-drop-button"
            disabled={isDropping}
            onClick={handleDropBall}
            className="w-full relative overflow-hidden group rounded-[18px] font-display font-bold text-[17px] tracking-wide active:scale-[0.98] transition-all py-3.5 shadow-[0_0_25px_rgba(255,184,0,0.25)] bg-brand text-black cursor-pointer flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDropping ? (
              <span>Шар в игре...</span>
            ) : (
              <span>Бросить шар ({mode === 'gram' ? `${betGram} GRAM` : 'NFT'})</span>
            )}
          </button>

          {/* Bottom Panel: History of Drops */}
          <div className="w-full mt-6 flex flex-col gap-2.5 pb-8">
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/50" />
                <span className="text-white font-bold text-xs">
                  Все игры ({dropHistory.length})
                </span>
              </div>
            </div>

            {dropHistory.length === 0 ? (
              <div className="w-full py-8 px-4 text-center rounded-[20px] bg-[#16171c] border border-white/5 flex flex-col items-center justify-center">
                <span className="text-white/40 text-sm font-medium">Пока нет бросков</span>
                <span className="text-white/20 text-xs mt-1">Сделайте первый бросок в Plinko!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {dropHistory.map((item, idx) => {
                  const multStr = item.multiplier.toFixed(2);

                  return (
                    <motion.div
                      key={item.id ? `${item.id}-${idx}` : `drop-history-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setShowBetHistory(true)}
                      className="h-16 w-full flex items-center justify-between rounded-2xl px-3.5 bg-[#15161a] border border-white/5 hover:border-white/10 transition-all cursor-pointer select-none active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-white/5 shrink-0 object-cover border border-white/10 flex items-center justify-center overflow-hidden font-bold text-white/80">
                          {item.photoUrl ? (
                            <img src={item.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            item.firstName.charAt(0)
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-white font-medium text-[13px] truncate max-w-[120px]">
                            {item.firstName}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-white/40 mt-0.5">
                            <span>{item.betAmount.toFixed(1)} GRAM</span>
                            <span>•</span>
                            <span>x{multStr}</span>
                            <span>•</span>
                            <span className="capitalize">{item.risk || 'high'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right-side UNIFORM PRIZE CARD: IDENTICAL FIXED SIZE FOR ALL, WITHOUT WIN/LOSS COLORS */}
                      <div className="h-10 min-w-[110px] px-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-end gap-2 shrink-0">
                        {item.gift ? (
                          <>
                            <PremiumImage
                              staticMode={true}
                              src={item.gift.image_url}
                              alt={item.gift.name}
                              className="w-7 h-7 object-contain shrink-0"
                            />
                            <div className="flex flex-col items-end justify-center min-w-0">
                              <span className="text-white text-[12px] font-semibold truncate max-w-[85px] leading-tight">
                                {cleanNftName(item.gift.name)}
                              </span>
                              <span className="text-[10px] text-white/40 leading-tight">
                                +{item.winAmount.toFixed(1)} G
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <GramIcon className="w-4 h-4 text-white/60 shrink-0" />
                            <div className="flex flex-col items-end justify-center min-w-0">
                              <span className="text-white text-[12px] font-semibold leading-tight">
                                +{item.winAmount.toFixed(2)} G
                              </span>
                              <span className="text-[10px] text-white/40 leading-tight">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bet Modal (Mode Selection & Amounts) */}
      <AnimatePresence>
        {showBetModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBetModal(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[110] bg-[#17181e] rounded-t-[32px] p-5 pb-8 flex flex-col shadow-2xl border-t border-white/10 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-8" />
                <h2 className="text-[18px] font-display font-bold text-white text-center">
                  Параметры ставки
                </h2>
                <button
                  onClick={() => setShowBetModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Toggle: Gifts / GRAM */}
              <div className="flex p-1 bg-black/25 rounded-2xl mb-5">
                <button
                  onClick={() => setMode('nft')}
                  className={`flex-1 py-2.5 rounded-[12px] font-medium text-[14px] transition-all cursor-pointer ${
                    mode === 'nft' ? 'bg-brand text-black shadow-sm font-bold' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  {t('gifts')}
                </button>
                <button
                  onClick={() => setMode('gram')}
                  className={`flex-1 py-2.5 rounded-[12px] font-medium text-[14px] transition-all cursor-pointer ${
                    mode === 'gram' ? 'bg-brand text-black shadow-sm font-bold' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  GRAM
                </button>
              </div>

              {/* Mode Body: GRAM or NFT Picker */}
              <div className="bg-[#1f2026] rounded-[20px] p-5 mb-5 flex flex-col items-center justify-center min-h-[120px] border border-white/5 relative">
                {mode === 'gram' ? (
                  <>
                    <div className="absolute top-3.5 left-4 flex items-center gap-1 text-white/50 text-[12px] font-medium">
                      <span>Баланс:</span>
                      <span className="text-white font-bold">{balance.toFixed(2)}</span>
                      <GramIcon className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <div className="relative w-full text-center flex items-center justify-center mb-4 mt-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={betInput}
                        onChange={handleBetChange}
                        className="bg-transparent text-center text-4xl font-display font-bold text-white outline-none w-full max-w-[180px]"
                        placeholder="5.0"
                      />
                    </div>
                    <div className="flex gap-2">
                      {[1, 5, 25, 50].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setBetAdd(amt)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-[13px] font-bold hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
                        >
                          +{amt}
                        </button>
                      ))}
                      <button
                        onClick={setBetMax}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-brand/70 text-[13px] font-bold hover:bg-brand/10 active:scale-95 transition-colors cursor-pointer"
                      >
                        MAX
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full">
                    <NftSelectorGrid
                      inventory={inventory}
                      selectedIds={selectedNft ? [selectedNft.uniqueId || selectedNft.id] : []}
                      onSelect={item => setSelectedNft(item)}
                      maxBetGram={MAX_BET_GRAM}
                      maxContainerHeight="max-h-[280px]"
                      emptyText={t('inventory_empty') || 'Инвентарь пуст'}
                    />
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              <button
                id="plinko-confirm-bet-button"
                onClick={() => {
                  setShowBetModal(false);
                  handleDropBall();
                }}
                disabled={
                  (mode === 'gram' && (betGram < MIN_BET_GRAM || betGram > balance || betGram > MAX_BET_GRAM)) ||
                  (mode === 'nft' && (!selectedNft || Number(selectedNft.floor_price_gram || selectedNft.price || 0) > MAX_BET_GRAM))
                }
                className="w-full bg-brand text-black font-display font-bold text-[17px] py-3.5 rounded-[18px] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(255,184,0,0.2)] cursor-pointer"
              >
                Бросить шар
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bet History Modal matching IMG_0888 */}
      <BetHistoryModal
        isOpen={showBetHistory}
        onClose={() => setShowBetHistory(false)}
        title="История ваших ставок"
        history={userPlinkoBetHistory}
      />

      {/* Game Round Info Modal (gear icon) */}
      <GameRoundInfoModal
        isOpen={showRoundInfo}
        onClose={() => setShowRoundInfo(false)}
        game="plinko"
        roundId={userGames[0]?.id || dropHistory[0]?.id}
        balance={balance}
        timeoutSec={2.0}
        maxPrize={MAX_BET_GRAM * 29}
        minBet={MIN_BET_GRAM}
        maxBet={MAX_BET_GRAM}
        statusText="Сервер онлайн • Готов к броску"
      />
    </div>
  );
};
