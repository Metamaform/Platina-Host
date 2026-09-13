import crypto from 'crypto';

/**
 * Проверка Telegram WebApp initData на сервере.
 * Алгоритм из официальной документации Telegram:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * secret_key = HMAC_SHA256("WebAppData", bot_token)
 * hash       = HEX( HMAC_SHA256(secret_key, data_check_string) )
 *
 * Это НЕ то же самое, что initDataUnsafe на клиенте — initDataUnsafe можно
 * подделать в devtools, т.к. это просто распарсенный querystring без проверки
 * подписи. Доверять можно только результату этой функции.
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export class TelegramAuthError extends Error {}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400
): { user: TelegramUser, startParam: string | null } {

  if (!botToken) {
    throw new TelegramAuthError(
      'TELEGRAM_BOT_TOKEN не задан на сервере — без него подпись initData проверить невозможно'
    );
  }
  if (!initData) {
    throw new TelegramAuthError('initData пустой — приложение открыто не через Telegram');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new TelegramAuthError('в initData нет hash');
  params.delete('hash');

  const pairs: string[] = [];
  params.forEach((value, key) => pairs.push(`${key}=${value}`));
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const validSignature =
    computedHash.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));

  if (!validSignature) {
    throw new TelegramAuthError('подпись initData не совпадает — данные подделаны или устарел бот-токен');
  }

  const authDate = Number(params.get('auth_date') || '0');
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw new TelegramAuthError('initData просрочен, перезапусти мини-апп');
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new TelegramAuthError('в initData нет user');

  try {
    return { user: JSON.parse(userRaw) as TelegramUser, startParam: params.get('start_param') };
  } catch {
    throw new TelegramAuthError('не удалось распарсить user из initData');
  }
}
