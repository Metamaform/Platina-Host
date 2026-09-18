export const ExplosionEffectCode = `
const ExplosionEffect = ({ pos }: { pos: { x: number, y: number } }) => {
  return (
    <div 
      className="absolute z-20 pointer-events-none"
      style={{ left: \`calc(\${pos.x / 10}% - 3.5rem)\`, top: \`calc(\${pos.y / 10}% - 3.5rem)\`, width: '7rem', height: '7rem' }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {Array.from({ length: 30 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 30;
          const velocity = 40 + Math.random() * 80;
          const tx = Math.cos(angle) * velocity;
          const ty = Math.sin(angle) * velocity;
          const color = ['#ef4444', '#f97316', '#f59e0b', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 5)];
          const size = 3 + Math.random() * 5;
          return (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: tx, y: ty, opacity: 0, scale: 0 }}
              transition={{ duration: 0.4 + Math.random() * 0.4, ease: "easeOut" }}
              className="absolute rounded-full"
              style={{ width: size, height: size, backgroundColor: color, boxShadow: \`0 0 \${size*2}px \${color}\` }}
            />
          );
        })}
        {Array.from({ length: 15 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 15;
          const velocity = 30 + Math.random() * 60;
          const tx = Math.cos(angle) * velocity;
          const ty = Math.sin(angle) * velocity;
          return (
            <motion.div
              key={\`star-\${i}\`}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
              animate={{ x: tx, y: ty, opacity: 0, scale: 1.5, rotate: 180 }}
              transition={{ duration: 0.5 + Math.random() * 0.3, ease: "easeOut" }}
              className="absolute text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"
              style={{ fontSize: 12 + Math.random() * 8, lineHeight: 1 }}
            >
              ✦
            </motion.div>
          );
        })}
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [0, 4, 0], opacity: [1, 0.8, 0] }}
          transition={{ duration: 0.3 }}
          className="absolute bg-white rounded-full"
          style={{ width: 40, height: 40, filter: 'blur(10px)', boxShadow: '0 0 30px 15px #f59e0b' }}
        />
        <motion.div
          initial={{ scale: 0, opacity: 1, borderWidth: '10px' }}
          animate={{ scale: 3, opacity: 0, borderWidth: '1px' }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute border-orange-400 rounded-full"
          style={{ width: 50, height: 50 }}
        />
      </div>
    </div>
  );
};
`
