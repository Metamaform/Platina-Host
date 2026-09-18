const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const additions = {
  ru: `    'rocket_flew_away': 'Улетела!',
    'rocket_no_bets': 'В этом раунде пока нет ставок',
    'rocket_be_first': 'Сделай ставку первым!',
    'rocket_next_round_accepted': 'Ставка на следующий раунд принята',
    'rocket_win_taken': 'Выигрыш забран! Ставь еще',
    'rocket_bet_accepted': 'Ставка {amount} GRAM принята',
    'rocket_bet_next_round': 'Ставка на следующий раунд',
    'rocket_place_bet': 'Сделать ставку',
    'great': 'Отлично!',`,
  en: `    'rocket_flew_away': 'Flew away!',
    'rocket_no_bets': 'No bets in this round yet',
    'rocket_be_first': 'Be the first to bet!',
    'rocket_next_round_accepted': 'Bet for next round accepted',
    'rocket_win_taken': 'Win taken! Bet again',
    'rocket_bet_accepted': 'Bet {amount} GRAM accepted',
    'rocket_bet_next_round': 'Bet for next round',
    'rocket_place_bet': 'Place bet',
    'great': 'Great!',`,
  zh: `    'rocket_flew_away': '飞走了！',
    'rocket_no_bets': '本轮暂无下注',
    'rocket_be_first': '成为第一个下注的人！',
    'rocket_next_round_accepted': '下一轮的下注已接受',
    'rocket_win_taken': '已领取奖励！再次下注',
    'rocket_bet_accepted': '已接受 {amount} GRAM 下注',
    'rocket_bet_next_round': '下一轮下注',
    'rocket_place_bet': '下注',
    'great': '太好了！',`
};

for (const lang of Object.keys(additions)) {
  const regex = new RegExp(`(${lang}: \\{[\\s\\S]*?)(  \\}(,|\\n))`);
  content = content.replace(regex, `$1${additions[lang]}\n$2`);
}

fs.writeFileSync('src/lib/i18n.ts', content);
console.log("Updated i18n.ts");
