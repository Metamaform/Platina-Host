# Liquid Glass Navigation — React + TypeScript

Нижнее меню приложения «Platina Gift»: тёмная стеклянная дорожка, скользящая
пилюля активной вкладки, встроенные SVG-иконки.

## Файлы

| Файл | Назначение |
| --- | --- |
| `src/components/ui/LiquidGlassNav.tsx` | компонент меню |
| `src/components/ui/LiquidGlassNav.css` | стили (импортируются из компонента) |

## Подключение (как в `src/App.tsx`)

```tsx
import LiquidGlassNav from './components/ui/LiquidGlassNav';

const navItems = [
  { id: 'inventory', label: t('inventory') },
  { id: 'shop', label: t('nav_shop') || 'Игры' },
  { id: 'leaderboard', label: t('nav_leaderboard') || 'Топ' },
  { id: 'tasks', label: t('nav_tasks') || 'Задания' },
  ...(auth.isAdmin
    ? [{ id: 'admin', label: t('nav_admin'), icon: <Shield size={23} strokeWidth={1.8} /> }]
    : []),
];

<LiquidGlassNav items={navItems} activeId={activeTab} onSelect={setActiveTab} />
```

### Props

| Prop | Тип | Описание |
| --- | --- | --- |
| `items` | `{ id, label, icon? }[]` | пункты меню. Для id `inventory` / `shop` / `leaderboard` / `tasks` иконка берётся встроенная, `icon` переопределяет её |
| `activeId` | `string` | id активного пункта; если такого пункта нет (например, вкладка `profile`) — пилюля просто скрыта |
| `onSelect` | `(id) => void` | выбор пункта (в приложении — `setActiveTab`) |
| `ariaLabel` | `string?` | подпись `nav`, по умолчанию «Основная навигация» |

## Поведение и производительность

- активная вкладка двигается только через `transform` (никаких `left/width`);
- `backdrop-filter` не анимируется;
- нет анимаций `width/height/left/top/box-shadow`;
- SVG-иконки встроены, без тяжёлой icon-библиотеки;
- количество вкладок динамическое (`items.length` → `--lg-count`), поэтому меню
  корректно работает и с 5 пунктами у админа;
- уменьшенный gap между вкладками;
- на небольших touch-экранах дорогой `backdrop-filter` отключается;
- поддерживается `prefers-reduced-motion`;
- безопасная зона снизу (`env(safe-area-inset-bottom)`) и тап-отклик в Telegram
  (`HapticFeedback.selectionChanged`).

## Темизация

Все размеры и цвета — CSS-переменные на `.lg-nav` (`--lg-height`, `--lg-gap`,
`--lg-radius`, `--lg-text`, `--lg-active`, `--lg-glass`, `--lg-hairline`,
`--lg-pill`, `--lg-ease`). По умолчанию используется тёмное стекло приложения
(графит `#17191d` + брендовый синий `#0098ea`); светлый вариант включается
сменой этих переменных, например:

```css
.lg-nav {
  --lg-glass: rgba(255, 255, 255, .46);
  --lg-hairline: rgba(255, 255, 255, .56);
  --lg-text: rgba(32, 57, 91, .78);
}
```

Меню позиционируется `position: absolute` относительно ближайшего
позиционированного родителя — в приложении это нижняя полоса экранного фрейма
(`max-w-md`), поэтому оно всегда остаётся внутри «телефона» и над safe-area.

---

# AICE ARENA — PVP-джекпот арена

Раздел «Игры» → карточка **ARENA**. Джекпот-механика по референсу Aice Arena
в визуальном языке Rocket: тёмный фон, крупные скругления, cyan/blue CTA.

## Механика

- игроки делают ставки (GRAM или NFT из инвентаря) в общий пул;
- поле делится пропорционально долям: ширина сегмента игрока = % его вклада;
- таймер приёма ставок 25s → LOCKED → DRAWING → COMPLETED;
- победитель определяется **только на сервере** (provably fair), забирает весь банк в GRAM.

## Файлы

| Файл | Назначение |
| --- | --- |
| `src/lib/arenaShared.ts` | общие типы/константы (клиент + сервер) |
| `src/lib/arena.server.ts` | движок: машина состояний, ставки, выплаты, provably fair, история (`data/arena_history.json`), SSE-рассылка, демо-бот |
| `src/components/arena/Arena.tsx` | страница Arena (ArenaPage) |
| `src/components/arena/ArenaField.tsx` | поле-визуализатор в стиле Rocket: банк, таймер, пропорциональные доли игроков, метка билета |
| `src/components/arena/Arena*.tsx` | Header / Actions (одна CTA) / Participants (карточки Rocket) / Result / History / FairPlay / модалка ставки |
| `src/components/arena/useArenaLive.ts` | realtime-хук: SSE `/api/arena/stream` + фолбэк-поллинг |
| `src/components/arena/useArenaCountdown.ts` | таймер по серверным часам |

## API

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/api/arena/state?code=` | текущий раунд + история (fallback) |
| GET | `/api/arena/stream?token=&code=` | SSE: `state` / `balance` / `history` |
| POST | `/api/arena/bet` | ставка `{ amount, gift? }` |
| POST | `/api/arena/dev-bot` | ТЕМПОРАРНО: рандомный бот-участник для одиночного теста |
| GET | `/api/arena/history?limit=` | завершённые игры |
| GET | `/api/arena/round/:id` | детали игры |
| GET | `/api/arena/fair/:id` | provably fair: хэш/секрет/билет |

## Provably fair

```
serverSeed      — 32 случайных байта (секрет сервера)
hash            — SHA-256(serverSeed), публикуется до розыгрыша
roll            — HMAC-SHA256(serverSeed, "arena:<id>")[0..48bit] / 2^48
ticket          — roll × totalPool
победитель      — участник, на чьём накопленном интервале долей остановился билет
```

После COMPLETED сервер раскрывает `serverSeed`; кнопка «Проверить результат»
в модалке 🛡 ЧЕСТНАЯ ИГРА пересчитывает всё на клиенте (WebCrypto).

## Демо-боты (тест)

Автономные боты выключены. Для одиночного тестирования на экране Arena есть
временная кнопка «Добавить участника (тест)» — она вызывает `POST /api/arena/dev-bot`
и добавляет одного рандомного бота в текущий раунд. Перед релизом удалить
кнопку и эндпоинт. Для автономных ботов (без кнопки) — `ARENA_DEMO_BOTS=1`.
