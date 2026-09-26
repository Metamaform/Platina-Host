import React, { useEffect, useState, useRef } from 'react';
import lottie from 'lottie-web';
import { generateCleanPreview } from '../lib/lottieExtractor';

interface Props {
  staticMode?: boolean;
  lottieUrl?: string;
  className?: string;
  delayMs?: number;
  loop?: boolean;
  loopWithDelay?: boolean;
  loopDelayMs?: number;
  isPlaying?: boolean;
  onComplete?: () => void;
}

export const CleanModelLottie: React.FC<Props> = ({ lottieUrl, className, staticMode = false, delayMs = 0, loop = false, loopWithDelay = false, loopDelayMs = 1500, isPlaying, onComplete }) => {
  const [cleanDataUrl, setCleanDataUrl] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Lazy viewport observer: only initiate fetch & animation when approaching screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
          if (animRef.current && !staticMode) {
            try { animRef.current.play(); } catch {}
          }
        } else {
          // Pause animation offscreen to conserve CPU and battery
          if (animRef.current) {
            try { animRef.current.pause(); } catch {}
          }
        }
      },
      { rootMargin: '150px 0px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [staticMode]);

  useEffect(() => {
    let mounted = true;
    if (!lottieUrl || !isInView) return;
    
    generateCleanPreview(lottieUrl, 'Model').then((res) => {
      if (mounted) {
        if (res) {
          setCleanDataUrl(res);
        } else {
          setFailed(true);
        }
      }
    }).catch(() => {
      if (mounted) setFailed(true);
    });
    return () => { mounted = false; };
  }, [lottieUrl, isInView]);

  useEffect(() => {
    if (!cleanDataUrl || !containerRef.current) return;
    
    if (animRef.current) {
      animRef.current.destroy();
    }

    let anim: any;
    let t: any;
    try {
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: loop || false,
        autoplay: !staticMode && delayMs === 0,
        animationData: cleanDataUrl,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet'
        }
      });
      animRef.current = anim;

      if (isPlaying !== undefined) {
        if (isPlaying) {
          anim.goToAndPlay(0, true);
        } else {
          anim.goToAndStop(0, true);
        }
      } else if (staticMode) {
        anim.goToAndStop(0, true);
      } else if (delayMs > 0) {
        t = setTimeout(() => {
          anim.play();
        }, delayMs);
      }

      const onAnimComplete = () => {
        onCompleteRef.current?.();
        if (loopWithDelay) {
          setTimeout(() => {
            if (animRef.current) {
              animRef.current.goToAndPlay(0, true);
            }
          }, loopDelayMs || 1000);
        }
      };
      anim.addEventListener('complete', onAnimComplete);

      return () => {
        if (t) clearTimeout(t);
        anim.removeEventListener('complete', onAnimComplete);
        anim.destroy();
      };
    } catch (e) {
      console.error("Failed to load lottie animation:", e);
      setFailed(true);
      return;
    }
  }, [cleanDataUrl, delayMs, staticMode, loop, loopWithDelay, loopDelayMs]);

  useEffect(() => {
    if (isPlaying === undefined || !animRef.current) return;
    if (isPlaying) {
      try {
        animRef.current.goToAndPlay(0, true);
      } catch {}
    } else {
      try {
        animRef.current.goToAndStop(0, true);
      } catch {}
    }
  }, [isPlaying]);

  if (failed) {
    const fallbackUrl = (lottieUrl || '').replace('.lottie.json', '.webp').replace('.tgs', '.webp');
    return <img src={fallbackUrl || undefined} className={`${className || ''} object-contain`} alt="fallback" />;
  }

  if (!cleanDataUrl) {
    const fallbackUrl = (lottieUrl || '').replace('.lottie.json', '.webp').replace('.tgs', '.webp');
    return (
      <img 
        src={fallbackUrl || undefined} 
        className={`${className || ''} object-contain select-none pointer-events-none`} 
        alt="" 
      />
    );
  }

  const isTgs = lottieUrl?.includes('.tgs');
  return (
    <div ref={containerRef} className={`${className || ''} ${isTgs ? 'scale-[0.85] transform-gpu' : ''} flex items-center justify-center`} />
  );
};
