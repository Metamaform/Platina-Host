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
          showToast(`${t('remaining')} ${Number(remaining).toFixed(isGrams ? 2 : 0)}${isGrams ? ' Gram' : ' ' + t('times')}`);
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
            initial={{ opacity: 0, y: -20, scale: 0.94 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.94 }}
            transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[250] bg-[#14151a]/95 backdrop-blur-2xl border border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.6)] rounded-full px-5 py-2.5 flex items-center gap-2.5 max-w-sm w-max"
          >
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-white text-xs font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="group relative overflow-hidden bg-white/[0.07] backdrop-blur-2xl border border-white/[0.10] p-4.5 rounded-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)] flex items-center gap-3.5 mb-4">
        {/* верхнее бликовое свечение жидкого стекла */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-4/5 h-16 rounded-full bg-white/[0.08] blur-2xl opacity-70"
        />

        <div className="relative z-10 w-11 h-11 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div className="relative z-10">
          <h2 className="font-display text-xl font-bold text-white tracking-tight leading-tight">{t('tasks_title')}</h2>
          <p className="text-white/60 text-xs mt-0.5">Выполняйте задания и получайте GRAM</p>
        </div>
      </div>

      <div className="flex relative p-1 bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] rounded-full mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <button
          onClick={() => {
            setActiveTab('daily');
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
          }}
          className={`relative z-10 flex-1 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] ${
            activeTab === 'daily'
              ? 'text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {activeTab === 'daily' && (
            <motion.div
              layoutId="tasks-tab-pill"
              className="absolute inset-0 rounded-full bg-white/[0.12] border border-white/[0.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-4px_rgba(0,0,0,0.5)] z-[-1]"
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            />
          )}
          <span className="relative z-10">{t('daily')}</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('all');
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
          }}
          className={`relative z-10 flex-1 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] ${
            activeTab === 'all'
              ? 'text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {activeTab === 'all' && (
            <motion.div
              layoutId="tasks-tab-pill"
              className="absolute inset-0 rounded-full bg-white/[0.12] border border-white/[0.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-4px_rgba(0,0,0,0.5)] z-[-1]"
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            />
          )}
          <span className="relative z-10">{t('main_tasks')}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-brand" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-rose-400 text-xs font-semibold">
          Loading error: {error}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white/[0.04] border border-white/[0.08] rounded-[24px]">
              <Calendar className="w-10 h-10 text-white/20 mb-2" />
              <p className="text-xs text-white/50 font-medium text-center">{t('no_tasks')}</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div 
                key={task.id}
                className={`group relative overflow-hidden bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] hover:border-white/[0.18] rounded-[24px] p-3.5 flex items-center gap-3.5 cursor-pointer active:scale-[0.98] transition-all duration-150 select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_25px_-10px_rgba(0,0,0,0.6)] ${
                  task.completed ? 'opacity-65 pointer-events-none' : ''
                }`}
                onClick={() => handleComplete(task)}
              >
                <div className="w-11 h-11 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center shrink-0 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {task.icon === 'telegram' ? (
                    <img src="/telegram.png" className="w-7 h-7 object-contain" alt="Telegram" />
                  ) : (
                    <Gift className={`w-5 h-5 ${task.completed ? 'text-emerald-400' : 'text-amber-400'}`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[14px] font-bold truncate text-white leading-tight">{task.title}</h3>
                  <p className="text-[11px] text-white/60 leading-tight mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 bg-amber-400/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-400 border border-amber-400/30 shadow-[0_0_8px_rgba(251,191,36,0.2)]">
                      +{task.reward} <GramIcon className="w-3 h-3 text-amber-400" />
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center justify-center">
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-md" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 group-hover:text-white">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
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
