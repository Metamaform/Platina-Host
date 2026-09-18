const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes('/api/upgrade')) {
  const insertIndex = content.lastIndexOf('app.post("/api/state"');
  if (insertIndex !== -1) {
    const upgradeRoute = `
  app.post("/api/upgrade", requireAuth, (req, res) => {
    const { betAmount, targetPrice } = req.body;
    if (!targetPrice || targetPrice <= 0) return res.status(400).json({ error: 'Invalid target' });
    
    let chance = (betAmount / targetPrice) * 100;
    if (chance > 95) chance = 95;
    
    const win = Math.random() * 100 < chance;
    
    // Calculate final angle for animation
    const winAngle = (chance / 100) * 360;
    let finalAngle;
    if (win) {
       finalAngle = 360 - (Math.random() * winAngle);
    } else {
       finalAngle = 360 - (winAngle + Math.random() * (360 - winAngle));
    }
    
    res.json({ win, finalAngle, chance });
  });\n\n`;
    content = content.substring(0, insertIndex) + upgradeRoute + content.substring(insertIndex);
    fs.writeFileSync('server.ts', content);
    console.log('Added /api/upgrade to server.ts');
  }
}
