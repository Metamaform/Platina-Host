const fs = require('fs');
let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

// The main wheel inner chevrons, change them to be more prominent like the image
content = content.replace(
  /<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fbc740" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-\[0_0_12px_rgba\(251,199,64,0.4\)\]">/g,
  '<svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#fbc740" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_15px_rgba(251,199,64,0.6)]">'
);

// Scale up the empty state arrows slightly
content = content.replace(
  /<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbc740" strokeWidth="3"/g,
  '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fbc740" strokeWidth="2.5"'
);

fs.writeFileSync('src/components/Upgrade.tsx', content);
