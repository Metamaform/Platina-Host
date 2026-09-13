import React from 'react';

export const GramIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <img src="/gram.webp" alt="GRAM" className={`inline-block object-contain ${className}`} />
);
