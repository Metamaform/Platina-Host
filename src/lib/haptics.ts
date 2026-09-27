/**
 * Centralised Telegram haptic feedback (apple-design §13):
 * causality + harmony + utility. Fire on the real causal event, keep it
 * reserved for meaningful moments, and never let it throw.
 */
type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'success' | 'warning' | 'error';

function tg(): any {
  try {
    return (window as any).Telegram?.WebApp?.HapticFeedback;
  } catch {
    return null;
  }
}

export const haptics = {
  /** Tiny tick for selection changes (tabs, toggles). */
  selection() {
    try {
      tg()?.selectionChanged();
    } catch {}
  },
  /** Physical tap feedback for presses and commits. */
  impact(style: HapticStyle = 'light') {
    try {
      tg()?.impactOccurred(style);
    } catch {}
  },
  /** Causal result feedback (success / warning / error). */
  notify(type: NotificationType) {
    try {
      tg()?.notificationOccurred(type);
    } catch {}
  },
};
