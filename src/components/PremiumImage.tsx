import React, { useState } from 'react';
import { CleanModelLottie } from './CleanModelLottie';

interface PremiumImageProps {
  staticMode?: boolean;
  src?: string | null;
  alt: string;
  className?: string;
  delayMs?: number;
  loopWithDelay?: boolean;
  loopDelayMs?: number;
}

export const PremiumImage: React.FC<PremiumImageProps> = ({ src, alt, className = "", staticMode = false, delayMs = 0, loopWithDelay = false, loopDelayMs = 1500 }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src) {
    return <div className={`relative flex items-center justify-center overflow-hidden ${className}`}><div className="absolute inset-0 bg-white/5 rounded-inherit"></div></div>;
  }

  let effectiveSrc = src;
  
  if (effectiveSrc?.includes('nft.fragment.com') && effectiveSrc?.endsWith('.webp')) {
    effectiveSrc = effectiveSrc.replace('.webp', '.lottie.json');
  } else if (effectiveSrc?.includes('fragment.com/file/') && effectiveSrc?.endsWith('.webp')) {
    effectiveSrc = effectiveSrc.replace('.webp', '.tgs');
  }

  if (effectiveSrc?.includes('.json') || effectiveSrc?.includes('.lottie') || effectiveSrc?.includes('.tgs')) {
    return <CleanModelLottie lottieUrl={effectiveSrc} className={className} staticMode={staticMode} delayMs={delayMs} loopWithDelay={loopWithDelay} loopDelayMs={loopDelayMs} />;
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
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full transition-opacity duration-500 relative z-10 ${className.includes('object-cover') ? 'object-cover' : 'object-contain'} ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};
