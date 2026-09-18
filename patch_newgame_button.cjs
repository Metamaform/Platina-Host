const fs = require('fs');
let content = fs.readFileSync('src/components/NewGame.tsx', 'utf8');

content = content.replace(
  /'Bet for next round accepted'/g,
  `t('rocket_next_round_accepted')`
);

content = content.replace(
  /'Win taken! Bet again'/g,
  `t('rocket_win_taken')`
);

content = content.replace(
  /\`Bet \$\{userBetInRound\.betAmount\} GRAM accepted\`/g,
  `t('rocket_bet_accepted').replace('{amount}', userBetInRound.betAmount.toString())`
);

content = content.replace(
  /'Bet for next round'/g,
  `t('rocket_bet_next_round')`
);

content = content.replace(
  /'Place bet'/g,
  `t('rocket_place_bet')`
);

content = content.replace(
  />No bets in this round yet</g,
  `>{t('rocket_no_bets')}<`
);

content = content.replace(
  />\s*Be the first to bet!\s*</g,
  `>{t('rocket_be_first')}<`
);

content = content.replace(
  />\s*Great!\s*</g,
  `>{t('great')}<`
);

fs.writeFileSync('src/components/NewGame.tsx', content);
