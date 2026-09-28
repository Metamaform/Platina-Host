import React, { useEffect, useState, useTransition } from 'react';
import { LiquidSegment } from './LiquidSegment';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
}

interface BottomNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Нижнее меню. Пилюля живёт в локальном state и сдвигается сразу,
 * а тяжёлая смена вкладки уходит в startTransition — клик не ждёт
 * перерисовку страницы и layout-анимацию.
 */
export function BottomNav({ items, activeId, onSelect }: BottomNavProps) {
  const [visual, setVisual] = useState(activeId);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setVisual(activeId);
  }, [activeId]);

  const select = (id: string) => {
    if (id === visual) return;
    setVisual(id);
    startTransition(() => onSelect(id));
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch { /* optional */ }
  };

  return (
    <LiquidSegment
      variant="nav"
      dragSelect
      ariaLabel="Навигация"
      value={visual}
      onChange={select}
      options={items.map((item) => ({
        value: item.id,
        label: item.label,
        icon: <item.icon size={15} strokeWidth={2.4} aria-hidden />,
      }))}
    />
  );
}
