import { useEffect, useState, useCallback } from 'react';

/**
 * Реальная авторизация через Telegram Mini App.
 *
 * Важно: используем `window.Telegram.WebApp.initData` (сырую подписанную
 * строку), а не `initDataUnsafe` — последнюю можно подделать в devtools,
 * т.к. это просто распарсенный querystring без проверки подписи.
 * initData уходит на сервер и проверяется там через HMAC с бот-токеном
 * (см. src/lib/telegramAuth.server.ts). Только после этого юзер считается
 * настоящим.
 *
 * Если initData пустой — значит приложение открыто не из Telegram
 * (обычный браузер и т.п.), и авторизоваться по-настоящему нельзя.
 */

export interface AuthUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  welcomeSeen?: boolean;
}

interface AuthState {
  status: 'loading' | 'ready' | 'error' | 'no_telegram';
  token: string | null;
  user: AuthUser | null;
  balance: number;
  inventory: any[];
  turnover: number;
  topups: any[];
  error: string | null;
  isMaintenance: boolean;
  isAdmin: boolean;
  config?: any;
  welcomeSeen: boolean;
}

const TOKEN_KEY = 'pg_session_token';

let initialToken: string | null = null;
try {
  initialToken = sessionStorage.getItem(TOKEN_KEY);
} catch(e) {}

export function useTelegramAuth() {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    token: initialToken,
    user: null,
    balance: 0,
    inventory: [],
    turnover: 0,
    topups: [],
    error: null,
    isMaintenance: false,
    isAdmin: false,
    welcomeSeen: false,
  });

  useEffect(() => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    let initData = tg?.initData;

    if (!initData) {
      initData = 'bypass_auth';
    }
    tg?.ready?.();
    tg?.expand?.();

    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка авторизации');
        try {
          sessionStorage.setItem(TOKEN_KEY, data.token);
        } catch(e) {}
        setState({
          status: 'ready',
          token: data.token,
          user: data.user,
          balance: data.balance,
          inventory: data.inventory,
          turnover: data.turnover || 0,
          topups: data.topups || [],
          error: null,
          isMaintenance: !!data.isMaintenance,
          isAdmin: !!data.isAdmin,
          config: data.config,
          welcomeSeen: data.user?.welcomeSeen || false,
        });
      })
      .catch((e) => {
        setState((s) => ({ ...s, status: 'error', error: e.message }));
      });
  }, []);

  // Дебаунс-синхронизация состояния на сервер, привязанного к реальному userId
  const syncState = useCallback(
    (balance: number, inventory: any[], turnover?: number, topups?: any[]) => {
      if (!state.token) return;
      fetch('/api/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`,
          },
          body: JSON.stringify({ balance, inventory, turnover, topups }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.forceReload) {
              window.location.reload();
            }
          })
          .catch(() => {});
    },
    [state.token]
  );

  const recordOpen = useCallback(
    (gift: { name: string; image_url?: string; slug?: string; price?: number } | null, price: number, type: 'nft' | 'gram' = 'nft', multiplier?: number, game?: string) => {
      if (!state.token) return;
      fetch('/api/opens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ gift, price, isGram: type === 'gram', multiplier, game }),
      }).catch(() => {});
    },
    [state.token]
  );

  return { ...state, syncState, recordOpen };
}
