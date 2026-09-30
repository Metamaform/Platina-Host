import React, { useState } from 'react';
import { CleanModelLottie } from './ModelCleaningAnimation';

interface PremiumImageProps {
  staticMode?: boolean;
  src?: string | null;
  alt: string;
  className?: string;
  delayMs?: number;
  loop?: boolean;
  loopWithDelay?: boolean;
  loopDelayMs?: number;
  isPlaying?: boolean;
  onAnimationComplete?: () => void;
}

export const PremiumImage: React.FC<PremiumImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  staticMode = false, 
  delayMs = 0, 
  loop = false,
  loopWithDelay = false, 
  loopDelayMs = 1500,
  isPlaying,
  onAnimationComplete 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src) {
    return <div className={`relative flex items-center justify-center overflow-hidden ${className}`}><div className="absolute inset-0 bg-white/5 rounded-xl"></div></div>;
  }

  let effectiveSrc = src;
  
  // Only convert to animated lottie/tgs if NOT in staticMode
  // In staticMode, keep the ultra-lightweight WebP image which loads with native hardware acceleration
  if (!staticMode) {
    if (effectiveSrc?.includes('artisanbrick')) {
      effectiveSrc = '/artisanbrick.lottie.json';
    } else if (effectiveSrc?.includes('nft.fragment.com') && effectiveSrc?.endsWith('.webp')) {
      effectiveSrc = effectiveSrc.replace('.webp', '.lottie.json');
    } else if (effectiveSrc?.includes('fragment.com/file/') && effectiveSrc?.endsWith('.webp')) {
      effectiveSrc = effectiveSrc.replace('.webp', '.tgs');
    }
  }

  if (effectiveSrc?.includes('.json') || effectiveSrc?.includes('.lottie') || effectiveSrc?.includes('.tgs')) {
    return (
      <CleanModelLottie 
        lottieUrl={effectiveSrc} 
        className={className} 
        staticMode={staticMode} 
        delayMs={delayMs} 
        loop={loop}
        loopWithDelay={loopWithDelay} 
        loopDelayMs={loopDelayMs} 
        isPlaying={isPlaying}
        onComplete={onAnimationComplete}
      />
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {(!loaded || error) && (
        <div className="absolute inset-0 bg-white/5 rounded-inherit">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}
      
      {!error && (
        <img
          src={effectiveSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full transition-opacity duration-500 relative z-10 ${className.includes('object-cover') ? 'object-cover' : 'object-contain'} ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};
