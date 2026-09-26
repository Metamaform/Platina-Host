import React, { useState, useEffect, useRef } from 'react';

interface LazyNftCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  placeholderClassName?: string;
  aspectRatio?: string;
  minHeight?: string | number;
  rootMargin?: string;
}

export const LazyNftCard: React.FC<LazyNftCardProps> = ({
  children,
  index = 0,
  className = '',
  placeholderClassName = '',
  aspectRatio = '',
  minHeight,
  rootMargin = '180px 0px'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin, // Pre-trigger slightly before user reaches the item ("почти что долистал")
        threshold: 0.01
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  // "Через один" плавное чередование задержки (staggered alternating delay)
  const isOdd = index % 2 === 1;
  const staggerClass = isOdd ? 'transition-all duration-300 delay-75' : 'transition-all duration-300 delay-0';

  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className={`w-full ${aspectRatio} rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center p-3 animate-pulse pointer-events-none ${placeholderClassName} ${className}`}
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: typeof minHeight === 'number' ? `${minHeight}px` : (minHeight || '160px 200px'),
          minHeight: minHeight || undefined
        }}
      >
        <div className="w-14 h-14 rounded-xl bg-white/5 mb-2" />
        <div className="h-3 w-16 bg-white/5 rounded mb-1.5" />
        <div className="h-4 w-12 bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full animate-in fade-in zoom-in-95 ${staggerClass} ${className}`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: typeof minHeight === 'number' ? `${minHeight}px` : (minHeight || '160px 200px')
      }}
    >
      {children}
    </div>
  );
};
