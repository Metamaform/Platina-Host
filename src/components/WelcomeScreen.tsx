import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { useTranslation } from '../lib/i18n';
import { Player } from '@lottiefiles/react-lottie-player';
import { Sparkles, Gamepad2, Wallet, Box, Bomb, ArrowUpCircle } from 'lucide-react';
import { GramIcon } from './GramIcon';

interface WelcomeScreenProps {
  onComplete: () => void;
  token: string | null;
}

const Visual1 = () => (
  <div className="w-64 h-64">
    <Player autoplay loop src="/stellarrocket-1-nobg.lottie.json" style={{ width: '100%', height: '100%' }} />
  </div>
);

const nftsForMarquee = [
  "/chillflame-1.lottie.json",
  "/holidaydrink-1.lottie.json",
  "/diamondring-1.lottie.json",
  "/swagbag-1.lottie.json",
  "/crystalball-1.lottie.json",
];

const MarqueeNFT = ({ src, index, total }: { src: string; index: number; total: number }) => {
  const controls = useAnimation();
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    const duration = 8; // Faster animation
    const delay = index * (duration / total); // Evenly spaced

    const animateItem = async () => {
      // Initial stagger
      await new Promise(r => setTimeout(r, delay * 1000));
      
      while (active) {
        if (playerRef.current) {
          playerRef.current.stop();
          playerRef.current.play();
        }
        
        const startX = typeof window !== 'undefined' ? window.innerWidth / 2 + 60 : 500;
        const endX = typeof window !== 'undefined' ? -window.innerWidth / 2 - 60 : -500;
        
        await controls.start({
          x: [startX, endX],
          transition: { duration, ease: "linear" }
        });
      }
    };

    animateItem();
    return () => { active = false; };
  }, [controls, index, total]);

  const initialX = typeof window !== 'undefined' ? window.innerWidth / 2 + 60 : 500;

  return (
    <motion.div
      animate={controls}
      initial={{ x: initialX }}
      className="absolute w-28 h-28 shrink-0 will-change-transform"
    >
      <Player
        ref={playerRef}
        autoplay={false}
        loop={false}
        src={src}
        style={{ width: '100%', height: '100%' }}
      />
    </motion.div>
  );
};

const Visual2 = () => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    {nftsForMarquee.map((src, i) => (
      <MarqueeNFT key={i} src={src} index={i} total={nftsForMarquee.length} />
    ))}
  </div>
);

