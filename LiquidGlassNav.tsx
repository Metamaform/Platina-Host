import React, { memo, useState } from "react";
import "./LiquidGlassNav.css";

type TabId = "inventory" | "games" | "top" | "tasks";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "inventory", label: "Инвентарь", icon: <BackpackIcon /> },
  { id: "games", label: "Игры", icon: <GameIcon /> },
  { id: "top", label: "Топ", icon: <CrownIcon /> },
  { id: "tasks", label: "Задания", icon: <TaskIcon /> },
];

export default function LiquidGlassNav() {
  const [active, setActive] = useState<TabId>("inventory");

  return (
    <nav className="lg-nav" aria-label="Основная навигация">
      <div className="lg-nav__inner">
        <div className="lg-nav__active" data-active={active} aria-hidden="true" />
        {tabs.map((tab) => (
          <NavItem
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onPress={() => setActive(tab.id)}
          />
        ))}
      </div>
      <div className="lg-nav__home-indicator" aria-hidden="true" />
    </nav>
  );
}

const NavItem = memo(function NavItem({
  tab, active, onPress,
}: {
  tab: (typeof tabs)[number];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      className={`lg-nav__item ${active ? "is-active" : ""}`}
      onClick={onPress}
      aria-current={active ? "page" : undefined}
      type="button"
    >
      <span className="lg-nav__icon">{tab.icon}</span>
      <span className="lg-nav__label">{tab.label}</span>
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
