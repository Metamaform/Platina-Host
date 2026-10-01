/*
  useArenaLive — realtime-хук AICE ARENA.

  · подписка на серверный SSE-поток (/api/arena/stream): состояние раунда,
    баланс пользователя и история приходят пушами, без тяжёлого polling;
  · если SSE недоступен — автоматический fallback на лёгкий поллинг
    /api/arena/state (раз в 2.5s) и восстановление соединения;
  · синхронизация часов client↔server для точного таймера;
  · действия игрока (ставка) — обычные POST-запросы.
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArenaRoundState, ArenaHistoryEntry } from '../../lib/arenaShared';

interface HistorySummary {
  id: number;
  totalPool: number;
  participantsCount: number;
  winner: { username?: string; firstName?: string; avatar?: string; photoUrl?: string; userId?: number } | null;
  completedAt: number;
  status: string;
}

interface UseArenaLiveOpts {
  token?: string | null;
  onBalance?: (balance: number, inventory?: any[]) => void;
}

export function useArenaLive({ token, onBalance }: UseArenaLiveOpts) {
  const [round, setRound] = useState<ArenaRoundState | null>(null);
  const [connected, setConnected] = useState(false);
  /** serverTime - Date.now(), чтобы таймер шёл по серверным часам */
  const [serverOffset, setServerOffset] = useState(0);
  const [history, setHistory] = useState<HistorySummary[]>([]);

  const onBalanceRef = useRef(onBalance);
  onBalanceRef.current = onBalance;

  const lastMsgAtRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/arena/state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.serverTime) setServerOffset(Number(data.serverTime) - Date.now());
      if (data.round) setRound(data.round);
      if (Array.isArray(data.history)) setHistory(data.history);
    } catch { /* сеть моргнула — попробуем в следующий тик */ }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/arena/history?limit=30');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.history)) setHistory(data.history);
    } catch { /* ignore */ }
  }, []);

  // --- SSE-подписка (+ fallback polling) ---
  useEffect(() => {
    let disposed = false;
    const url = `/api/arena/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const startPolling = () => {
      if (pollRef.current || disposed) return;
      pollRef.current = setInterval(fetchState, 2500);
    };

    const es = new EventSource(url);

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      // EventSource сам переподключается; на случай недоступности стрима
      // параллельно включаем лёгкий поллинг — он не мешает SSE.
      startPolling();
    };
    es.onmessage = (evt) => {
      let data: any;
      try { data = JSON.parse(evt.data); } catch { return; }
      lastMsgAtRef.current = Date.now();
      setConnected(true);
      stopPolling();

      switch (data.type) {
        case 'hello':
          if (data.serverTime) setServerOffset(Number(data.serverTime) - Date.now());
          break;
        case 'state':
          if (data.round) setRound(data.round);
          break;
        case 'balance':
          if (typeof data.balance === 'number') {
            onBalanceRef.current?.(Number(data.balance), data.inventory);
          }
          break;
        case 'history':
          fetchHistory();
          break;
      }
    };

    return () => {
      disposed = true;
      stopPolling();
      es.close();
    };
  }, [token, fetchState, fetchHistory, stopPolling]);

  // Страховка: если SSE молчит слишком долго (прокси съел соединение) —
  // подтягиваем состояние раз в 6s, пока соединение числится активным.
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (Date.now() - lastMsgAtRef.current > 20_000) {
        lastMsgAtRef.current = Date.now();
        fetchState();
      }
    }, 6000);
    return () => clearInterval(watchdog);
  }, [fetchState]);

  // История подгружается при монтировании вкладки
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // --- Действия ---

  const placeBet = useCallback(async (amount: number, gift?: any) => {
    try {
      const res = await fetch('/api/arena/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount, gift }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false as const, error: data.error || 'Ошибка сервера', errorCode: data.errorCode };
      }
      if (typeof data.balance === 'number') onBalanceRef.current?.(Number(data.balance), data.inventory);
      if (data.round) setRound(data.round);
      return { ok: true as const, round: data.round };
    } catch {
      return { ok: false as const, error: 'Потеря соединения. Попробуйте ещё раз', errorCode: 'network' };
    }
  }, [token]);

  /** ТЕМПОРАРНО: добавить рандомного бота-участника (кнопка для одиночного теста). */
  const addDevBot = useCallback(async () => {
    try {
      const res = await fetch('/api/arena/dev-bot', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false as const, error: data.error || 'Ошибка сервера', errorCode: data.errorCode };
      }
      if (data.round) setRound(data.round);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: 'Потеря соединения. Попробуйте ещё раз', errorCode: 'network' };
    }
  }, []);

  return {
    round,
    connected,
    serverOffset,
    history,
    placeBet,
    addDevBot,
    refreshHistory: fetchHistory,
  };
}

export type { HistorySummary as ArenaHistorySummary };
export type { ArenaHistoryEntry };
