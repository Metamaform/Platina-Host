import { useTranslation } from '../lib/i18n';
import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronRight, Gift, Calendar, CheckSquare, Loader2 } from 'lucide-react';
import { GramIcon } from './GramIcon';
import { fetchTasks, completeTask, Task } from '../lib/api';
import { getTurnover } from '../lib/stats';
import { motion, AnimatePresence } from 'motion/react';

export function Tasks({ onBalanceUpdate }: { onBalanceUpdate: (balance: number) => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'daily' | 'all'>('daily');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchTasks();
      const loadedTasks = Array.isArray(data) ? data : [];
      setTasks(loadedTasks);
      localStorage.setItem('active_tasks', JSON.stringify(loadedTasks));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTaskProgress = (task: Task) => {
    if (task.reqs) {
      return Number(localStorage.getItem(`progress_${task.id}`)) || 0;
    }
    // Fallback for older hardcoded templates without reqs
    if (task.title === 'Выиграй в Апгрейде') return Number(localStorage.getItem('stat_upgrade_wins')) || 0;
    if (task.title === 'Награда за оборот') return getTurnover();
    if (task.title === 'Победа в Сапере') return Number(localStorage.getItem('stat_mines_wins')) || 0;
    if (task.title === 'Открытие Кейсов') return Number(localStorage.getItem('stat_cases_opened')) || 0;
    if (task.title === 'Удачный Крафт') return Number(localStorage.getItem('stat_craft_wins')) || 0;
    
    return 1000; // Unrecognized/manual task without reqs always shows 100% complete logic
  };

  const getTaskTarget = (task: Task) => {
    if (task.reqs) return task.reqs.targetAmount;
    if (task.title === 'Выиграй в Апгрейде') return 5;
    if (task.title === 'Награда за оборот') return 100;
    if (task.title === 'Победа в Сапере') return 3;
    if (task.title === 'Открытие Кейсов') return 5;
    if (task.title === 'Удачный Крафт') return 3;
    return 1;
  };

  const handleComplete = async (task: Task) => {
    if (task.completed) return;
    
    const checkRequirements = (task: Task) => {
      if (task.reqs || ['Выиграй в Апгрейде', 'Награда за оборот', 'Победа в Сапере', 'Открытие Кейсов', 'Удачный Крафт'].includes(task.title)) {
        const current = getTaskProgress(task);
        const target = getTaskTarget(task);
        if (current < target) {
          const isGrams = task.reqs?.game === 'turnover' || task.title === 'Награда за оборот';
          const remaining = target - current;
          showToast(`Осталось выполнить: ${Number(remaining).toFixed(isGrams ? 2 : 0)}${isGrams ? ' Gram' : ' раз(а)'}`);
          return false;
        }
      }
      return true;
    };

    if (!checkRequirements(task)) {
      const tg = (window as any).Telegram?.WebApp;
      try {
        if (tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred) {
          tg.HapticFeedback.notificationOccurred('error');
        }
      } catch (e) {}
      return;
    }
    
    if (task.link) {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg && tg.openLink && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
          tg.openLink(task.link);
        } else {
          window.open(task.link, '_blank');
        }
      } catch (e) {
        window.open(task.link, '_blank');
      }
    }

    try {
      const res = await completeTask(task.id);
      if (res.success && res.balance !== undefined) {
        onBalanceUpdate(res.balance);
        setTasks((prev) => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
      }
    } catch (err: any) {
      console.error("Failed to complete task", err);
    }
  };

  const filteredTasks = (tasks || []).filter(t => t.type === activeTab);

  return (
    <div className="space-y-4 pt-2 relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 16, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.9 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] bg-black/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-3 w-max"
          >
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-white text-sm font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mb-6 px-1">
        <CheckSquare className="w-7 h-7 text-brand" />
        <h2 className="font-display text-2xl font-semibold">{t('tasks_title')}</h2>
      </div>

      <div className="flex relative p-1 bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-2xl mb-4">
        <button
          onClick={() => setActiveTab('daily')}
          className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-300 ${
            activeTab === 'daily'
              ? 'text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {activeTab === 'daily' && (
            <motion.div
              layoutId="tasks-tab-pill"
              className="absolute inset-0 rounded-xl bg-brand shadow-lg z-[-1]"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{t('daily')}</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-300 ${
            activeTab === 'all'
              ? 'text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {activeTab === 'all' && (
            <motion.div
              layoutId="tasks-tab-pill"
              className="absolute inset-0 rounded-xl bg-brand shadow-lg z-[-1]"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{t('main_tasks')}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-400 text-sm">
          Ошибка загрузки: {error}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-60">
              <Calendar className="w-12 h-12 text-muted mb-3" />
              <p className="text-sm text-center">{t('no_tasks')}</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div 
                key={task.id}
                className={`glass-panel-interactive rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform ${
                  task.completed ? 'opacity-70 pointer-events-none' : ''
                }`}
                onClick={() => handleComplete(task)}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                  {task.icon === 'telegram' ? (
                    <img src="/telegram.png" className="w-10 h-10 object-contain" alt="Telegram" />
                  ) : (
                    <Gift className={`w-6 h-6 ${task.completed ? 'text-emerald-400' : 'text-gold'}`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-semibold truncate text-white">{task.title}</h3>
                  <p className="text-xs text-muted leading-tight mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded text-xs font-bold text-gold border border-gold/20">
                      +{task.reward} <GramIcon className="w-3 h-3 drop-shadow-md" />
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center justify-center">
                  {task.completed ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <ChevronRight className="w-5 h-5 text-white/50" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {activeTab === 'daily' && (
        <p className="text-[10px] text-muted text-center mt-6">
          {t('daily_desc')}
        </p>
      )}
    </div>
  );
}
