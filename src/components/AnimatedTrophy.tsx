import React from 'react';

interface AnimatedTrophyProps {
  className?: string;
  size?: number | string;
}

export const AnimatedTrophy: React.FC<AnimatedTrophyProps> = ({
  className = 'w-7 h-7',
}) => {
  return (
    <img
      src="/U+1F3C6_1.webp"
      alt="Trophy"
      loading="eager"
      decoding="async"
      className={`inline-block object-contain pointer-events-none select-none shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export default AnimatedTrophy;
