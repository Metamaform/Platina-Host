import { useTranslation } from '../lib/i18n';
import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronRight, Gift, Calendar, CheckSquare, Loader2 } from 'lucide-react';
import { GramIcon } from './GramIcon';
import { fetchTasks, completeTask, Task } from '../lib/api';
import { getTurnover } from '../lib/stats';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Шаблонные задания приходят с сервера с русскими заголовками.
 * Для полного мультиязыка известные шаблоны переводим на клиенте;
 * кастомные задания админа показываются как есть.
 */
const TASK_TITLE_KEYS: Record<string, string> = {
  'Выиграй в Апгрейде': 'task_upgrade_wins',
  'Награда за оборот': 'task_turnover',
  'Победа в Сапере': 'task_mines_win',
  'Открытие Кейсов': 'task_cases_open',
  'Удачный Крафт': 'task_craft_win',
};

export function Tasks({ onBalanceUpdate }: { onBalanceUpdate: (balance: number) => void }) {
  const { t } = useTranslation();
  const taskTitle = (title: string) => {
    const key = TASK_TITLE_KEYS[title];
    return key ? t(key) : title;
  };
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
          <p className="text-white/60 text-xs mt-0.5">{t('tasks_desc')}</p>
        </div>
      </div>

      <div className="mb-4 w-full flex rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06] relative">
        <button
          type="button"
          onClick={() => {
            setActiveTab('daily');
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch { /* optional */ }
          }}
          className="relative flex-1 py-2 text-center text-xs font-bold rounded-xl transition-colors cursor-pointer z-10"
        >
          {activeTab === 'daily' && (
            <motion.div
              layoutId="tasks-active-tab-pill"
              className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className={activeTab === 'daily' ? 'text-black' : 'text-white/60 hover:text-white'}>
            {t('daily')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch { /* optional */ }
          }}
          className="relative flex-1 py-2 text-center text-xs font-bold rounded-xl transition-colors cursor-pointer z-10"
        >
          {activeTab === 'all' && (
            <motion.div
              layoutId="tasks-active-tab-pill"
              className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className={activeTab === 'all' ? 'text-black' : 'text-white/60 hover:text-white'}>
            {t('main_tasks')}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <div className="premium-card rounded-[22px] p-4 h-20 skeleton w-full" />
          <div className="premium-card rounded-[22px] p-4 h-20 skeleton w-full" />
          <div className="premium-card rounded-[22px] p-4 h-20 skeleton w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-rose-400 text-xs font-semibold">
          {t('loading_error')}: {error}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 premium-card rounded-[24px]">
              <Calendar className="w-10 h-10 text-white/20 mb-2" />
              <p className="text-xs text-white/50 font-medium text-center">{t('no_tasks')}</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div 
                key={task.id}
                className={`premium-card rounded-[22px] p-3.5 flex items-center gap-3.5 cursor-pointer transition-transform select-none ${
                  task.completed ? 'opacity-60 pointer-events-none' : ''
                }`}
                onClick={() => handleComplete(task)}
              >
                <div className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/[0.10] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {task.icon === 'telegram' ? (
                    <img src="/telegram.png" className="w-6 h-6 object-contain" alt="Telegram" />
                  ) : (
                    <Gift className={`w-5 h-5 ${task.completed ? 'text-emerald-400' : 'text-indigo-400'}`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[14px] font-bold truncate text-white leading-tight">{taskTitle(task.title)}</h3>
                  <p className="text-[11px] text-white/60 leading-tight mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 bg-indigo-500/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-indigo-300 border border-indigo-500/30 shadow-sm">
                      +{task.reward} <GramIcon className="w-3 h-3 text-indigo-300" />
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center justify-center">
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-md" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white/50 group-hover:text-white">
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
