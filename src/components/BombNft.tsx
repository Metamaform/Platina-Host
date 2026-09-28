import React from 'react';
import { motion } from 'motion/react';

interface BombNftProps {
  className?: string;
  animated?: boolean;
}

export const BombNft: React.FC<BombNftProps> = ({ 
  className = "w-full h-full", 
  animated = true 
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Red ambient underglow with breathing pulse */}
      {animated && (
        <motion.div
          animate={{
            scale: [0.95, 1.15, 0.95],
            opacity: [0.35, 0.7, 0.35]
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute inset-0 rounded-full bg-red-600/35 blur-md pointer-events-none"
        />
      )}

      {/* Main 3D Floating C4 Model */}
      <motion.img
        src="/bomb-planted.png"
        alt="C4 Bomb Planted"
        animate={animated ? {
          y: [-2.5, 2.5, -2.5],
          rotate: [-1.5, 1.5, -1.5],
          filter: [
            'drop-shadow(0 4px 12px rgba(239,68,68,0.5))',
            'drop-shadow(0 6px 20px rgba(239,68,68,0.9))',
            'drop-shadow(0 4px 12px rgba(239,68,68,0.5))'
          ]
        } : undefined}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="relative z-10 w-[84%] h-[84%] object-contain select-none pointer-events-none"
        draggable={false}
      />

      {/* Blinking Detonator LED */}
      <div className="absolute top-[28%] right-[30%] z-20 pointer-events-none flex items-center justify-center">
        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-80" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />
      </div>
    </div>
  );
};
