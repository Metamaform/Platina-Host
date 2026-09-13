import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import TelegramBot from "node-telegram-bot-api";
import { createServer as createViteServer } from "vite";
import { verifyTelegramInitData, TelegramAuthError } from "./src/lib/telegramAuth.server.ts";
import { issueToken, verifyToken } from "./src/lib/session.server.ts";
import { getUser, upsertUserProfile, setUserLanguage, saveUserState, recordOpen, getRecentOpens, getLeaderboardConfig, getLeaderboardData, saveLeaderboardConfig, getAdminConfig, saveAdminConfig, getReferrals, getTasksConfig, saveTasksConfig, completeUserTask, getCasesConfig, saveCasesConfig, getPromocodes, savePromocodes, getPromoRedemptions, savePromoRedemptions, getGiftsConfig, saveGiftsConfig, setWelcomeSeen, resetWelcomeSeen } from "./src/lib/store.server.ts";
import { getFragmentGiftPrices } from "./src/lib/fragmentPrices.server.ts";
import { getRocketState, placeRocketBet, cashoutRocketBet } from "./src/lib/rocket.server.ts";
import baseGiftsDb from "./src/gifts_data.json" with { type: "json" };

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = botToken ? new TelegramBot(botToken, { polling: true }) : null;

let cachedGramPriceUsd = 0.00084;
let lastGramPriceFetch = 0;

let cachedStarPriceUsd = 0.017;
let lastStarPriceFetch = 0;

async function getStarPriceUsd() {
  const now = Date.now();
  if (now - lastStarPriceFetch > 60 * 60 * 1000) { 
    try {
      const res = await fetch('https://coindataflow.com/ru/telegram-stars-to-ton');
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/<option value="([\d\.]+)">Base/);
        if (match && match[1]) {
          cachedStarPriceUsd = parseFloat(match[1]);
          lastStarPriceFetch = now;
        }
      }
    } catch (e) {
      console.error('Failed to fetch Stars price', e);
    }
  }
  return cachedStarPriceUsd;
}

async function getGramPriceUsd() {
  const now = Date.now();
  if (now - lastGramPriceFetch > 5 * 60 * 1000) { 
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
      if (res.ok) {
        const data = await res.json();
        if (data && data['the-open-network'] && data['the-open-network'].usd) {
          cachedGramPriceUsd = data['the-open-network'].usd;
          lastGramPriceFetch = now;
        }
      }
    } catch (e) {
      console.error('Failed to fetch TON price', e);
    }
  }
  return cachedGramPriceUsd;
}

