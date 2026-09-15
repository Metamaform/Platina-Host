sed -i "s/В обработке/Pending/g" src/components/Inventory.tsx
sed -i "s/\* Обратите внимание: при выводе NFT выдаются случайные фоны, узоры и модели./\* Note: when withdrawing NFTs, random backgrounds, patterns and models are issued./g" src/components/Upgrade.tsx
sed -i "s/Все предметы находятся в процессе вывода./All items are currently pending withdrawal./g" src/components/Upgrade.tsx
sed -i "s/Мины/Mines/g" src/components/Upgrade.tsx
sed -i "s/Продолжить/Continue/g" src/components/Upgrade.tsx

sed -i "s/Завершено/Completed/g" src/components/Leaderboard.tsx
sed -i "s/д /d /g" src/components/Leaderboard.tsx
sed -i "s/ч /h /g" src/components/Leaderboard.tsx
sed -i "s/м /m /g" src/components/Leaderboard.tsx
sed -i "s/с/s/g" src/components/Leaderboard.tsx
sed -i "s/Ожидаемый приз по окончанию таймера/Expected prize at the end of the timer/g" src/components/Leaderboard.tsx
sed -i "s/Понятно/Got it/g" src/components/Leaderboard.tsx

sed -i "s/Минимальная сумма — 10 звезд/Minimum amount - 10 stars/g" src/components/TopUpModal.tsx
sed -i "s/Введите сумму больше 0/Enter amount greater than 0/g" src/components/TopUpModal.tsx
sed -i "s/успешно/successful/g" src/components/TopUpModal.tsx
sed -i "s/Оплата не удалась/Payment failed/g" src/components/TopUpModal.tsx
sed -i "s/Ошибка создания инвойса/Error creating invoice/g" src/components/TopUpModal.tsx
sed -i "s/Произошла ошибка при создании инвойса/An error occurred while creating invoice/g" src/components/TopUpModal.tsx
sed -i "s/Транзакция отменена или произошла ошибка/Transaction cancelled or error occurred/g" src/components/TopUpModal.tsx
sed -i "s/Подключите кошелек для пополнения баланса через TON/Connect wallet to top-up balance via TON/g" src/components/TopUpModal.tsx
sed -i "s/Ожидание.../Waiting.../g" src/components/TopUpModal.tsx

sed -i "s/Ошибка загрузки:/Loading error:/g" src/components/Tasks.tsx
sed -i "s/Осталось выполнить:/Remaining:/g" src/components/Tasks.tsx

sed -i "s/Назад/Back/g" src/components/NewGame.tsx
sed -i "s/Ставка на след. раунд/Bet for next round/g" src/components/NewGame.tsx
sed -i "s/NFT Youигрыш!/NFT Win!/g" src/components/NewGame.tsx
sed -i "s/Youигрыш зачислен на ваш игровой баланс/Winnings credited to your balance/g" src/components/NewGame.tsx
