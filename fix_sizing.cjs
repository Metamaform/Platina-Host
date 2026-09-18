const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// Container padding: p-6 -> p-3 sm:p-6
content = content.replace(
  /rounded-3xl p-6 relative overflow-hidden flex justify-between/g,
  'rounded-3xl p-3 sm:p-6 relative overflow-hidden flex justify-between gap-1 sm:gap-2'
);

// Source/Target containers: w-[30%] -> w-24 sm:w-[30%]
content = content.replace(
  /w-\[30%\] shrink-0/g,
  'w-20 sm:w-[30%] shrink-0'
);

// Left Item: w-24 h-[120px] -> w-20 h-[100px] sm:w-[104px] sm:h-[136px]
content = content.replace(
  /w-24 h-\[120px\] sm:w-\[104px\] sm:h-\[136px\]/g,
  'w-20 h-[100px] sm:w-[104px] sm:h-[136px]'
);

// Wheel size: w-40 h-40 -> w-32 h-32 sm:w-56 sm:h-56
content = content.replace(
  /w-40 h-40 sm:w-56 sm:h-56/g,
  'w-32 h-32 sm:w-56 sm:h-56'
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