if (bot) {
  bot.on('polling_error', (error: any) => {
    if (error?.code === 'ETELEGRAM' && (error?.message?.includes('401') || error?.response?.statusCode === 401)) {
      console.error('[Telegram Bot Error] 401 Unauthorized: The TELEGRAM_BOT_TOKEN is invalid. Stopping bot polling.');
      bot.stopPolling();
      return;
    }
    if (error?.code === 'ETELEGRAM' && error?.message?.includes('409')) {
      // Ignore 409 Conflict error in dev mode (multiple bot instances)
      return;
    }
    console.error('[Telegram Bot Error]', error);
  });

  bot.on('pre_checkout_query', (query) => {
    bot.answerPreCheckoutQuery(query.id, true).catch(console.error);
  });

  bot.on('message', (msg) => {
    console.log('[Bot Message Received]', msg.text);
    if (msg.successful_payment) {
      const payload = msg.successful_payment.invoice_payload;
      if (payload && payload.startsWith('stars_')) {
        const parts = payload.split('_');
        const userId = parseInt(parts[1], 10);
        const stars = parseInt(parts[2], 10);
        const gramsToAdd = parseFloat(parts[3]) || (stars * 0.95); 
        const user = getUser(userId);
        if (user) {
          user.balance += gramsToAdd;
          if (!user.topups) user.topups = [];
          user.topups.push({ id: payload, amount: gramsToAdd, ts: new Date().toISOString() });
          saveUserState(user.id, user.balance, user.inventory, user.turnover, user.topups);
        }
      }
    }
  });

  bot.on('inline_query', (query) => {
    if (!query.query.startsWith('share_')) return;
    
    const refId = query.query.replace('share_', '');
    const config = getAdminConfig();
    
    // Fallback bot user link if not provided
    const refLink = `https://t.me/PlatinaGiftRobot?start=ref_${refId}`;
    
    const results: any[] = [{
      type: 'article',
      id: '1',
      title: 'Отправить приглашение',
      description: 'Отправит красивое сообщение с кнопкой',
      input_message_content: {
        message_text: `<b>🎁 Заходи в Platina Gift и выигрывай свои NFT-подарки!</b>\n\n<b>Попади в еженедельный топ и получай гарантированные призы!</b>\n\nНаш Telegram Channel: @Platina_Gift\nТехническая поддержка: @Platina_Help`,
        parse_mode: 'HTML'
      },
      reply_markup: {
        inline_keyboard: [[
          { text: '🎮 Начать играть', url: refLink }
        ]]
      }
    }];
    
    bot.answerInlineQuery(query.id, results, { cache_time: 0 }).catch(err => {
      console.error('[Bot] Failed to answer inline query:', err?.message || err);
    });
  });

  
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);
    
    // If no user language is set, prompt for language
    if (!user || !user.languageCode) {
      const promptText = `Please choose your language / Пожалуйста, выберите язык / 请选择您的语言:`;
      const langKeyboard = [
        [{ text: 'English 🇺🇸', callback_data: 'lang_en' }],
        [{ text: 'Русский 🇷🇺', callback_data: 'lang_ru' }],
        [{ text: '中文 🇨🇳', callback_data: 'lang_zh' }]
      ];
      bot.sendMessage(chatId, promptText, {
        reply_markup: { inline_keyboard: langKeyboard }
      }).catch(e => console.error('[Bot] Failed to send lang prompt:', e?.message));
      return;
    }
    
    // Else send normal welcome message
    sendWelcomeMessage(chatId, user.languageCode);
  });
  
  bot.on('callback_query', (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;
    
    if (query.data && query.data.startsWith('lang_')) {
      const lang = query.data.split('_')[1];
      setUserLanguage(chatId, lang, query.from);
      
      let answerText = 'Language saved!';
      if (lang === 'ru') answerText = 'Язык сохранен!';
      else if (lang === 'zh') answerText = '语言已保存！';
      
      bot.answerCallbackQuery(query.id, { text: answerText }).catch(console.error);
      bot.deleteMessage(chatId, query.message.message_id).catch(console.error);
      
      sendWelcomeMessage(chatId, lang);
    }
  });
  
  function sendWelcomeMessage(chatId, lang) {
    const config = getAdminConfig();
    let caption = 'Welcome to the game! 🎮\nOpen gifts, craft NFTs, and compete in the leaderboard.';
    let playText = 'Start Playing!';
    let supportText = 'Support';
    let channelText = 'Our Channel';
    
    if (lang === 'ru') {
      caption = 'Добро пожаловать в игру! 🎮\nОткрывай подарки, крафти NFT и участвуй в таблице лидеров.';
      playText = 'Начать играть!';
      supportText = 'Тех.Поддержка';
      channelText = 'Наш Телеграм';
    } else if (lang === 'zh') {
      caption = '欢迎来到游戏！🎮\n打开礼物，制作NFT，并参与排行榜。';
      playText = '开始游戏！';
      supportText = '支持';
      channelText = '我们的频道';
    }
    
    let appUrl = config.botAppUrl || 'https://t.me/app_bot/app';
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = 'https://' + appUrl;
    }
    const playButton = appUrl.startsWith('https://t.me/') 
      ? { text: playText, url: appUrl }
      : { text: playText, web_app: { url: appUrl } };
      
    let supportUrl = config.botSupportUrl || 'https://t.me/platina_help';
    if (!supportUrl.startsWith('http://') && !supportUrl.startsWith('https://')) supportUrl = 'https://' + supportUrl;
    
    let channelUrl = config.botChannelUrl || 'https://t.me/platina_gift';
    if (!channelUrl.startsWith('http://') && !channelUrl.startsWith('https://')) channelUrl = 'https://' + channelUrl;
    
    const inlineKeyboard = [
      [playButton],
      [{ text: supportText, url: supportUrl }, { text: channelText, url: channelUrl }]
    ];

    if (config.botStartPhoto && (config.botStartPhoto.startsWith('http') || config.botStartPhoto.startsWith('AgA'))) {
      bot.sendPhoto(chatId, config.botStartPhoto, {
        caption,
        reply_markup: { inline_keyboard: inlineKeyboard }
      }).catch(err => {
        // Fallback silently if photo URL is invalid
        bot.sendMessage(chatId, caption, {
          reply_markup: { inline_keyboard: inlineKeyboard }
        }).catch(e => console.error('[Bot] Failed to send fallback message:', e?.message));
      });
    } else {
      bot.sendMessage(chatId, caption, {
        reply_markup: { inline_keyboard: inlineKeyboard }
      }).catch(e => console.error('[Bot] Failed to send message:', e?.message));
    }
  }
}

