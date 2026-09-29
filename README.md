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
