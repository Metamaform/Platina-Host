const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// 1. strokeLinecap from round to butt
content = content.replace(
  'strokeLinecap="round"',
  'strokeLinecap="butt"'
);

// 2. Target item image size: from w-[60%] h-[60%] to w-[85%] h-[85%]
content = content.replace(
  'className="w-[60%] h-[60%] object-contain drop-shadow-xl"',
  'className="w-[85%] h-[85%] object-contain drop-shadow-xl"'
);

// 3. Source items size: w-10 h-10 to w-14 h-14, and image to w-[90%] h-[90%]
content = content.replace(
  '<div key={idx} className="relative w-10 h-10 bg-[#1c1d21] rounded-lg border border-white/10 flex items-center justify-center">',
  '<div key={idx} className="relative w-14 h-14 bg-[#1c1d21] rounded-[10px] border border-white/10 flex items-center justify-center">'
);

content = content.replace(
  '<PremiumImage staticMode src={src.image_url} alt={src.name} className="w-[80%] h-[80%] object-contain" />',
  '<PremiumImage staticMode src={src.image_url} alt={src.name} className="w-[90%] h-[90%] object-contain" />'
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
