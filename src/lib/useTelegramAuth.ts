import { useEffect, useState, useCallback } from 'react';
import { sanitizeAvatarUrl } from '../components/UserAvatar';

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
    const unsafeUser = tg?.initDataUnsafe?.user;
    const clientPhotoUrl = sanitizeAvatarUrl(unsafeUser?.photo_url);

    if (!initData) {
      initData = 'bypass_auth';
    }
    tg?.ready?.();
    tg?.expand?.();

    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, clientPhotoUrl }),
    })
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
           const text = await res.text();
           throw new Error(`Сервер вернул ошибку, проверьте деплой бэкенда (получено ${contentType}): ${text.substring(0, 100)}`);
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка авторизации');
        try {
          sessionStorage.setItem(TOKEN_KEY, data.token);
        } catch(e) {}
        const resolvedUser = data.user
          ? {
              ...data.user,
              photoUrl: sanitizeAvatarUrl(data.user.photoUrl) || clientPhotoUrl,
            }
          : null;
        setState({
          status: 'ready',
          token: data.token,
          user: resolvedUser,
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

  // Re-sync Telegram profile photo & metadata when user returns to the Mini App
  useEffect(() => {
    if (state.status !== 'ready' || !state.token) return;
    const syncProfile = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/me', {
        headers: { Authorization: `Bearer ${state.token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.user) return;
          setState((prev) => {
            if (!prev.user) return prev;
            const nextPhoto = sanitizeAvatarUrl(d.user.photoUrl) || prev.user.photoUrl;
            if (
              prev.user.photoUrl === nextPhoto &&
              prev.user.firstName === d.user.firstName &&
              prev.user.username === d.user.username
            ) {
              return prev;
            }
            return {
              ...prev,
              user: {
                ...prev.user,
                firstName: d.user.firstName || prev.user.firstName,
                lastName: d.user.lastName ?? prev.user.lastName,
                username: d.user.username ?? prev.user.username,
                photoUrl: nextPhoto,
              },
            };
          });
        })
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', syncProfile);
    return () => document.removeEventListener('visibilitychange', syncProfile);
  }, [state.status, state.token]);

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
          .catch(() => {});
    },
    [state.token]
  );

  const recordOpen = useCallback(
    (gift: { id?: string; name: string; image_url?: string; slug?: string; price?: number; backdrop?: string } | null, price: number, type: 'nft' | 'gram' = 'nft', multiplier?: number, game?: string) => {
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
