import React, { useState, useEffect, useRef } from 'react';
import { PremiumImage } from './PremiumImage';
import { Plus, Trash2, Edit2, Save, X, RotateCcw, Search, DownloadCloud, RefreshCw, Wand2, Check } from 'lucide-react';
import defaultGiftsDb from '../gifts_data.json';
import { fetchTelegramGifts, fetchTasks, Task } from '../lib/api';
import { Calendar } from 'lucide-react';
import { GramIcon } from './GramIcon';

interface AdminPanelProps {
  giftsDb: any[];
  setGiftsDb: (db: any[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ giftsDb, setGiftsDb }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'leaderboard' | 'system' | 'tasks' | 'cases' | 'promocodes' | 'animations'>('local');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<any>({ id: '', title: '', description: '', reward: '', type: 'daily', expiresAt: '', link: '', icon: '' });
  const [animationDownloadInput, setAnimationDownloadInput] = useState('');

  const toLocalISOString = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  useEffect(() => {
    fetch('/api/admin/tasks', {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }
    }).then(res => res.json()).then(data => {
      setTasks(Array.isArray(data) ? data : []);
    }).catch(e => console.warn("Failed tasks:", e));

    fetch('/api/admin/promocodes', {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }
    }).then(res => res.json()).then(data => {
      setPromocodes(Array.isArray(data) ? data : []);
    }).catch(e => console.warn("Failed promocodes:", e));

    fetch('/api/admin/cases', {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }
    }).then(res => res.json()).then(data => {
      setCases(Array.isArray(data) ? data : []);
    }).catch(e => console.warn("Failed cases:", e));
  }, []);
  
  const [cases, setCases] = useState<any[]>([]);
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState<any>({ code: '', type: 'gram', value: '', maxUses: 100, currentUses: 0, active: true });

  const [newCase, setNewCase] = useState<any>({ name: '', price: 100, image: '', items: [] });
  const [newCaseItem, setNewCaseItem] = useState({ giftId: '', chance: 10 });
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  const [lbConfig, setLbConfig] = useState<any>({});
  const [lbSaved, setLbSaved] = useState(false);
  
  useEffect(() => {
    fetch('/api/leaderboard/config', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setLbConfig(data));
  }, []);

  




  const [systemConfig, setSystemConfig] = useState<any>({ isMaintenance: false, whitelist: [], allowWebBypass: false, demoMode: false });
  const [whitelistInput, setWhitelistInput] = useState('');
  const [systemSaved, setSystemSaved] = useState(false);
  
  useEffect(() => {
    fetch('/api/admin/config', { headers: { Authorization: `Bearer ${sessionStorage.getItem('pg_session_token')}` } })
      .then(r => r.json())
      .then(data => {
         if (data && typeof data.isMaintenance !== 'undefined') {
            setSystemConfig(data);
            setWhitelistInput((data.whitelist || []).join(', '));
         }
      })
      .catch(e => console.warn('Failed to load system config', e));
  }, []);

  const saveSystemConfig = () => {
    const ids = whitelistInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const payload = { ...systemConfig, whitelist: ids };
    fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('pg_session_token')}` },
      body: JSON.stringify(payload)
    }).then(() => {
      setSystemSaved(true);
      setTimeout(() => {
        setSystemSaved(false);
      }, 2000);
    }).catch(e => {
      console.warn('Failed to save system config', e);
    });
  };

  // Local DB State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [nftSaved, setNftSaved] = useState(false);
  
  // Model Selection State & scroll tracking
  const [isSelectingModel, setIsSelectingModel] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isSelectingModelForCase, setIsSelectingModelForCase] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [variantCollection, setVariantCollection] = useState<string>('');
  const [variantsData, setVariantsData] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const modelListScrollRef = useRef<HTMLDivElement>(null);
  const modelScrollPos = useRef<number>(0);

  useEffect(() => {
    if (isSelectingModel && modelListScrollRef.current && modelScrollPos.current > 0) {
      modelListScrollRef.current.scrollTop = modelScrollPos.current;
    }
  }, [isSelectingModel, variantsData]);
  
  useEffect(() => {
    if ((isSelectingModel || isQuickAdding || isSelectingModelForCase) && variantCollection) {
      setIsLoadingVariants(true);
      fetch(`/api/proxy/variants?slug=${variantCollection}`)
        .then(r => r.json())
        .then(data => {
          setVariantsData(data || []);
          setIsLoadingVariants(false);
        })
        .catch(() => setIsLoadingVariants(false));
    }
  }, [isSelectingModel, isQuickAdding, isSelectingModelForCase, variantCollection]);

  // When opening modal, set initial collection
  useEffect(() => {
    if (isSelectingModel && editForm?.slug && !variantCollection) {
      setVariantCollection(editForm.slug);
    }
  }, [isSelectingModel]);

  const [selectedSlug, setSelectedSlug] = useState('berrybox');
  const [selectedNumber, setSelectedNumber] = useState('1');

  const handleSave = () => {
    if (isAdding) {
      const newId = Date.now().toString();
      const newGift = { ...editForm, id: newId };
      const newDb = [...giftsDb, newGift];
      setGiftsDb(newDb);
      setIsAdding(false);
      setEditingId(newId);
      setNftSaved(true);
      setTimeout(() => setNftSaved(false), 2000);
    } else {
      const newDb = (giftsDb || []).map(g => g.id === editingId ? { ...g, ...editForm } : g);
      setGiftsDb(newDb);
      setNftSaved(true);
      setTimeout(() => setNftSaved(false), 2000);
    }
  };

  const handleDelete = (id: string) => {
    // В iframe AI Studio window.confirm блокируется, удаляем сразу
    setGiftsDb(giftsDb.filter(g => g.id !== id));
  };

  const handleReset = () => {
    // Сбрасываем без window.confirm
    setGiftsDb(defaultGiftsDb);
  };

  const openEdit = (gift: any) => {
    setEditingId(gift.id);
    setEditForm(gift);
    setIsAdding(false);
  };

  const openAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditForm({ name: 'Новый NFT', floor_price_gram: 10, rarity: 'Common', image_url: '' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 px-2 mb-2">
        <h2 className="font-display text-2xl font-semibold">Админ Панель</h2>
        
        <div className="flex gap-2">
          <button 
            onClick={() => {
              localStorage.removeItem('welcome_seen');
              fetch('/api/admin/reset-welcome', { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` } })
                .then(() => window.location.reload());
            }}
            className="flex-1 py-2 text-sm font-bold rounded-xl transition-colors bg-brand text-white shadow-sm active:scale-95"
          >
            🔄 Сбросить онбординг
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveTab('local')}
            className={`w-full py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'local' ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-white'}`}
          >
            БД
            Модели
          </button>

          <button 
            onClick={() => setActiveTab('cases')}
            className={`w-full py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'cases' ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-white'}`}
          >
            Кейсы
          </button>
          
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`w-full py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'leaderboard' ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-white'}`}
          >
            Топ
          </button>
          
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`w-full py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'tasks' ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-white'}`}
          >
            Задания
          </button>
          
          <button 
            onClick={() => setActiveTab('promocodes')}
            className={`w-full py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'promocodes' ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-white'}`}
          >
            Промокоды
          </button>
          
          <button 
            onClick={() => setActiveTab('animations')}
            className={`w-full py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'animations' ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-white'}`}
          >
            Анимации
          </button>
          
          <button 
            onClick={() => setActiveTab('system')}
            className={`w-full col-span-2 py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'system' ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-white'}`}
          >
            Система
          </button>
          
          
        </div>

        
      </div>
      
      {activeTab === 'local' && (
      <div className="flex flex-col gap-4">
      <div className="flex justify-between gap-2 px-2 items-center">
            <div className="relative flex-1">
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:border-brand outline-none transition-colors"
                placeholder="Поиск NFT по названию..."
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleReset} className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all" title="Сбросить к заводским настройкам">
                <RotateCcw size={20} />
              </button>
              <button onClick={openAdd} className="p-2.5 bg-brand/20 text-brand rounded-xl hover:bg-brand/30 active:scale-95 transition-all" title="Добавить NFT">
                <Plus size={20} />
              </button>
              <button onClick={() => { setIsQuickAdding(true); setVariantCollection('berrybox'); }} className="p-2.5 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 active:scale-95 transition-all" title="Быстрое добавление из вариаций">
                <Wand2 size={20} />
              </button>
            </div>
          </div>

          {(editingId || isAdding) && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl mx-2">
               <h3 className="text-white font-bold text-lg">{isAdding ? 'Добавить NFT' : 'Редактировать NFT'}</h3>
               
               <div className="space-y-3">
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">Название</label>
                   <input 
                     className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand transition-colors" 
                     value={editForm.name || ''} 
                     onChange={e => setEditForm({...editForm, name: e.target.value})} 
                     placeholder="Diamond" 
                   />
                 </div>
                 
                 <div className="flex gap-3">
                   <div className="flex-1">
                     <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 flex items-center gap-1">Цена <GramIcon className="w-3 h-3 drop-shadow-md" /></label>
                     <input 
                       type="text" 
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand transition-colors" 
                       value={editForm.floor_price_gram || 0} 
                       onChange={e => setEditForm({...editForm, floor_price_gram: Number(e.target.value)})} 
                     />
                   </div>
                   <div className="flex-1">
                     <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">Редкость</label>
                     <select 
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand transition-colors appearance-none" 
                       value={editForm.rarity || 'Common'} 
                       onChange={e => setEditForm({...editForm, rarity: e.target.value})}
                     >
                       <option value="Common">Common</option>
                       <option value="Rare">Rare</option>
                       <option value="Epic">Epic</option>
                       <option value="Legendary">Legendary</option>
                       <option value="Mythic">Mythic</option>
                     </select>
                 </div>
                 </div>

                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">URL Изображения</label>
                   <input 
                     className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand transition-colors" 
                     value={editForm.image_url || ''} 
                     onChange={e => setEditForm({...editForm, image_url: e.target.value})} 
                     placeholder="https://..." 
                   />
                 </div>
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 flex items-center justify-between">
                     <span>URL Модели (Lottie JSON / .lottie)</span>
                     <button 
                       type="button" 
                       onClick={() => {
                         setIsSelectingModel(true);
                       }}
                       className="text-brand hover:text-white transition-colors"
                     >
                       Найти модель
                     </button>
                   </label>
                   <input 
                     className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand transition-colors" 
                     value={editForm.lottie_url || ''} 
                     onChange={e => setEditForm({...editForm, lottie_url: e.target.value})} 
                     placeholder="Оставьте пустым для автогенерации (если Fragment)" 
                   />
                 </div>
               </div>

               <div className="flex gap-3 mt-2">
                 <button onClick={handleSave} className={`flex-1 font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors active:scale-95 shadow-lg ${nftSaved ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20 text-white' : 'bg-brand hover:bg-brand text-white shadow-brand/20'}`}>
                   {nftSaved ? <Check size={18}/> : <Save size={18}/>} {nftSaved ? 'Сохранено!' : 'Сохранить'}
                 </button>
                 <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors active:scale-95">
                   <X size={18}/> {isAdding ? 'Отмена' : 'Закрыть'}
                 </button>
               </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {(giftsDb || [])
              .filter(gift => !dbSearch || gift.name.toLowerCase().includes(dbSearch.toLowerCase()))
              .map(gift => (
              <div key={gift.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-4 hover:bg-white/10 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-white/5 to-white/10 overflow-hidden shrink-0 border border-hairline">
                  <PremiumImage src={gift.image_url} alt={gift.name} className="w-full h-full" staticMode />
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-white font-bold text-lg truncate drop-shadow-md">{gift.name}</span>
                  <div className="flex items-center gap-1 overflow-hidden mt-0.5">
                    <span className="text-emerald-400 text-sm font-black flex items-center gap-1">{gift.floor_price_gram} <GramIcon className="w-3 h-3 drop-shadow-md" /></span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-white/20 bg-white/5 text-white/60">
                      {gift.rarity}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 pr-1">
                  <button onClick={() => openEdit(gift)} className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-colors active:scale-95">
                    <Edit2 size={18}/>
                  </button>
                  <button onClick={() => handleDelete(gift.id)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors active:scale-95">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

      
      </div>

      
      )}


      

        
        

      {isQuickAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-white/10 p-6 rounded-3xl w-full max-w-2xl flex flex-col gap-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Быстрое добавление NFT</h3>
            <p className="text-sm text-white/60">
              Выберите коллекцию и нажмите на нужную модель, чтобы мгновенно добавить её как новый NFT.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <select 
                className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand flex-1"
                value={variantCollection}
                onChange={e => setVariantCollection(e.target.value)}
              >
                {defaultGiftsDb.map(g => (
                  <option key={g.id} value={g.slug}>{g.name}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:border-brand outline-none transition-colors"
                  placeholder="Поиск вариации..."
                  value={modelSearch}
                  onChange={e => setModelSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mt-2">
              {isLoadingVariants ? (
                <div className="text-center text-white/50 p-8 text-sm w-full animate-pulse">Загрузка моделей...</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {variantsData.filter(v => !modelSearch || v.name.toLowerCase().includes(modelSearch.toLowerCase())).map((v, idx) => {
                    return (
                      <button 
                        key={idx}
                        onClick={() => {
                          const base = defaultGiftsDb.find(g => g.slug === variantCollection);
                          if (base) {
                            const existingIndex = giftsDb.findIndex(g => g.slug === variantCollection || g.name === base.name);
                            if (existingIndex !== -1) {
                              const newDb = [...giftsDb];
                              newDb[existingIndex] = {
                                ...newDb[existingIndex],
                                name: v.name,
                                image_url: v.image,
                                lottie_url: ''
                              };
                              setGiftsDb(newDb);
                            } else {
                              const newGift = {
                                ...base,
                                id: Date.now().toString(),
                                name: v.name,
                                image_url: v.image,
                                lottie_url: ''
                              };
                              setGiftsDb([...giftsDb, newGift].sort((a, b) => a.floor_price_gram - b.floor_price_gram));
                            }
                          }
                          setIsQuickAdding(false);
                        }}
                        className="relative aspect-square rounded-xl overflow-hidden flex items-center justify-center p-2 group transition-all bg-black/40 hover:bg-white/10 ring-1 ring-white/5 hover:ring-white/20"
                      >
                        <img src={v.image} alt={v.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                        
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <p className="text-[10px] font-bold text-white text-center leading-tight truncate">{v.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {!isLoadingVariants && variantsData.filter(v => v.name.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                <div className="text-center text-white/50 p-8 text-sm w-full">Вариации не найдены</div>
              )}
            </div>

            <button 
              onClick={() => setIsQuickAdding(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl mt-2 transition-colors active:scale-95"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      {isSelectingModelForCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-white/10 p-6 rounded-3xl w-full max-w-2xl flex flex-col gap-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Выбрать модель для кейса</h3>
            <p className="text-sm text-white/60">
              Выберите 3D-модель, которая будет использоваться как иконка этого кейса.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <select 
                className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand flex-1"
                value={variantCollection}
                onChange={e => setVariantCollection(e.target.value)}
              >
                {defaultGiftsDb.map(g => (
                  <option key={g.id} value={g.slug}>{g.name}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:border-brand outline-none transition-colors"
                  placeholder="Поиск вариации..."
                  value={modelSearch}
                  onChange={e => setModelSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mt-2">
              {isLoadingVariants ? (
                <div className="text-center text-white/50 p-8 text-sm w-full animate-pulse">Загрузка моделей...</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {variantsData.filter(v => !modelSearch || v.name.toLowerCase().includes(modelSearch.toLowerCase())).map((v, idx) => {
                    return (
                      <button 
                        key={idx}
                        onClick={() => {
                          setNewCase({...newCase, image: v.image});
                          setIsSelectingModelForCase(false);
                        }}
                        className="relative aspect-square rounded-xl overflow-hidden flex items-center justify-center p-2 group transition-all bg-black/40 hover:bg-white/10 ring-1 ring-white/5 hover:ring-white/20"
                      >
                        <img src={v.image} alt={v.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                        
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <p className="text-[10px] font-bold text-white text-center leading-tight truncate">{v.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {!isLoadingVariants && variantsData.filter(v => v.name.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                <div className="text-center text-white/50 p-8 text-sm w-full">Вариации не найдены</div>
              )}
            </div>

            <button 
              onClick={() => setIsSelectingModelForCase(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl mt-2 transition-colors active:scale-95"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {isSelectingModel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-white/10 p-6 rounded-3xl w-full max-w-2xl flex flex-col gap-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Библиотека 3D-моделей</h3>
                <p className="text-sm text-white/60 mt-1">
                  Выберите 3D-модель для вашего предмета. Окно остается открытым для выбора и тестирования вариантов.
                </p>
              </div>
              <button 
                onClick={() => setIsSelectingModel(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
                title="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <select 
                className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand flex-1"
                value={variantCollection}
                onChange={e => setVariantCollection(e.target.value)}
              >
                {defaultGiftsDb.map(g => (
                  <option key={g.id} value={g.slug}>{g.name}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:border-brand outline-none transition-colors"
                  placeholder="Поиск вариации..."
                  value={modelSearch}
                  onChange={e => setModelSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              </div>
            </div>

            <div 
              ref={modelListScrollRef}
              onScroll={(e) => {
                modelScrollPos.current = e.currentTarget.scrollTop;
              }}
              className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mt-2"
            >
              {isLoadingVariants ? (
                <div className="text-center text-white/50 p-8 text-sm w-full animate-pulse">Загрузка моделей...</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {variantsData.filter(v => !modelSearch || v.name.toLowerCase().includes(modelSearch.toLowerCase())).map((v, idx) => {
                    const isCurrent = editForm.image_url === v.image;
                    return (
                      <button 
                        key={idx}
                        onClick={() => {
                          setEditForm((prev: any) => ({
                            ...prev,
                            name: v.name,
                            image_url: v.image,
                            lottie_url: ''
                          }));
                          // Window stays open so the user can continue editing!
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden flex items-center justify-center p-2 group transition-all ${isCurrent ? 'bg-brand/20 ring-2 ring-brand' : 'bg-black/40 hover:bg-white/10 ring-1 ring-white/5 hover:ring-white/20'}`}
                      >
                        <img src={v.image} alt={v.name} className={`w-full h-full object-contain transition-transform duration-300 ${isCurrent ? 'scale-110' : 'group-hover:scale-110'}`} loading="lazy" />
                        
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <p className="text-[10px] font-bold text-white text-center leading-tight truncate">{v.name}</p>
                        </div>

                        {isCurrent && (
                          <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-brand flex items-center justify-center shadow-[0_0_8px_rgba(0,136,204,1)]">
                            <Check size={9} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {!isLoadingVariants && variantsData.filter(v => v.name.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                <div className="text-center text-white/50 p-8 text-sm w-full">Вариации не найдены</div>
              )}
            </div>

            <button 
              onClick={() => setIsSelectingModel(false)}
              className="w-full py-3 bg-brand hover:bg-brand text-white font-bold rounded-xl mt-2 transition-colors active:scale-95 shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
            >
              <Check size={18} /> Применить и закрыть
            </button>
          </div>
        </div>
      )}

{activeTab === 'promocodes' && (
  <div className="space-y-6">
    <div className="glass-panel rounded-xl p-4 space-y-4 border border-white/5 bg-white/5">
      <h3 className="font-semibold text-white">Добавить промокод</h3>
      <div className="space-y-2">
        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Код (например: LETO2026)" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value})} />
        
        <div className="flex gap-2">
          <select className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" value={newPromo.type} onChange={e => setNewPromo({...newPromo, type: e.target.value as 'gram'|'nft', value: ''})}>
            <option value="gram">Grams</option>
            <option value="nft">NFT</option>
          </select>
          
          {newPromo.type === 'gram' ? (
            <input type="number" className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Сумма (Grams)" value={newPromo.value} onChange={e => setNewPromo({...newPromo, value: e.target.value})} />
          ) : (
            <select className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" value={newPromo.value} onChange={e => setNewPromo({...newPromo, value: e.target.value})}>
              <option value="">Выберите NFT</option>
              {giftsDb.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
        
        <div className="flex gap-2 items-center">
          <input type="number" className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Лимит активаций (0 = без лимита)" value={newPromo.maxUses} onChange={e => setNewPromo({...newPromo, maxUses: Number(e.target.value)})} />
        </div>

        <button className="w-full py-2 bg-brand rounded-lg text-white font-bold mt-2" onClick={() => {
          if (!newPromo.code || !newPromo.value) return;
          const updated = [...promocodes, { ...newPromo, code: newPromo.code.toUpperCase() }];
          setPromocodes(updated);
          setNewPromo({ code: '', type: 'gram', value: '', maxUses: 100, currentUses: 0, active: true });
          fetch('/api/admin/promocodes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ promocodes: updated }) });
        }}>Создать промокод</button>
      </div>
    </div>
    
    <div className="space-y-2">
      <h3 className="font-semibold text-white mb-2">Активные промокоды</h3>
      {promocodes.map((p: any, idx: number) => (
        <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-bold text-white text-lg">{p.code}</div>
              <div className="text-sm text-brand">{p.type === 'gram' ? `${p.value} Grams` : (giftsDb.find((g:any)=>g.id===p.value)?.name || p.value)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                const updated = [...promocodes];
                updated[idx].active = !updated[idx].active;
                setPromocodes(updated);
                fetch('/api/admin/promocodes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ promocodes: updated }) });
              }} className={`px-2 py-1 text-xs rounded ${p.active ? 'bg-success/20 text-success' : 'bg-red-500/20 text-red-400'}`}>
                {p.active ? 'Активен' : 'Отключен'}
              </button>
              <button onClick={() => {
                const updated = promocodes.filter((_:any, i:number) => i !== idx);
                setPromocodes(updated);
                fetch('/api/admin/promocodes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ promocodes: updated }) });
              }} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="text-xs text-white/50">Активаций: {p.currentUses} / {p.maxUses === 0 ? '∞' : p.maxUses}</div>
        </div>
      ))}
    </div>
  </div>
)}

{activeTab === 'cases' && (
  <div className="space-y-6">
    <div className="glass-panel rounded-xl p-4 space-y-4 border border-white/5 bg-white/5">
      <div className="flex justify-between items-center"><h3 className="font-semibold text-white">{editingCaseId ? 'Редактировать кейс' : 'Добавить кейс'}</h3>
    {editingCaseId && <button onClick={() => { setEditingCaseId(null); setNewCase({ name: '', price: 100, image: '', items: [] }); }} className="text-xs text-brand">Отмена</button>}
</div>
      <div className="space-y-2">
        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Название кейса" value={newCase.name} onChange={e => setNewCase({...newCase, name: e.target.value})} />
        <div className="flex gap-2">
          <input type="number" className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Цена (Grams)" value={newCase.price} onChange={e => setNewCase({...newCase, price: Number(e.target.value)})} />
          <input className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="URL изображения" value={newCase.image} onChange={e => setNewCase({...newCase, image: e.target.value})} />
          <button onClick={() => { setIsSelectingModelForCase(true); setVariantCollection('berrybox'); }} className="px-3 bg-brand/20 text-brand rounded-lg hover:bg-brand/30 active:scale-95 transition-all" title="Выбрать 3D-модель для кейса">
            <Wand2 size={18}/>
          </button>
          <label className="cursor-pointer bg-white/10 px-3 flex items-center justify-center rounded-lg hover:bg-white/20 text-sm font-semibold whitespace-nowrap">
             <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (ev) => {
                   const img = new Image();
                   img.onload = () => {
                     const canvas = document.createElement('canvas');
                     const size = 256;
                     canvas.width = size;
                     canvas.height = size;
                     const ctx = canvas.getContext('2d');
                     if (ctx) {
                       const scale = Math.max(size / img.width, size / img.height);
                       const x = (size / scale - img.width) / 2;
                       const y = (size / scale - img.height) / 2;
                       ctx.drawImage(img, x, y, img.width, img.height, 0, 0, size, size);
                       setNewCase({...newCase, image: canvas.toDataURL('image/webp', 0.8)});
                     }
                   };
                   img.src = ev.target?.result as string;
                 };
                 reader.readAsDataURL(file);
               }
             }} />
             Загрузить PNG
          </label>
        </div>
        
        <div className="pt-2 border-t border-white/10">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-white">Настройка дропа</h4>
            <span className="text-xs text-white/50">{newCase.items.length} / 100 макс.</span>
          </div>
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex gap-2">
              <select className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" value={newCaseItem.giftId.startsWith('gram_') ? '' : newCaseItem.giftId} onChange={e => setNewCaseItem({...newCaseItem, giftId: e.target.value})}>
                <option value="">Выберите предмет</option>
                {giftsDb.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <input type="number" className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Или кол-во GRAM" value={newCaseItem.giftId.startsWith('gram_') ? newCaseItem.giftId.replace('gram_', '') : ''} onChange={e => setNewCaseItem({...newCaseItem, giftId: e.target.value ? 'gram_' + e.target.value : ''})} />
            </div>
            <div className="flex gap-2">
              <input type="number" className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Шанс (%)" value={newCaseItem.chance} onChange={e => setNewCaseItem({...newCaseItem, chance: Number(e.target.value)})} />
              <button className="px-4 py-2 bg-brand rounded-lg text-white font-bold disabled:opacity-50" disabled={newCase.items.length >= 100} onClick={() => {
                if (newCaseItem.giftId && newCase.items.length < 100) {
                  setNewCase({...newCase, items: [...newCase.items, { ...newCaseItem }]});
                  setNewCaseItem({ giftId: '', chance: 10 });
                }
              }}>+</button>
            </div>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {newCase.items.map((item: any, idx: number) => {
              const g = giftsDb.find(x => x.id === item.giftId);
              return (
                <div key={idx} className="flex justify-between items-center text-xs bg-white/5 p-2 rounded">
                  <span>{item.giftId.startsWith('gram_') ? item.giftId.replace('gram_', '') + ' GRAM' : (g ? g.name : item.giftId)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-brand">{item.chance}%</span>
                    <button onClick={() => {
                      setNewCase({...newCase, items: newCase.items.filter((_:any, i:number) => i !== idx)});
                    }} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className="w-full py-2 bg-brand rounded-lg text-white font-bold mt-2" onClick={() => {
          if (!newCase.name) return;
          let updated = [];
          if (editingCaseId) {
            updated = cases.map(c => c.id === editingCaseId ? { ...newCase, id: editingCaseId } : c);
          } else {
            updated = [...cases, { ...newCase, id: Date.now().toString() }];
          }
          setCases(updated);
          setEditingCaseId(null);
          setNewCase({ name: '', price: 100, image: '', items: [] });
          fetch('/api/admin/cases', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ cases: updated }) });
        }}>{editingCaseId ? 'Сохранить изменения' : 'Создать кейс'}</button>
      </div>
    </div>
    
    <div className="space-y-2">
      <h3 className="font-semibold text-white mb-2">Активные кейсы</h3>
      {cases.map((c: any) => (
        <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              {c.image && <img src={c.image || undefined} className="w-10 h-10 object-contain rounded" />}
              <div>
                <div className="font-bold text-white">{c.name}</div>
                <div className="text-sm text-gold">{c.price} Grams</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => {
                setEditingCaseId(c.id);
                setNewCase({ ...c });
                window.scrollTo({top: 0, behavior: 'smooth'});
              }} className="p-2 text-brand hover:bg-brand/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button onClick={() => {
                const updated = cases.filter((x: any) => x.id !== c.id);
                setCases(updated);
                fetch('/api/admin/cases', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ cases: updated }) });
              }} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="text-xs text-white/50">Предметов: {c.items.length}</div>
        </div>
      ))}
    </div>
  </div>
)}

{activeTab === 'tasks' && (
  <div className="space-y-6">
    <div className="glass-panel rounded-xl p-4 space-y-4 border border-white/5 bg-white/5">
      <h3 className="font-semibold text-white">Добавить задание</h3>
      <div className="flex flex-wrap gap-2 py-1">
        {[
          { title: 'Выиграй в Апгрейде', description: 'Выиграй 5 раз в апгрейде', reward: '50', type: 'daily', reqs: { game: 'upgrade', targetAmount: 5, minBet: '', minMultiplier: '' } },
          { title: 'Награда за оборот', description: 'Сделай за сегодня оборот в 100 Gram', reward: '100', type: 'daily', reqs: { game: 'turnover', targetAmount: 100, minBet: '', minMultiplier: '' } },
          { title: 'Победа в Сапере', description: 'Выиграй 3 раза в сапере', reward: '30', type: 'daily', reqs: { game: 'mines', targetAmount: 3, minBet: '', minMultiplier: '' } },
          { title: 'Открытие Кейсов', description: 'Открой 5 любых кейсов', reward: '20', type: 'daily', reqs: { game: 'cases', targetAmount: 5, minBet: '', minMultiplier: '' } },
          { title: 'Удачный Крафт', description: 'Сделай 3 крафта', reward: '40', type: 'daily', reqs: { game: 'craft', targetAmount: 3, minBet: '', minMultiplier: '' } },
        ].map((tpl, i) => (
          <button 
            key={i} 
            onClick={() => setNewTask({ ...newTask, title: tpl.title, description: tpl.description, reward: tpl.reward, type: tpl.type, reqs: tpl.reqs, link: '', icon: '' })}
            className="text-[10px] sm:text-xs px-2 py-1.5 bg-brand/10 text-brand border border-brand/20 rounded-md hover:bg-brand/20 transition-colors"
          >
            +{tpl.title}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Название (например: Подписка на канал)" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Описание" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
        <div className="flex gap-2">
          <input className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Награда (Grams)" type="text" value={newTask.reward} onChange={e => {
            const val = e.target.value.replace(',', '.');
            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
              setNewTask({...newTask, reward: val});
            }
          }} />
          <select className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value as 'daily'|'all'})}>
            <option value="daily">Ежедневное</option>
            <option value="all">Основное</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" placeholder="Ссылка (опционально, https://...)" value={newTask.link} onChange={e => setNewTask({...newTask, link: e.target.value})} />
          <input className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white" type="datetime-local" placeholder="Истекает (опционально)" value={toLocalISOString(newTask.expiresAt)} onChange={e => {
            if (e.target.value) {
              try {
                setNewTask({...newTask, expiresAt: new Date(e.target.value).toISOString()});
              } catch(err) {}
            } else {
              setNewTask({...newTask, expiresAt: ''});
            }
          }} />
        </div>
        
        {/* REQS CONFIGURATION */}
        <div className="p-3 bg-black/20 border border-white/5 rounded-lg space-y-3 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70 font-semibold w-1/3">Трекер прогресса:</span>
            <select 
              className="flex-1 bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white" 
              value={newTask.reqs?.game || ''} 
              onChange={e => {
                const val = e.target.value;
                if (!val) {
                  const { reqs, ...rest } = newTask;
                  setNewTask(rest);
                } else {
                  setNewTask({...newTask, reqs: { ...newTask.reqs, game: val, targetAmount: newTask.reqs?.targetAmount || 1 }});
                }
              }}
            >
              <option value="">Нет (Просто клик/ссылка)</option>
              <option value="upgrade">Апгрейды (победы)</option>
              <option value="mines">Сапер (победы)</option>
              <option value="craft">Крафты (успешные)</option>
              <option value="cases">Кейсы (открытия)</option>
              <option value="turnover">Оборот (Grams)</option>
            </select>
          </div>
          {newTask.reqs && newTask.reqs.game && (
            <>
              <div className="flex items-center gap-2">
                 <span className="text-xs text-white/70 font-semibold w-1/3">Сколько раз/Grams:</span>
                 <input className="flex-1 bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white" type="number" placeholder="Например: 5" value={newTask.reqs.targetAmount} onChange={e => setNewTask({...newTask, reqs: {...newTask.reqs, targetAmount: Number(e.target.value)}})} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[10px] text-white/50">Мин. ставка (опц)</span>
                  <input className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white" type="number" step="0.1" placeholder="1" value={newTask.reqs.minBet || ''} onChange={e => setNewTask({...newTask, reqs: {...newTask.reqs, minBet: e.target.value ? Number(e.target.value) : undefined}})} />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[10px] text-white/50">Мин. икс (опц)</span>
                  <input className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white" type="number" step="0.1" placeholder="2.0" value={newTask.reqs.minMultiplier || ''} onChange={e => setNewTask({...newTask, reqs: {...newTask.reqs, minMultiplier: e.target.value ? Number(e.target.value) : undefined}})} />
                </div>
              </div>
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer pt-1">
          <input type="checkbox" checked={newTask.icon === 'telegram'} onChange={e => setNewTask({...newTask, icon: e.target.checked ? 'telegram' : ''})} className="rounded bg-black/40 border-white/10" />
          <span>Отображать логотип Telegram</span>
        </label>
        <button className="w-full py-2 bg-brand rounded-lg text-white font-bold" onClick={() => {
          const finalReward = parseFloat(newTask.reward);
          if (isNaN(finalReward) || !newTask.title) return;
          const updated = [...(tasks || []), { ...newTask, id: Date.now().toString(), reward: finalReward }];
          setTasks(updated);
          setNewTask({ id: '', title: '', description: '', reward: '', type: 'daily', expiresAt: '', link: '', icon: '' });
          fetch('/api/admin/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ tasks: updated }) });
        }}>Добавить</button>
      </div>
    </div>
    
    <div className="space-y-2">
      <h3 className="font-semibold text-white mb-2">Активные задания ({(tasks || []).length})</h3>
      {(tasks || []).map(t => (
        <div key={t.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center">
          <div>
            <div className="font-bold text-white text-sm">{t.title} <span className="text-xs text-white/50">({t.type})</span></div>
            <div className="text-xs text-white/70">{t.reward} Grams</div>
            {t.expiresAt && <div className="text-[10px] text-red-400">До: {new Date(t.expiresAt).toLocaleString()}</div>}
          </div>
          <button onClick={() => {
            const updated = tasks.filter(x => x.id !== t.id);
            setTasks(updated);
            fetch('/api/admin/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ tasks: updated }) });
          }} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  </div>
)}

{activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#18181b] rounded-2xl p-6 border border-white/5 space-y-6">
               <h3 className="text-lg font-bold text-white">Технический перерыв</h3>
               <p className="text-sm text-white/60">Если включен, доступ получат только пользователи из белого списка.</p>
               
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                 <input 
                   type="checkbox" 
                   checked={systemConfig.isMaintenance || false}
                   onChange={e => setSystemConfig({ ...systemConfig, isMaintenance: e.target.checked })}
                   className="w-5 h-5 rounded border-white/20 bg-black/20 text-brand"
                 />
                 <span className="text-white font-medium">Включить технический перерыв</span>
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm text-white/60">Белый список (ID через запятую)</label>
                 <textarea
                   className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50 h-24"
                   value={whitelistInput}
                   onChange={e => setWhitelistInput(e.target.value)}
                   placeholder="1198270529, 123456789"
                 />
               </div>
               
               <div className="h-px w-full bg-white/10 my-4" />
               
               <h3 className="text-lg font-bold text-white">Доступ из браузера</h3>
               <p className="text-sm text-white/60">Если включено, в приложение можно будет зайти из обычного браузера (без проверки подписи Telegram). Вход будет происходить под тестовым пользователем.</p>
               
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                 <input 
                   type="checkbox" 
                   checked={systemConfig.allowWebBypass || false}
                   onChange={e => setSystemConfig({ ...systemConfig, allowWebBypass: e.target.checked })}
                   className="w-5 h-5 rounded border-white/20 bg-black/20 text-brand"
                 />
                 <span className="text-white font-medium">Разрешить небезопасный вход</span>
               </div>
               
               <div className="h-px w-full bg-white/10 my-4" />
               
               <h3 className="text-lg font-bold text-white">Демо режим</h3>
               <p className="text-sm text-white/60">Если включено, пополнение баланса будет происходить бесплатно (без реальной оплаты).</p>
               
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                 <input 
                   type="checkbox" 
                   checked={systemConfig.demoMode || false}
                   onChange={e => setSystemConfig({ ...systemConfig, demoMode: e.target.checked })}
                   className="w-5 h-5 rounded border-white/20 bg-black/20 text-brand"
                 />
                 <span className="text-white font-medium">Включить бесплатные пополнения</span>
               </div>
               
               <div className="h-px w-full bg-white/10 my-4" />
               
               <h3 className="text-lg font-bold text-white">Настройки бота Telegram</h3>
               <p className="text-sm text-white/60 mb-4">Настройки ссылок и изображений для бота.</p>
               
               <div className="space-y-4">
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">URL фото для /start</label>
                   <input className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50" value={systemConfig.botStartPhoto || ''} onChange={e => setSystemConfig({ ...systemConfig, botStartPhoto: e.target.value })} placeholder="https://..." />
                 </div>
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">URL фото для Пополнения</label>
                   <input className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50" value={systemConfig.botTopupPhoto || ''} onChange={e => setSystemConfig({ ...systemConfig, botTopupPhoto: e.target.value })} placeholder="https://..." />
                 </div>
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">URL фото для Вывода</label>
                   <input className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50" value={systemConfig.botWithdrawPhoto || ''} onChange={e => setSystemConfig({ ...systemConfig, botWithdrawPhoto: e.target.value })} placeholder="https://..." />
                 </div>
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">Кнопка "Тех.Поддержка" (URL)</label>
                   <input className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50" value={systemConfig.botSupportUrl || ''} onChange={e => setSystemConfig({ ...systemConfig, botSupportUrl: e.target.value })} placeholder="https://t.me/..." />
                 </div>
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">Кнопка "Наш Телеграм" (URL)</label>
                   <input className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50" value={systemConfig.botChannelUrl || ''} onChange={e => setSystemConfig({ ...systemConfig, botChannelUrl: e.target.value })} placeholder="https://t.me/..." />
                 </div>
                 <div>
                   <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">Кнопка "Начать играть!" (Mini App URL)</label>
                   <input className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50" value={systemConfig.botAppUrl || ''} onChange={e => setSystemConfig({ ...systemConfig, botAppUrl: e.target.value })} placeholder="https://t.me/..." />
                 </div>
               </div>

               <button 
                 onClick={saveSystemConfig}
                 className={`w-full mt-4 py-4 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg ${systemSaved ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-brand text-white shadow-brand/20'}`}
               >
                 {systemSaved ? 'Сохранено!' : 'Сохранить системные настройки'}
               </button>
            </div>
          </div>
        )}

      {activeTab === 'animations' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#18181b] rounded-2xl p-6 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white">Скачать анимации NFT</h3>
            <p className="text-sm text-white/60">Выберите модель из базы данных для скачивания (Lottie без фона, TGS для Telegram, WebP для превью).</p>
            
            <div className="relative">
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:border-brand outline-none transition-colors"
                placeholder="Поиск NFT по названию..."
                value={animationDownloadInput}
                onChange={(e) => setAnimationDownloadInput(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            </div>

            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {(giftsDb || [])
                .filter((gift: any) => !animationDownloadInput || gift.name.toLowerCase().includes(animationDownloadInput.toLowerCase()))
                .map((gift: any) => {
                  let baseName = '';
                  if (gift.image_url?.includes('nft.fragment.com/gift/')) {
                    baseName = gift.image_url.split('/').pop().replace('.webp', '');
                  } else {
                    baseName = gift.slug;
                  }
                  
                  const lottieUrl = gift.lottie_url || `https://nft.fragment.com/gift/${baseName}.lottie.json`;
                  // Try to guess TGS url from lottie url or base pattern
                  const tgsUrl = `https://nft.fragment.com/file/${baseName}.tgs`;
                  const webpUrl = gift.image_url || `https://nft.fragment.com/gift/${baseName}.webp`;

                  return (
                    <div key={gift.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-col gap-3 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-white/5 to-white/10 overflow-hidden shrink-0 border border-hairline">
                          <PremiumImage src={gift.image_url} alt={gift.name} className="w-full h-full" staticMode />
                        </div>
                        <div className="flex flex-col flex-1 truncate">
                          <span className="text-white font-bold text-lg truncate drop-shadow-md">{gift.name}</span>
                          <span className="text-xs text-white/40 font-mono truncate">{baseName}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => {
                             const a1 = document.createElement('a');
                             a1.href = '/api/proxy/download?url=' + encodeURIComponent(lottieUrl);
                             a1.download = `${baseName}.lottie.json`;
                             a1.target = "_blank";
                             document.body.appendChild(a1);
                             a1.click();
                             document.body.removeChild(a1);
                          }}
                          className="px-2 py-2 bg-brand/10 text-brand text-xs font-bold rounded-xl hover:bg-brand/20 active:scale-95 transition-all text-center"
                        >
                          .lottie
                        </button>
                        <button 
                          onClick={() => {
                             const a1 = document.createElement('a');
                             a1.href = '/api/proxy/download?url=' + encodeURIComponent(tgsUrl);
                             a1.download = `${baseName}.tgs`;
                             a1.target = "_blank";
                             document.body.appendChild(a1);
                             a1.click();
                             document.body.removeChild(a1);
                          }}
                          className="px-2 py-2 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-500/20 active:scale-95 transition-all text-center"
                        >
                          .tgs
                        </button>
                        <button 
                          onClick={() => {
                             const a1 = document.createElement('a');
                             a1.href = '/api/proxy/download?url=' + encodeURIComponent(webpUrl);
                             a1.download = `${baseName}.webp`;
                             a1.target = "_blank";
                             document.body.appendChild(a1);
                             a1.click();
                             document.body.removeChild(a1);
                          }}
                          className="px-2 py-2 bg-green-500/10 text-green-400 text-xs font-bold rounded-xl hover:bg-green-500/20 active:scale-95 transition-all text-center"
                        >
                          .webp
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'leaderboard' && (
      <div className="flex flex-col gap-4 px-2">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-white font-bold text-lg">Настройки лидерборда</h3>
            
            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">Дата завершения сезона</label>
              <input 
                type="datetime-local" 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand transition-colors"
                value={toLocalISOString(lbConfig.endTime).slice(0,16)}
                onChange={e => {
                  const date = new Date(e.target.value);
                  if (!isNaN(date.getTime())) {
                    setLbConfig({...lbConfig, endTime: date.toISOString()});
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button 
                  onClick={() => setLbConfig({...lbConfig, endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()})}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-brand hover:text-black transition-colors active:scale-95"
                >
                  Завершить через 1 час
                </button>
                <button 
                  onClick={() => setLbConfig({...lbConfig, endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()})} 
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-brand hover:text-black transition-colors active:scale-95"
                >
                  Через 6 часов
                </button>
                <button 
                  onClick={() => setLbConfig({...lbConfig, endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()})} 
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-brand hover:text-black transition-colors active:scale-95"
                >
                  Через 1 день
                </button>
                <button 
                  onClick={() => setLbConfig({...lbConfig, endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()})} 
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-brand hover:text-black transition-colors active:scale-95"
                >
                  Через 7 дней
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 mb-1 block">Призовых мест</label>
              <input
                type="text"
                min="1"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand transition-colors"
                value={lbConfig.places || 100}
                onChange={e => setLbConfig({...lbConfig, places: Number(e.target.value)})}
              />
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 block">Настройка призов по местам</label>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 rounded-xl">
                {Array.from({ length: Math.min(lbConfig.places || 100, 100) }).map((_, i) => {
                  const rank = i + 1;
                  const hasSpecific = lbConfig.prizes && rank in lbConfig.prizes;
                  const currentPrize = hasSpecific ? lbConfig.prizes[rank] : { url: lbConfig.prizeNftUrl, name: lbConfig.prizeNftName };
                  return (
                    <div key={rank} className="flex items-center justify-between gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                      <span className="text-sm font-bold text-white/80 whitespace-nowrap">{rank} место</span>
                      <div className="flex-1 flex items-center gap-2">
                        <select
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-brand"
                          value={currentPrize?.url || ''}
                          onChange={e => {
                            const val = e.target.value;
                            const selectedGift = giftsDb.find(g => {
                              let gVal = g.lottie_url || g.image_url;
                              if (gVal?.includes('nft.fragment.com') && gVal?.endsWith('.webp')) {
                                gVal = gVal.replace('.webp', '.lottie.json');
                              }
                              return gVal === val;
                            });
                            const newPrizes = { ...(lbConfig.prizes || {}) };
                            if (val) {
                              newPrizes[rank] = { url: val, name: selectedGift?.name || '' };
                            } else {
                              newPrizes[rank] = null;
                            }
                            setLbConfig({...lbConfig, prizes: newPrizes});
                          }}
                        >
                          <option value="">Без приза</option>
                          {(giftsDb || []).map(g => {
                            let val = g.lottie_url || g.image_url;
                            if (val?.includes('nft.fragment.com') && val?.endsWith('.webp')) {
                              val = val.replace('.webp', '.lottie.json');
                            }
                            return <option key={g.id || g.name} value={val}>{g.name}</option>;
                          })}
                        </select>
                        {currentPrize?.url && (
                          <div className="w-[42px] h-[42px] shrink-0 rounded-lg bg-black/40 flex items-center justify-center border border-white/10">
                            <PremiumImage src={currentPrize.url} alt="preview" className="w-full h-full" staticMode />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={() => {
                fetch('/api/admin/leaderboard', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` },
                  body: JSON.stringify(lbConfig)
                }).then(() => {
                  setLbSaved(true);
                  setTimeout(() => setLbSaved(false), 2000);
                });
              }}
              className={`mt-2 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors active:scale-95 shadow-lg ${lbSaved ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-brand hover:bg-brand shadow-brand/20'}`}
            >
              <Save size={18}/> {lbSaved ? 'Сохранено!' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      )}

          </div>
  );
};