const Visual3 = () => (
  <div className="relative flex items-center justify-center scale-125 w-full h-full">
    {/* Floating background elements */}
    <motion.div 
      animate={{ y: [-5, 5, -5], rotate: [-5, 5, -5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-4 left-6 opacity-40 blur-[1px]"
    >
      <GramIcon className="w-5 h-5 drop-shadow-lg" />
    </motion.div>
    
    <motion.div 
      animate={{ y: [5, -5, 5], rotate: [10, -10, 10] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute bottom-6 right-8 opacity-50 blur-[0.5px]"
    >
      <GramIcon className="w-7 h-7 drop-shadow-lg" />
    </motion.div>
    
    <motion.div 
      animate={{ y: [-3, 3, -3], rotate: [0, 15, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      className="absolute -top-2 right-12 opacity-30 blur-[2px]"
    >
      <GramIcon className="w-4 h-4 drop-shadow-lg" />
    </motion.div>
    
    <motion.div 
      animate={{ y: [4, -4, 4], rotate: [-15, 0, -15] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      className="absolute bottom-10 left-10 opacity-60"
    >
      <GramIcon className="w-6 h-6 drop-shadow-lg" />
    </motion.div>

    <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center z-10 shadow-[0_0_30px_rgba(16,185,129,0.2)] border border-emerald-500/20">
      <Wallet size={48} />
    </div>
  </div>
);

export function WelcomeScreen({ onComplete, token }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const [[page, direction], setPage] = useState([0, 0]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const steps = [
    {
      badge: t('onboarding_badge_1'),
      badgeIcon: Sparkles,
      badgeColor: 'text-brand bg-brand/20',
      title: t('onboarding_title_1'),
      desc: t('onboarding_desc_1'),
      Visual: Visual1
    },
    {
      badge: t('onboarding_badge_2'),
      badgeIcon: Gamepad2,
      badgeColor: 'text-[#4ADE80] bg-[#4ADE80]/20',
      title: t('onboarding_title_2'),
      desc: t('onboarding_desc_2'),
      Visual: Visual2
    },
    {
      badge: t('onboarding_badge_3'),
      badgeIcon: Wallet,
      badgeColor: 'text-violet-400 bg-violet-500/20',
      title: t('onboarding_title_3'),
      desc: t('onboarding_desc_3'),
      Visual: Visual3
    }
  ];

  const paginate = (newDirection: number) => {
    const newPage = page + newDirection;
    if (newPage >= 0 && newPage < steps.length) {
      setPage([newPage, newDirection]);
    }
  };

  const handleStart = async () => {
    if (status === 'loading') return;
    setStatus('loading');

    try {
      if (!token) throw new Error('No token');
      
      const res = await fetch('/api/user/welcome-seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to save status');
      
      try {
        localStorage.setItem('welcome_seen', 'true');
      } catch (e) {}
      
      onComplete();
    } catch (e) {
      console.error('Welcome screen error:', e);
      setStatus('error');
    }
  };

  const handleNext = () => {
    if (page < steps.length - 1) {
      paginate(1);
    } else {
      handleStart();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    })
  };

  const stepConfig = steps[page];
  const BadgeIcon = stepConfig.badgeIcon;
  const Visual = stepConfig.Visual;

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-[#000000e6] flex flex-col justify-end"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full bg-[#111114] rounded-t-[28px] flex flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+16px)] will-change-transform"
        style={{ height: '88dvh' }}
      >
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 400, damping: 40 }, opacity: { duration: 0.2 } }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x;
                if (swipe < -50 || (swipe < -20 && velocity.x < -500)) paginate(1);
                else if (swipe > 50 || (swipe > 20 && velocity.x > 500)) paginate(-1);
              }}
              className="absolute inset-0 flex flex-col w-full h-full will-change-transform"
            >
              {/* Image Area */}
              <div className="h-[48%] bg-[#1C1C1E] flex items-center justify-center p-6 relative">
                 <Visual />
              </div>

              {/* Content Area */}
              <div className="h-[52%] px-6 pt-10 pb-4 flex flex-col items-start text-left">
                 <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[13px] font-bold mb-4 ${stepConfig.badgeColor}`}>
                   <BadgeIcon size={16} /> {stepConfig.badge}
                 </div>
                 
                 <h2 className="text-[28px] font-bold text-white mb-3 leading-tight tracking-tight">
                   {stepConfig.title}
                 </h2>
                 
                 <p className="text-white/60 text-[16px] leading-[1.6]">
                   {stepConfig.desc}
                 </p>
                 
                 {status === 'error' && (
                   <div className="text-red-400 text-[14px] mt-4 bg-red-400/10 px-4 py-2 rounded-[10px] w-full text-center">
                     {t('welcome_error')}
                   </div>
                 )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Fixed Dots aligned to bottom of image area */}
          <div className="absolute top-[48%] left-0 w-full flex justify-center gap-1.5 mt-4 z-10 pointer-events-none">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white/20'}`} />
            ))}
          </div>
        </div>

        {/* Fixed Button */}
        <div className="px-6 pt-2 pb-2 mt-auto">
          <button
            onClick={handleNext}
            disabled={status === 'loading'}
            className="w-full bg-white text-black font-bold text-[17px] py-[18px] rounded-[16px] shadow-lg hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center"
          >
            {status === 'loading' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('welcome_loading')}
              </span>
            ) : status === 'error' ? (
              t('welcome_retry')
            ) : (
              page === steps.length - 1 ? t('onboarding_start') : t('onboarding_next')
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