async function startServer() {
  const app = express();
let currentGiftsDb = getGiftsConfig() || [...baseGiftsDb];
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use((req, res, next) => { res.header("Access-Control-Allow-Origin", "*"); res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization"); if (req.method === "OPTIONS") { res.sendStatus(200); return; } next(); });


  const cache = new Map();
  const CACHE_TTL = 60 * 1000 * 5; // 5 minutes

  const PORT = 3000;

  // Fetch prices in background every hour
  setInterval(async () => {
    try {
      const slugs = currentGiftsDb.map((g) => g.slug).filter(Boolean);
      if (slugs.length > 0) {
        console.log(`[Background] Fetching prices for ${slugs.length} items...`);
        await getFragmentGiftPrices(slugs);
        console.log(`[Background] Prices updated successfully.`);
      }
    } catch (e) {
      console.error(`[Background] Failed to update prices:`, e);
    }
  }, 60 * 60 * 1000);

  // ---------------------------------------------------------------------
  // Telegram auth
  // ---------------------------------------------------------------------

  app.post("/api/auth/telegram", (req, res) => {
    try {
      const { initData } = req.body || {};
      const config = getAdminConfig();
      
      let tgUser;
      let startParam = null;
      
      if (initData === 'bypass_auth') {
        if (!config.allowWebBypass) {
          return res.status(401).json({ error: "Вход через браузер отключен. Пожалуйста, зайдите через Telegram." });
        }
        tgUser = { id: 1337, first_name: "Web", last_name: "Tester", username: "webtester" };
      } else {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
        const verifyResult = verifyTelegramInitData(initData, botToken);
        tgUser = verifyResult.user;
        startParam = verifyResult.startParam;
      }
      
      let isMaintenance = false;
      if (config.isMaintenance && !config.whitelist.includes(tgUser.id)) {
         isMaintenance = true;
      }
      
      const user = upsertUserProfile(tgUser, startParam);
      if (user.needsReload) {
        user.needsReload = false;
        saveUserState(user.id, user.balance, user.inventory, user.turnover, user.topups);
      }
      const token = issueToken(user.id);
      res.json({
        token,
        isMaintenance,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          languageCode: user.languageCode,
          photoUrl: user.photoUrl,
          welcomeSeen: user.welcomeSeen || false,
        },
        balance: user.balance,
        inventory: (user.inventory || []).map(item => {
          const gift = currentGiftsDb.find(g => g.name === item.name);
          if (gift) {
            return {
              ...item,
              image_url: gift.lottie_url || gift.image_url || item.image_url,
              lottie_url: gift.lottie_url || gift.image_url || item.image_url
            };
          }
          return item;
        }),
        turnover: user.turnover || 0,
        topups: user.topups || [],
        isAdmin: config.whitelist.includes(tgUser.id),
        config: {
          botSupportUrl: config.botSupportUrl || 'https://t.me/platina_help',
          botChannelUrl: config.botChannelUrl || 'https://t.me/platina_gift',
          demoMode: config.demoMode || false,
        }
      });
    } catch (e: any) {
      console.error('Telegram Auth Error:', e);
      res.status(401).json({ error: e.message || 'Ошибка авторизации' });
    }
  });

  // Достаёт userId из Authorization: Bearer <token>, кладёт в req.userId
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const userId = token ? verifyToken(token) : null;
    if (!userId) {
      res.status(401).json({ error: "Не авторизован — открой приложение через Telegram" });
      return;
    }
    (req as any).userId = userId;
    next();
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    requireAuth(req, res, () => {
      const config = getAdminConfig();
      const whitelist = config?.whitelist || [];
      if (!whitelist.includes((req as any).userId)) {
        return res.status(403).json({ error: "No permission" });
      }
      next();
    });
  }

  app.get("/api/me", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const user = getUser(userId);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, username: user.username, photoUrl: user.photoUrl },
      balance: user.balance,
      inventory: (user.inventory || []).map(item => {
          const gift = currentGiftsDb.find(g => g.name === item.name);
          if (gift) {
            return {
              ...item,
              image_url: gift.lottie_url || gift.image_url || item.image_url,
              lottie_url: gift.lottie_url || gift.image_url || item.image_url
            };
          }
          return item;
        }),
        turnover: user.turnover || 0,
      });
  });

  app.get("/api/stars-rate", async (req, res) => {
    const gramUsd = await getGramPriceUsd();
    const starUsd = await getStarPriceUsd();
    // Calculate rate based on parsed star price and commission
    const rate = (starUsd / gramUsd) * 0.95; 
    res.json({ rate });
  });

  // Синхронизация состояния (баланс/инвентарь) — источник правды теперь сервер,
  // а не localStorage. Клиент шлёт сюда своё состояние после каждого значимого
  // изменения (дебаунсом), чтобы оно было привязано к реальному Telegram-юзеру.
  app.post("/api/bot/invoice-stars", requireAuth, async (req, res) => {
    const userId = (req as any).userId as number;
    const { stars } = req.body;
    if (!stars || stars <= 0) return res.status(400).json({error: 'Invalid stars amount'});
    
    if (!bot) return res.status(500).json({error: 'Bot not configured'});

    try {
      const gramUsd = await getGramPriceUsd();
      const starUsd = await getStarPriceUsd();
      const rate = (starUsd / gramUsd) * 0.95;
      const gramsToAdd = stars * rate;

      // payload max size is 128 bytes, stars_123456789_100_1550.45_17392812323
      const payload = `stars_${userId}_${stars}_${gramsToAdd.toFixed(2)}_${Date.now()}`;
      const title = 'Пополнение GRAM';
      const description = `Пополнение баланса на ${gramsToAdd.toFixed(2)} GRAM (${stars} звезд)`;
      
      const invoiceLink = await bot.createInvoiceLink(
        title,
        description,
        payload,
        '', // Empty for Stars
        'XTR',
        [{ label: 'Звезды', amount: stars }]
      );
      res.json({ invoiceLink });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/bot/notify-topup", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const { amount } = req.body || {};
    
    if (bot && amount) {
      const config = getAdminConfig();
      const text = `Вы пополнили баланс на сумму ${amount} GRAM.`;
      
      const appUrl = config.botAppUrl || 'https://t.me/app_bot/app';
      const playButton = appUrl.startsWith('https://t.me/') 
        ? { text: 'Начать играть!', url: appUrl }
        : { text: 'Начать играть!', web_app: { url: appUrl } };

      const reply_markup = {
        inline_keyboard: [
          [playButton]
        ]
      };
      
      try {
        if (userId && typeof userId === 'number' && userId > 1000) {
          if (config.botTopupPhoto) {
            bot.sendPhoto(userId, config.botTopupPhoto, { caption: text, reply_markup }).catch(() => {});
          } else {
            bot.sendMessage(userId, text, { reply_markup }).catch(() => {});
          }
        }
      } catch (e) {}
    }
    res.json({ ok: true });
  });

  app.post("/api/bot/notify-withdraw", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const { nftName } = req.body || {};
    
    if (bot && nftName) {
      const config = getAdminConfig();
      const text = `Ваш NFT – ${nftName}, в обработке на вывод!\n\nОбязательно напишите в личные сообщения @platina_relayer для обработки вывода.`;
      
      const appUrl = config.botAppUrl || 'https://t.me/app_bot/app';
      const playButton = appUrl.startsWith('https://t.me/') 
        ? { text: 'Начать играть!', url: appUrl }
        : { text: 'Начать играть!', web_app: { url: appUrl } };

      const reply_markup = {
        inline_keyboard: [
          [playButton]
        ]
      };
      
      try {
        if (userId && typeof userId === 'number' && userId > 1000) {
          if (config.botWithdrawPhoto) {
            bot.sendPhoto(userId, config.botWithdrawPhoto, { caption: text, reply_markup }).catch(() => {});
          } else {
            bot.sendMessage(userId, text, { reply_markup }).catch(() => {});
          }
        }
      } catch (e) {}
    }
    res.json({ ok: true });
  });

  app.post("/api/user/welcome-seen", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const updated = setWelcomeSeen(userId);
    if (!updated) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({ success: true, welcome_seen: true });
  });

  app.post("/api/state", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const { balance, inventory, turnover, topups } = req.body || {};
    if (typeof balance !== "number" || !Array.isArray(inventory)) {
      res.status(400).json({ error: "Ожидаются balance:number и inventory:array" });
      return;
    }
    const updated = saveUserState(userId, balance, inventory, turnover, topups);
    if (!updated) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (updated.needsReload) {
      res.json({ ok: true, forceReload: true });
      return;
    }
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------------
  // Реальные открытия (Live Drop) — только настоящие события от юзеров,
  // никакого рандомного фейка.
  // ---------------------------------------------------------------------

  
  app.get("/api/referrals", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const referrals = getReferrals(userId);
    res.json({ referrals });
  });

  app.post("/api/opens", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const user = getUser(userId);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    const { gift, price, isGram, multiplier, game } = req.body || {};
    // Rocket wins are recorded authoritatively directly inside cashoutRocketBet on the server
    if (game === 'rocket') {
      res.json({ ok: true, ignored: 'already_recorded_by_server' });
      return;
    }
    if (typeof price !== "number") {
      res.status(400).json({ error: "Ожидается price:number" });
      return;
    }
    if (!isGram && (!gift || typeof gift.name !== "string")) {
      res.status(400).json({ error: "Ожидается gift:{name,...} для NFT" });
      return;
    }
    recordOpen({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      firstName: user.firstName || "Игрок",
      gift: isGram ? undefined : { name: gift.name, image_url: gift.image_url, pattern: gift.pattern, lottieUrl: gift.lottieUrl, slug: gift.slug, price: gift.price },
      price,
      isGram: !!isGram,
      multiplier: multiplier || undefined,
      game: game || undefined
    });
    res.json({ ok: true });
  });

  // Публичный — лента реальных открытий видна всем, как и раньше,
  // но теперь это не рандом, а факты.
  app.get("/api/opens/recent", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const opens = getRecentOpens(limit);
    // Resolve updated URLs from currentGiftsDb
    const resolvedOpens = opens.map(open => {
      if (open.gift && open.gift.name) {
        const gift = currentGiftsDb.find(g => g.name === open.gift.name);
        if (gift) {
           return {
             ...open,
             gift: {
               ...open.gift,
               image_url: gift.lottie_url || gift.image_url || open.gift.image_url
             }
           };
        }
      }
      return open;
    });
    res.json(resolvedOpens);
  });

  // ---------------------------------------------------------------------
  // Ракетка (Crash Game) — цикличные матчи 24/7, реальные игроки
  // ---------------------------------------------------------------------

  app.get("/api/rocket/state", (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const userId = token ? verifyToken(token) : undefined;
    const state = getRocketState(userId || undefined);
    res.json(state);
  });

  app.post("/api/rocket/bet", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const { isGram, isNft, betAmount, gift } = req.body || {};
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Неверная сумма ставки' });
    }
    const result = placeRocketBet(userId, !!isGram, !!isNft, betAmount, gift);
    if ((result as any).error) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.post("/api/rocket/cashout", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const result = cashoutRocketBet(userId);
    if ((result as any).error) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // ---------------------------------------------------------------------
  // Реальные цены с Fragment (публичные страницы, без авторизации)
  // ---------------------------------------------------------------------

  app.get("/api/fragment/prices", async (req, res) => {
    try {
      const slugs = (currentGiftsDb as any[]).map((g) => g.slug).filter(Boolean);
      const prices = await getFragmentGiftPrices(slugs);
      res.json(prices);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Fragment scrape failed" });
    }
  });

  app.get("/api/fragment/prices/:slug", async (req, res) => {
    try {
      const [price] = await getFragmentGiftPrices([req.params.slug]);
      res.json(price);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Fragment scrape failed" });
    }
  });

  // ---------------------------------------------------------------------
  // TonAPI — публичные ончейн-данные коллекций (номер, атрибуты, редкость)
  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  // Proxy for Lottie JSON to bypass CORS
  // ---------------------------------------------------------------------
  const lottieCache = new Map<string, any>();

  app.get("/api/proxy/variants", async (req, res) => {
    const slug = req.query.slug;
    if (!slug) return res.status(400).json({ error: "Missing slug" });
    
    try {
      const response = await fetch(`https://fragment.com/gifts/${slug}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const data = await response.text();
      const attrRegex = /<div class="tm-main-filters-box[^>]*data-field="attr\[Model\]"(.*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/s;
      const match = data.match(attrRegex);
      if (!match) return res.json([]);
      
      const modelsHtml = match[1];
      const itemRegex = /<div class="tm-main-filters-item[^>]*data-keywords="([^"]+)"[^>]*>.*?<img src="([^"]+)"/gs;
      let itemMatch;
      const variants = [];
      while ((itemMatch = itemRegex.exec(modelsHtml)) !== null) {
        variants.push({
          name: itemMatch[1],
          image: `https://fragment.com${itemMatch[2]}`
        });
      }
      res.json(variants);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });


  app.get("/api/proxy/download", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `Status ${response.status}` });
      }
      
      const fileName = targetUrl.split('/').pop() || 'download';
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // stream the response
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/proxy/lottie", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    
    if (lottieCache.has(targetUrl)) {
      return res.json(lottieCache.get(targetUrl));
    }
    let lastError;
    for (let i = 1; i <= 3; i++) {
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json,*/*'
          },
          // @ts-ignore
          timeout: 10000
        });
        
        if (!response.ok) {
          throw new Error(`Status ${response.status} for ${targetUrl}`);
        }
        
        
        let json;
        if (targetUrl.endsWith('.tgs')) {
          const zlib = await import('zlib');
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength > 2000000) throw new Error("File too large");
          const decompressed = zlib.gunzipSync(Buffer.from(arrayBuffer));
          json = JSON.parse(decompressed.toString('utf8'));
        } else {
          json = await response.json();
        }

        // Only cache if it's relatively small to prevent memory leaks
        const jsonStr = JSON.stringify(json);
        if (jsonStr.length < 5000000) {
           if (lottieCache.size > 100) lottieCache.clear();
           lottieCache.set(targetUrl, json);
        }
        return res.json(json);
      } catch (err: any) {
        lastError = err;
        if (i < 3) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    
    // Return 200 instead of 5xx so the browser doesn't throw a red network error.
    // lottieExtractor.ts will parse this and return null, falling back to static image.
    res.json({ _proxy_error: true, message: lastError?.message || "Unavailable" });
  });

  // --- Admin System Config ---
  
  app.get('/api/tasks', requireAuth, (req, res) => {
    const userId = (req as any).userId;
    const tasks = getTasksConfig() || [];
    const storedUser = getUser(userId);
    
    // filter expired tasks
    const now = new Date();
    const validTasks = (Array.isArray(tasks) ? tasks : []).filter(t => !t.expiresAt || new Date(t.expiresAt) > now);
    
    // map with completed status
    const tasksWithStatus = validTasks.map(t => ({
      ...t,
      completed: !!(storedUser?.completedTasks?.[t.id])
    }));
    
    res.json({ tasks: tasksWithStatus });
  });

  app.post('/api/tasks/complete', requireAuth, (req, res) => {
    const userId = (req as any).userId;
    const { taskId } = req.body;
    
    let tasks = getTasksConfig() || [];
    if (!Array.isArray(tasks)) tasks = [];
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.expiresAt && new Date(task.expiresAt) < new Date()) {
       return res.status(400).json({ error: 'Task expired' });
    }
    
    const success = completeUserTask(userId, task.id, task.reward);
    if (success) {
      const storedUser = getUser(userId);
      res.json({ success: true, balance: storedUser?.balance });
    } else {
      res.status(400).json({ error: 'Task already completed or user not found' });
    }
  });
  app.post("/api/user/language", requireAuth, (req, res) => {
    const userId = (req as any).userId;
    const { language } = req.body;
    if (language) {
      setUserLanguage(userId, language);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "No language provided" });
    }
  });


  app.post('/api/admin/tasks', requireAdmin, (req, res) => {
    const { tasks } = req.body;
    saveTasksConfig(tasks);
    res.json({ success: true });
  });

  app.post('/api/admin/reset-welcome', requireAdmin, (req, res) => {
    const userId = (req as any).userId as number;
    resetWelcomeSeen(userId);
    res.json({ success: true });
  });
  
  app.get('/api/admin/tasks', requireAdmin, (req, res) => {
    const tasks = getTasksConfig() || [];
    res.json(tasks);
  });

  
  app.use("/api/admin", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });

  app.get("/api/admin/promocodes", requireAdmin, (req, res) => {
    res.json(getPromocodes());
  });

  app.post("/api/admin/promocodes", requireAdmin, (req, res) => {
    savePromocodes(req.body.promocodes);
    res.json({ success: true });
  });

  app.post("/api/promocodes/redeem", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const { code: reqCode } = req.body;
    if (!userId || !reqCode) return res.status(400).json({ error: 'Missing params' });
    
    const codes = getPromocodes();
    const promo = codes.find(c => c.code.toLowerCase() === reqCode.toLowerCase());
    
    if (!promo || !promo.active) {
      return res.status(404).json({ error: 'Промокод не найден' });
    }
    
    if (promo.currentUses >= promo.maxUses && promo.maxUses > 0) {
      return res.status(400).json({ error: 'Лимит активаций исчерпан' });
    }
    
    const reds = getPromoRedemptions();
    if (!reds[userId]) reds[userId] = [];
    
    if (reds[userId].includes(promo.code)) {
      return res.status(400).json({ error: 'Вы уже активировали этот промокод' });
    }
    
    const user = getUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let addedItem = null;
    let addedGrams = 0;
    
    if (promo.type === 'gram') {
      addedGrams = parseFloat(promo.value);
      user.balance += addedGrams;
    } else if (promo.type === 'nft') {
      const gift = currentGiftsDb.find(g => g.id === promo.value);
      if (!gift) return res.status(400).json({ error: 'NFT не найдено в базе' });
      addedItem = { ...gift, uniqueId: Math.random().toString(36).substring(2, 11) };
      user.inventory.push(addedItem);
    }
    
    reds[userId].push(promo.code);
    promo.currentUses += 1;
    
    savePromocodes(codes);
    savePromoRedemptions(reds);
    upsertUserProfile(user);
    
    res.json({ success: true, type: promo.type, addedGrams, addedItem });
  });

  app.get("/api/admin/config", requireAdmin, (req, res) => {
    res.json(getAdminConfig());
  });

  app.post("/api/admin/config", requireAdmin, (req, res) => {
    const currentConfig = getAdminConfig();
    const updated = { ...currentConfig, ...req.body };
    saveAdminConfig(updated);
    res.json({ success: true });
  });

    app.post('/api/admin/cases', requireAdmin, (req, res) => {
    const { cases } = req.body;
    saveCasesConfig(cases);
    res.json({ success: true });
  });

  app.get('/api/admin/cases', requireAdmin, (req, res) => {
    const cases = getCasesConfig() || [];
    res.json(cases);
  });
  
  app.get('/api/cases', (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const cases = getCasesConfig() || [];
    const resolvedCases = cases.map(c => {
      // Resolve case image
      let caseImage = c.image;
      if (caseImage) {
        const matchingGift = currentGiftsDb.find(g => g.image_url === caseImage || g.lottie_url === caseImage);
        if (matchingGift) {
          caseImage = matchingGift.lottie_url || matchingGift.image_url || caseImage;
        }
      }
      
      return {
        ...c,
        image: caseImage,
        items: c.items.map(item => {
          const gift = currentGiftsDb.find(g => g.name === item.name);
          if (gift) {
            return {
              ...item,
              image_url: gift.lottie_url || gift.image_url || item.image_url
            };
          }
          return item;
        })
      };
    });
    res.json(resolvedCases);
  });

app.get("/api/admin/gifts", (req, res) => {
    res.json(currentGiftsDb);
  });
  app.post("/api/admin/gifts", requireAdmin, (req, res) => {
    const { gifts } = req.body;
    console.log("POST /api/admin/gifts hit, gifts length:", gifts?.length);
    if (Array.isArray(gifts)) {
      currentGiftsDb = gifts;
      try {
        saveGiftsConfig(gifts);
        console.log("Saved gifts config successfully");
      } catch (e) {
        console.error("Error saving gifts config", e);
      }
      cache.clear(); // Clear memory cache for /api/gifts
      res.json({ ok: true });
    } else {
      console.log("Invalid gifts data received");
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.get("/api/leaderboard/config", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const config = getLeaderboardConfig();
    // Resolve updated URLs from currentGiftsDb
    if (config) {
      if (config.prizeNftName) {
        const gift = currentGiftsDb.find(g => g.name === config.prizeNftName);
        if (gift) {
           config.prizeNftUrl = gift.lottie_url || gift.image_url || config.prizeNftUrl;
        }
      }
      if (config.prizes) {
        for (const rank in config.prizes) {
          if (config.prizes[rank] && config.prizes[rank].name) {
            const gift = currentGiftsDb.find(g => g.name === config.prizes[rank].name);
            if (gift) {
              config.prizes[rank].url = gift.lottie_url || gift.image_url || config.prizes[rank].url;
            }
          }
        }
      }
    }
    res.json(config);
  });

  app.post("/api/admin/leaderboard", requireAdmin, (req, res) => {
    const config = req.body;
    if (config) {
      saveLeaderboardConfig(config);
      res.json({ ok: true });
    } else {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.get("/api/leaderboard", requireAuth, (req, res) => {
    const userId = (req as any).userId as number;
    const limit = Number(req.query.limit) || 100;
    res.json(getLeaderboardData(userId, limit));
  });

  app.get("/api/gifts", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const limit = req.query.limit || 50;
      const offset = req.query.offset || 0;
      const collectionParam = req.query.collection as string;
      const cacheKey = `${collectionParam}-${limit}-${offset}`;
      const now = Date.now();
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (now - cached.timestamp < CACHE_TTL) {
          return res.json(cached.data);
        }
      }

      const COLLECTION_ADDRESS = collectionParam || "EQCE80Aln8YfldnQLwWMvOfloLGgmPY0eGDJz9ufG3gRui3D";
      const TONAPI_URL = `https://tonapi.io/v2/nfts/collections/${encodeURIComponent(COLLECTION_ADDRESS)}/items`;
      let response = await fetch(`${TONAPI_URL}?limit=${limit}&offset=${offset}`);

      let retries = 0;
      while (response.status === 429 && retries < 3) {
        retries++;
        console.log(`Rate limited by TonAPI. Retrying in ${retries} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retries * 1000));
        response = await fetch(`${TONAPI_URL}?limit=${limit}&offset=${offset}`);
      }

      if (!response.ok) {
        console.warn(`TonAPI failed with ${response.status}. Falling back to currentGiftsDb.`);
        const numLimit = Number(limit) || 50;
        const numOffset = Number(offset) || 0;
        const sliced = (currentGiftsDb as any[]).slice(numOffset, numOffset + numLimit);
        const fallbackData = { nft_items: sliced };
        cache.set(cacheKey, { timestamp: now, data: fallbackData });
        return res.json(fallbackData);
      }

      const data = await response.json();
      cache.set(cacheKey, { timestamp: now, data });
      res.json(data);
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  
  
  // 404 handler for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Global error handler

  app.use((err: any, req: any, res: any, next: any) => {
    try { fs.appendFileSync('error.log', new Date().toISOString() + ': ' + (err.stack || err.message || err) + '\n'); } catch (e) {}
    console.error('Global error handler caught:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  app.listen(PORT, "0.0.0.0", () => {

    console.log(`Server running on http://localhost:${PORT}`);
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn("[auth] TELEGRAM_BOT_TOKEN не задан — авторизация через Telegram будет всегда отклоняться.");
    }
  });
}

startServer();
