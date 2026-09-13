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
}

export const CleanModelLottie: React.FC<Props> = ({ lottieUrl, className, staticMode = false, delayMs = 0, loop = false, loopWithDelay = false, loopDelayMs = 1500 }) => {
  const [cleanDataUrl, setCleanDataUrl] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    if (!lottieUrl) { setFailed(true); return; }
    
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
  }, [lottieUrl]);

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
        renderer: 'canvas',
        loop: loop || false,
        autoplay: !staticMode && delayMs === 0,
        animationData: cleanDataUrl,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          clearCanvas: true
        }
      });
      animRef.current = anim;

      if (staticMode) {
        anim.goToAndStop(0, true);
      } else if (delayMs > 0) {
        t = setTimeout(() => {
          anim.play();
        }, delayMs);
      }

      if (loopWithDelay) {
        const onComplete = () => {
          setTimeout(() => {
            if (animRef.current) {
              animRef.current.goToAndPlay(0, true);
            }
          }, loopDelayMs || 1000);
        };
        anim.addEventListener('complete', onComplete);
        return () => {
          if (t) clearTimeout(t);
          anim.removeEventListener('complete', onComplete);
          anim.destroy();
        };
      }

    } catch (e) {
      console.error("Failed to load lottie animation:", e);
      setFailed(true);
      return;
    }

    return () => {
      if (t) clearTimeout(t);
      if (anim) anim.destroy();
    };
  }, [cleanDataUrl, delayMs, staticMode, loop, loopWithDelay, loopDelayMs]);

  if (failed) {
    const fallbackUrl = (lottieUrl || '').replace('.lottie.json', '.webp').replace('.tgs', '.webp');
    return <img src={fallbackUrl || undefined} className={`${className || ''} object-contain`} alt="fallback" />;
  }

  if (!cleanDataUrl) return <div className={`animate-pulse bg-white/5 ${className || ''}`} />;

  const isTgs = lottieUrl?.includes('.tgs');
  return (
    <div ref={containerRef} className={`${className || ''} ${isTgs ? 'scale-[0.85] transform-gpu' : ''} flex items-center justify-center`} />
  );
};
