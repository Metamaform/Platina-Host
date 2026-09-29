import React, { memo } from "react";
import "./LiquidGlassNav.css";

export interface LiquidGlassNavItem<T extends string = string> {
  id: T;
  label: string;
  /** Свой значок пункта. Если не передан — берётся встроенный SVG по id вкладки. */
  icon?: React.ReactNode;
}

interface LiquidGlassNavProps<T extends string> {
  items: LiquidGlassNavItem<T>[];
  /** id активного пункта. Если такого пункта нет — пилюля просто скрыта. */
  activeId: string;
  onSelect: (id: T) => void;
  ariaLabel?: string;
}

/**
 * Встроенные значки вкладок приложения — обычные SVG, без icon-библиотеки.
 * Ключи совпадают с id вкладок в App.tsx; для неизвестного id используется FallbackIcon.
 */
const BUILTIN_ICONS: Record<string, React.ReactNode> = {
  inventory: <BackpackIcon />,
  shop: <GameIcon />,
  games: <GameIcon />,
  leaderboard: <CrownIcon />,
  top: <CrownIcon />,
  tasks: <TaskIcon />,
};

type StyleWithVars = React.CSSProperties & {
  "--lg-count": string;
  "--lg-index": string;
};

export default function LiquidGlassNav<T extends string>({
  items,
  activeId,
  onSelect,
  ariaLabel = "Основная навигация",
}: LiquidGlassNavProps<T>) {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const hasSelection = activeIndex >= 0;
  const count = Math.max(1, items.length);

  return (
    <nav className="lg-nav" aria-label={ariaLabel}>
      <div
        className="lg-nav__inner"
        style={
          {
            gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            "--lg-count": String(count),
            "--lg-index": String(hasSelection ? activeIndex : 0),
          } as StyleWithVars
        }
      >
        {hasSelection && (
          <div className="lg-nav__active" data-active={activeId} aria-hidden="true" />
        )}
        {items.map((tab) => (
          <NavItem
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon ?? BUILTIN_ICONS[tab.id] ?? <FallbackIcon />}
            active={tab.id === activeId}
            onPress={() => onSelect(tab.id)}
          />
        ))}
      </div>
      <div className="lg-nav__home-indicator" aria-hidden="true" />
    </nav>
  );
}

const NavItem = memo(function NavItem({
  id,
  label,
  icon,
  active,
  onPress,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      className={`lg-nav__item ${active ? "is-active" : ""}`}
      onClick={() => {
        if (active) return;
        // Тактильный отклик, как у остальных сегментов приложения.
        try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch { /* optional */ }
        onPress();
      }}
      aria-current={active ? "page" : undefined}
      data-tab={id}
      type="button"
    >
      <span className="lg-nav__icon">{icon}</span>
      <span className="lg-nav__label">{label}</span>
    </button>
  );
});

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">{children}</svg>
  );
}

function BackpackIcon() {
  return <Icon><path d="M6.5 8.5V7a5.5 5.5 0 0 1 11 0v1.5"/><rect x="4" y="7.5" width="16" height="13" rx="3"/><path d="M8.5 12h7M9 16.5h6"/></Icon>;
}
function GameIcon() {
  return <Icon><path d="M6.7 8.2h10.6c2.4 0 4.1 2.1 3.5 4.4l-1.1 4.1c-.5 1.9-2.8 2.6-4.2 1.3l-2.4-2.2h-2.2l-2.4 2.2c-1.4 1.3-3.7.6-4.2-1.3l-1.1-4.1C2.6 10.3 4.3 8.2 6.7 8.2Z"/><path d="M7.5 11v4M5.5 13h4M16.5 12h.01M18.5 14h.01"/></Icon>;
}
function CrownIcon() {
  return <Icon><path d="m4 9 3.3 3L12 5l4.7 7L20 9l-1.5 8H5.5L4 9Z"/><path d="M6 20h12"/></Icon>;
}
function TaskIcon() {
  return <Icon><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 3.5V2.7h6v.8M8.5 9.5h7M8.5 13h7M8.5 16.5h4"/><path d="m16.2 12.9 1 1 2-2"/></Icon>;
}
function FallbackIcon() {
  return <Icon><rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/></Icon>;
}
