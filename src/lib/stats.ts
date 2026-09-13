import { Task } from './api';

export const incrementStat = (key: string, amount: number = 1) => {
  const current = Number(localStorage.getItem(key)) || 0;
  localStorage.setItem(key, String(current + amount));
};

export const recordGameProgress = (game: string, bet: number = 0, multiplier: number = 0, amount: number = 1) => {
  try {
    const tasks: Task[] = JSON.parse(localStorage.getItem('active_tasks') || '[]');
    tasks.forEach(task => {
      if (task.reqs && task.reqs.game === game) {
        const minBet = task.reqs.minBet || 0;
        const minMult = task.reqs.minMultiplier || 0;
        if (bet >= minBet && multiplier >= minMult) {
          const key = `progress_${task.id}`;
          const current = Number(localStorage.getItem(key)) || 0;
          localStorage.setItem(key, String(current + amount));
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
};

export const addTurnover = (amount: number) => {
  const today = new Date().toISOString().split('T')[0];
  const lastDate = localStorage.getItem('stat_turnover_date');
  let current = Number(localStorage.getItem('stat_turnover_today')) || 0;
  if (lastDate !== today) {
    current = 0;
    localStorage.setItem('stat_turnover_date', today);
  }
  localStorage.setItem('stat_turnover_today', String(current + amount));
  recordGameProgress('turnover', amount, 0, amount);
};

export const getTurnover = () => {
  const today = new Date().toISOString().split('T')[0];
  if (localStorage.getItem('stat_turnover_date') !== today) return 0;
  return Number(localStorage.getItem('stat_turnover_today')) || 0;
};
