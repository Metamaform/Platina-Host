// 96px cards + 16px gap. Start in the middle, with a full runway on both sides.
export const CASE_REEL_LENGTH = 65;
export const CASE_REEL_START = 32;
export const CASE_REEL_WINNER = 58;
export const CASE_SPIN_MS = 5000;
export function caseReelOffset(index: number, jitter = 0): number {
  return -(index * 112 + 48) + Math.max(-30, Math.min(30, jitter));
}
