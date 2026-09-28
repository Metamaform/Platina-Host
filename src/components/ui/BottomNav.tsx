import React from 'react';
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

/** The shared segment owns the immediate pill movement and deferred content update. */
export function BottomNav({ items, activeId, onSelect }: BottomNavProps) {
  const select = (id: string) => {
    onSelect(id);
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch { /* optional */ }
  };

  return (
    <LiquidSegment
      variant="nav"
      dragSelect
      ariaLabel="Навигация"
      value={activeId}
      onChange={select}
      options={items.map((item) => ({
        value: item.id,
        label: item.label,
        icon: <item.icon size={15} strokeWidth={2.4} aria-hidden />,
      }))}
    />
  );
}
