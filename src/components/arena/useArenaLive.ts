/*
  useArenaLive — realtime-хук AICE ARENA.

  · подписка на серверный SSE-поток (/api/arena/stream): состояние раунда,
    баланс пользователя и история приходят пушами, без тяжёлого polling;
  · если SSE недоступен — автоматический fallback на лёгкий поллинг
    /api/arena/state (раз в 2.5s) и восстановление соединения;
  · синхронизация часов client↔server для точного таймера;
  · действия игрока (ставка, приватная арена) — обычные POST-запросы.
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArenaRoundState, ArenaHistoryEntry } from '../../lib/arenaShared';

export type ArenaScope = { kind: 'public' } | { kind: 'private'; code: string };

interface HistorySummary {
  id: number;
  totalPool: number;
  participantsCount: number;
  winner: { username?: string; firstName?: string; avatar?: string } | null;
  completedAt: number;
  status: string;
  isPrivate: boolean;
}

interface UseArenaLiveOpts {
  token?: string | null;
  scope: ArenaScope;
  onBalance?: (balance: number, inventory?: any[]) => void;
  onEvent?: (evt: { kind: string; message?: string }) => void;
}

export function scopeParam(scope: ArenaScope): string | null {
  return scope.kind === 'private' ? scope.code.toUpperCase() : null;
}

export function useArenaLive({ token, scope, onBalance, onEvent }: UseArenaLiveOpts) {
  const [round, setRound] = useState<ArenaRoundState | null>(null);
  const [connected, setConnected] = useState(false);
  /** serverTime - Date.now(), чтобы таймер шёл по серверным часам */
  const [serverOffset, setServerOffset] = useState(0);
  const [history, setHistory] = useState<HistorySummary[]>([]);

  const onBalanceRef = useRef(onBalance);
  onBalanceRef.current = onBalance;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const scopeKey = scope.kind === 'private' ? scope.code.toUpperCase() : 'public';
  const lastMsgAtRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchState = useCallback(async (code: string | null) => {
    try {
      const q = code ? `?code=${encodeURIComponent(code)}` : '';
      const res = await fetch(`/api/arena/state${q}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.serverTime) setServerOffset(Number(data.serverTime) - Date.now());
      if (data.round) {
        // приватное лобби исчезло — сервер вернёт публичный раунд; показываем заглушку
        if (code && data.round.isPrivate === false && String(data.round.code || '').toUpperCase() !== code.toUpperCase()) {
          setRound({ ...data.round, id: -1, status: 'CANCELLED', isPrivate: true, code: code.toUpperCase() });
        } else {
          setRound(data.round);
        }
      }
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
    const code = scopeParam(scope);
    const url = `/api/arena/stream?${code ? `code=${encodeURIComponent(code)}&` : ''}${token ? `token=${encodeURIComponent(token)}` : ''}`;

    const startPolling = () => {
      if (pollRef.current || disposed) return;
      pollRef.current = setInterval(() => fetchState(code), 2500);
    };

    const es = new EventSource(url);
    esRef.current = es;

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
          if (!data.round) break;
          // приватная арена закрылась/завершилась и исчезла — сервер вернёт публичный раунд
          if (data.scope && data.scope.startsWith('private:') && data.round.isPrivate === false && data.round.code == null) {
            if (scopeKey !== 'public') {
              // лобби не найдено — оставляем round=null и показываем заглушку
              setRound({ ...data.round, id: -1, status: 'CANCELLED', isPrivate: true, code: scopeKey });
              break;
            }
          }
          setRound(data.round);
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
      esRef.current = null;
    };
  }, [scopeKey, token, fetchState, fetchHistory, stopPolling, scope]);

  // Страховка: если SSE молчит слишком долго (прокси съел соединение) —
  // подтягиваем состояние раз в 6s, пока соединение числится активным.
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (Date.now() - lastMsgAtRef.current > 20_000) {
        lastMsgAtRef.current = Date.now();
        fetchState(scopeParam(scope));
      }
    }, 6000);
    return () => clearInterval(watchdog);
  }, [fetchState, scope]);

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
        body: JSON.stringify({ amount, gift, ...(scopeParam(scope) ? { code: scopeParam(scope) } : {}) }),
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
  }, [token, scope]);

  const createPrivate = useCallback(async (maxPlayers: number) => {
    try {
      const res = await fetch('/api/arena/private', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ maxPlayers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false as const, error: data.error || 'Ошибка сервера', errorCode: data.errorCode, code: data.code };
      }
      return { ok: true as const, code: data.code as string, round: data.round };
    } catch {
      return { ok: false as const, error: 'Потеря соединения. Попробуйте ещё раз', errorCode: 'network' };
    }
  }, [token]);

  return {
    round,
    connected,
    serverOffset,
    history,
    placeBet,
    createPrivate,
    refreshHistory: fetchHistory,
    fetchRound: (code: string | null) => fetchState(code),
  };
}

export type { HistorySummary as ArenaHistorySummary };
export type { ArenaHistoryEntry };
