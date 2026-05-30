import React, { useState, useRef, useEffect } from "react";
import { Camera, Plus, Loader2, GlassWater, Utensils, Droplets, Trash2, CalendarDays, ChevronLeft, ChevronRight, BarChart3, Activity, Settings, User, Sparkles, Scale, Save, X } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { id } from "date-fns/locale";
import * as genericMotion from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, LineChart, Line } from 'recharts';

import { useJournal, Meal } from "./hooks/useJournal";
import { estimateCaloriesFromImage, estimateCaloriesFromText, getNutritionAdvice, getMealSuggestion } from "./lib/gemini";
import { cn, fileToBase64 } from "./lib/utils";

// Expose motion components
const motion = genericMotion.motion;
const AnimatePresence = genericMotion.AnimatePresence;

const MEAL_CATEGORIES: { id: Meal['category']; label: string; icon: any }[] = [
  { id: 'breakfast', label: 'Sarapan', icon: Utensils },
  { id: 'lunch', label: 'Makan Siang', icon: Utensils },
  { id: 'dinner', label: 'Makan Malam', icon: Utensils },
  { id: 'snack', label: 'Camilan', icon: Plus },
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'achievements' | 'profile'>('daily');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Meal['category']>('breakfast');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isEstimatingManual, setIsEstimatingManual] = useState(false);
  const [manualMeal, setManualMeal] = useState({ name: '', calories: '', p: '', c: '', f: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getDayRecord, addMeal, deleteMeal, setWater, updateWeight, getWeeklyStats, getStreak, getAchievements, calculateTDEE, profile, setProfile } = useJournal();

  const record = getDayRecord(currentDate);
  const totalCalories = record.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = record.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = record.meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = record.meals.reduce((sum, m) => sum + (m.fat || 0), 0);
  const streak = getStreak();
  const achievements = getAchievements();
  const weeklyStats = getWeeklyStats(currentDate);

  const remainingCalories = Math.max(0, profile.goalCalories - totalCalories);

  const syncGoalsWithTDEE = () => {
    const tdee = calculateTDEE(profile);
    // Standard Macro Split: 30% Protein, 45% Carbs, 25% Fat
    const p = Math.round((tdee * 0.3) / 4);
    const c = Math.round((tdee * 0.45) / 4);
    const f = Math.round((tdee * 0.25) / 9);
    
    setProfile({
      ...profile,
      goalCalories: tdee,
      goalProtein: p,
      goalCarbs: c,
      goalFat: f
    });
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const objectUrl = URL.createObjectURL(file);
      setAnalyzingImage(objectUrl);

      const base64 = await fileToBase64(file);
      const estimation = await estimateCaloriesFromImage(base64, file.type);
      
      addMeal(currentDate, {
        name: estimation.name,
        calories: estimation.calories,
        protein: estimation.protein,
        carbs: estimation.carbs,
        fat: estimation.fat,
        category: selectedCategory,
        image: objectUrl
      });
      
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Gagal menganalisis gambar. Coba lagi!");
    } finally {
      setIsAnalyzing(false);
      setAnalyzingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadAiAdvice = async () => {
    if (record.meals.length === 0) return;
    setIsGettingAdvice(true);
    const mealNames = record.meals.map(m => m.name);
    const advice = await getNutritionAdvice(mealNames, totalCalories, profile.goalCalories);
    setAiAdvice(advice);
    setIsGettingAdvice(false);
  };

  const loadMealSuggestion = async () => {
    setIsGettingSuggestion(true);
    const now = new Date();
    const hours = now.getHours();
    let timeOfDay = "malam";
    if (hours < 11) timeOfDay = "pagi";
    else if (hours < 15) timeOfDay = "siang";
    else if (hours < 19) timeOfDay = "sore";

    const suggestion = await getMealSuggestion(remainingCalories, timeOfDay);
    setAiSuggestion(suggestion);
    setIsGettingSuggestion(false);
  };

  const handleManualAdd = async () => {
    if (!manualMeal.name) return;
    
    setIsEstimatingManual(true);
    try {
      // Use AI to estimate nutrients from the description
      const result = await estimateCaloriesFromText(manualMeal.name);
      
      addMeal(currentDate, {
        name: result.name || manualMeal.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        category: selectedCategory,
      });
      
      setManualMeal({ name: '', calories: '', p: '', c: '', f: '' });
      setIsManualModalOpen(false);
    } catch (error) {
      console.error("Manual estimation failed, falling back to basic entry", error);
      // If AI fails, we could show an error or fall back. 
      // But user wants it simple, so let's just alert for now or try to save with 0s
      alert("Gagal menganalisis makanan. Coba tulis lebih detail (misal: '1 porsi nasi goreng').");
    } finally {
      setIsEstimatingManual(false);
    }
  };

  const nextDay = () => setCurrentDate(addDays(currentDate, 1));
  const prevDay = () => setCurrentDate(subDays(currentDate, 1));

  return (
    <div className="min-h-screen skeuo-bg text-slate-700 font-sans pb-24 selection:bg-purple-200">
      
      {/* Header */}
      <header className="sticky top-0 z-20 w-full skeuo-plastic-purple p-4 rounded-b-3xl shadow-xl">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('profile')}
              className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all", activeTab === 'profile' ? "bg-white/20" : "")}
            >
              <Settings className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md flex items-center gap-2">
              <Activity className="w-5 h-5 text-white" />
              Nutri<span className="font-light opacity-90">Tracker</span>
            </h1>
            <div className="w-10 flex justify-end relative">
               <User className="w-6 h-6 text-white/50" />
               {streak > 0 && (
                 <div className="absolute -top-1 -right-1 bg-orange-500 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center text-white border border-white/20 shadow-sm">
                   {streak}
                 </div>
               )}
            </div>
          </div>

          <div className="flex p-1 skeuo-tab-container rounded-full overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('daily')}
              className={cn(
                "flex-1 py-1.5 px-4 text-xs font-black rounded-full transition-all duration-300 whitespace-nowrap",
                activeTab === 'daily' ? "skeuo-tab-active" : "text-white/80"
              )}
            >
              Harian
            </button>
            <button 
              onClick={() => setActiveTab('weekly')}
              className={cn(
                "flex-1 py-1.5 px-4 text-xs font-black rounded-full transition-all duration-300 whitespace-nowrap",
                activeTab === 'weekly' ? "skeuo-tab-active" : "text-white/80"
              )}
            >
              Progres
            </button>
            <button 
              onClick={() => setActiveTab('achievements')}
              className={cn(
                "flex-1 py-1.5 px-4 text-xs font-black rounded-full transition-all duration-300 whitespace-nowrap",
                activeTab === 'achievements' ? "skeuo-tab-active" : "text-white/80"
              )}
            >
              Medali
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 mt-2">
        
        {activeTab === 'daily' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Navigasi Tanggal */}
            <div className="flex items-center justify-between mx-2">
              <button onClick={prevDay} className="w-10 h-10 rounded-full skeuo-btn flex items-center justify-center text-slate-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="px-6 py-2 rounded-2xl skeuo-screen flex flex-col items-center min-w-[180px] border-4 border-slate-700/10">
                <span className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{format(currentDate, 'EEEE', { locale: id })}</span>
                <span className="text-base font-black">{format(currentDate, 'dd MMMM yyyy', { locale: id })}</span>
              </div>

              <button onClick={nextDay} className="w-10 h-10 rounded-full skeuo-btn flex items-center justify-center text-slate-600">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* AI Insight Box */}
            <AnimatePresence>
              {(record.meals.length > 0 || aiAdvice) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="skeuo-raised-green rounded-3xl p-4 overflow-hidden border border-emerald-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <Sparkles className="w-4 h-4" /> AI Nutritionist
                    </div>
                    {record.meals.length > 0 && !aiAdvice && (
                      <button 
                        onClick={loadAiAdvice}
                        disabled={isGettingAdvice}
                        className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-bold shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isGettingAdvice ? 'Berpikir...' : 'Dapatkan Saran'}
                      </button>
                    )}
                  </div>
                  {aiAdvice ? (
                    <p className="text-sm text-slate-700 leading-relaxed italic">"{aiAdvice}"</p>
                  ) : (
                    <p className="text-[10px] text-emerald-600/70 font-medium">Klik tombol untuk evaluasi menu hari ini.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dashboard Utama */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="skeuo-raised-orange rounded-3xl p-5 flex flex-col items-center gap-3">
                  <h3 className="font-bold text-orange-900 flex items-center gap-1.5 text-[10px] uppercase">
                    <Utensils className="w-3.5 h-3.5" /> Kalori
                  </h3>
                  <div className="skeuo-screen-amber rounded-xl w-full py-3 flex flex-col items-center justify-center">
                    <div className="text-2xl font-black">{totalCalories}</div>
                    <div className="text-[8px] uppercase font-bold">/ {profile.goalCalories} kkal</div>
                  </div>
                  <div className="w-full h-2.5 skeuo-track-orange overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (totalCalories / profile.goalCalories) * 100)}%` }}
                      className={cn("h-full rounded-full", totalCalories > profile.goalCalories ? "bg-red-500" : "bg-orange-500")}
                    />
                  </div>
                </div>

                <div className="skeuo-raised-blue rounded-3xl p-5 flex flex-col items-center gap-3">
                  <h3 className="font-bold text-sky-900 flex items-center gap-1.5 text-[10px] uppercase">
                    <Droplets className="w-3.5 h-3.5" /> Hidrasi
                  </h3>
                  <div className="flex items-center gap-3 mb-1">
                    <button 
                      onClick={() => setWater(currentDate, record.waterGlasses - 1)} 
                      className="w-10 h-10 rounded-full skeuo-btn-blue text-sky-700 font-bold flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="text-xl">-</span>
                    </button>
                    <div className="h-20 w-10 skeuo-track-blue relative overflow-hidden flex flex-col justify-end p-1 border-2 border-sky-200">
                      <motion.div animate={{ height: `${Math.min(100, (record.waterGlasses / 8) * 100)}%` }} className="w-full rounded-full skeuo-water" />
                    </div>
                    <button 
                      onClick={() => setWater(currentDate, record.waterGlasses + 1)} 
                      className="w-10 h-10 rounded-full skeuo-btn-blue text-sky-700 font-bold flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="text-xl">+</span>
                    </button>
                  </div>
                  <div className="text-xs font-bold text-sky-800">{record.waterGlasses}/8 <span className="opacity-60">Gelas</span></div>
                </div>
              </div>

              {/* Macro Bar */}
              <div className="skeuo-raised rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase">Status Makro Nutrisi</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                       <div className="w-2 h-2 rounded-full bg-red-500"/>
                       <span className="text-[9px] font-bold text-slate-800">{totalProtein}/{profile.goalProtein}g</span>
                    </div>
                    <div className="flex items-center gap-1">
                       <div className="w-2 h-2 rounded-full bg-blue-500"/>
                       <span className="text-[9px] font-bold text-slate-800">{totalCarbs}/{profile.goalCarbs}g</span>
                    </div>
                    <div className="flex items-center gap-1">
                       <div className="w-2 h-2 rounded-full bg-orange-500"/>
                       <span className="text-[9px] font-bold text-slate-800">{totalFat}/{profile.goalFat}g</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-4 skeuo-pressed rounded-full flex overflow-hidden border border-slate-200">
                   <motion.div animate={{ width: `${Math.min(33, (totalProtein / profile.goalProtein) * 33)}%` }} className="h-full bg-red-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]" />
                   <motion.div animate={{ width: `${Math.min(33, (totalCarbs / profile.goalCarbs) * 33)}%` }} className="h-full bg-blue-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]" />
                   <motion.div animate={{ width: `${Math.min(34, (totalFat / profile.goalFat) * 34)}%` }} className="h-full bg-orange-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]" />
                </div>
              </div>
            </div>

            {/* Daily Quests - Interactive Feature */}
            <div className="skeuo-raised rounded-3xl p-5 border-l-8 border-orange-500 bg-orange-50/30">
               <div className="flex items-center gap-2 mb-4 text-orange-800 font-black text-xs uppercase tracking-widest">
                  <Plus className="w-4 h-4" /> Misi Harian
               </div>
               <div className="space-y-3">
                 {[
                   { label: 'Minum 2 Gelas Air', done: record.waterGlasses >= 2 },
                   { label: 'Catat Sarapan Sehat', done: record.meals.some(m => m.category === 'breakfast') },
                   { label: 'Protein > 30g', done: totalProtein >= 30 },
                 ].map((q, i) => (
                   <div key={i} className="flex items-center gap-3 p-3 skeuo-quest-card rounded-xl">
                      <div className={cn("w-5 h-5 rounded-md border-2 border-slate-300 flex items-center justify-center transition-all", q.done ? "bg-orange-500 border-orange-600" : "bg-white")}>
                        {q.done && <ChevronRight className="w-3 h-3 text-white rotate-90" />}
                      </div>
                      <span className={cn("text-xs font-bold", q.done ? "text-slate-400 line-through" : "text-slate-700")}>{q.label}</span>
                   </div>
                 ))}
               </div>
            </div>

            {/* AI Suggestion Section */}
            <div className="skeuo-raised-purple rounded-3xl p-5 border border-purple-100 shadow-lg group">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                       <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-purple-900">Apa yang sebaiknya saya makan?</h4>
                      <p className="text-[8px] font-bold text-purple-500 uppercase">Sisa: {remainingCalories} kkal</p>
                    </div>
                 </div>
                 <button 
                  onClick={loadMealSuggestion}
                  disabled={isGettingSuggestion}
                  className="skeuo-plastic-purple px-4 py-2 rounded-xl text-[10px] font-black text-white active:scale-95 disabled:opacity-50"
                 >
                   {isGettingSuggestion ? 'Mencari...' : 'Ide Menu'}
                 </button>
               </div>
               
               <AnimatePresence>
                 {aiSuggestion && (
                   <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-purple-200/50"
                   >
                     <p className="text-xs text-slate-700 leading-relaxed font-medium italic">"{aiSuggestion}"</p>
                     <button onClick={() => setAiSuggestion(null)} className="mt-2 text-[9px] text-purple-400 font-bold hover:text-purple-600">Tutup</button>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Berat Badan & Kategori Selektor */}
            <div className="grid grid-cols-2 gap-4">
               <div className="skeuo-raised rounded-2xl p-4 flex flex-col gap-2">
                 <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase">
                   <Scale className="w-3.5 h-3.5" /> Berat Badan
                 </div>
                 <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={record.weight || ''} 
                      onChange={(e) => updateWeight(currentDate, parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                      className="w-full skeuo-pressed rounded-lg px-2 py-1.5 text-center font-black text-slate-700 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-400">kg</span>
                 </div>
               </div>

               <div className="skeuo-raised rounded-2xl p-3 flex flex-col gap-2">
                 <div className="text-slate-500 font-bold text-[10px] uppercase mb-1">Kategori Berikutnya</div>
                 <div className="grid grid-cols-2 gap-1.5">
                   {MEAL_CATEGORIES.map(cat => (
                     <button
                       key={cat.id}
                       onClick={() => setSelectedCategory(cat.id)}
                       className={cn(
                         "text-[8px] font-black py-1.5 rounded-lg border transition-all",
                         selectedCategory === cat.id ? "bg-purple-600 text-white shadow-lg border-purple-700" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                       )}
                     >
                       {cat.label}
                     </button>
                   ))}
                 </div>
               </div>
            </div>

            {/* Log Makanan */}
            <div className="skeuo-raised rounded-3xl overflow-hidden relative shadow-inner">
               <div className="px-6 py-6 pb-20">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                       Daftar Makan
                       <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full">{record.meals.length}</span>
                    </h2>
                    <button 
                      onClick={() => setIsManualModalOpen(true)}
                      className="text-[10px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 active:scale-95"
                    >
                      Tambah Manual
                    </button>
                  </div>
                  <div className="space-y-3">
                    {record.meals.map(meal => (
                      <div key={meal.id} className="flex items-center gap-3 skeuo-btn p-3 rounded-2xl group">
                        {meal.image ? (
                          <img src={meal.image} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/50" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl skeuo-pressed flex items-center justify-center text-slate-400">
                             <Utensils className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                           <div className="text-[8px] font-bold text-purple-600 uppercase tracking-tighter mb-0.5">
                             {MEAL_CATEGORIES.find(c => c.id === meal.category)?.label || 'Makanan'}
                           </div>
                           <h4 className="font-black text-slate-800 text-sm truncate">{meal.name}</h4>
                        </div>
                        <div className="text-right">
                           <div className="font-black text-orange-600 text-xs">{meal.calories} kkal</div>
                           <button onClick={() => deleteMeal(currentDate, meal.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </div>
                    ))}
                    {isAnalyzing && (
                      <div className="flex items-center gap-3 skeuo-pressed p-3 rounded-2xl animate-pulse">
                         <div className="w-12 h-12 rounded-xl bg-slate-300" />
                         <div className="flex-1 space-y-2">
                           <div className="h-2 w-16 bg-slate-300 rounded" />
                           <div className="h-3 w-32 bg-slate-300 rounded" />
                         </div>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'weekly' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
             <div className="skeuo-raised rounded-3xl p-6">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" /> Analisis Kalori
                </h3>
                <div className="h-56 skeuo-pressed rounded-2xl p-2 pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyStats}>
                      <defs>
                        <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="dayName" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="calories" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorCal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="skeuo-raised rounded-3xl p-6">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-600" /> Tren Berat Badan
                </h3>
                <div className="h-56 skeuo-pressed rounded-2xl p-2 pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="dayName" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="stepAfter" dataKey="weight" stroke="#0891b2" strokeWidth={3} dot={{ r: 4, fill: '#0891b2' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="skeuo-raised rounded-3xl p-6 text-center">
                <div className="w-20 h-20 skeuo-plastic-gold rounded-full mx-auto flex items-center justify-center mb-4">
                  <Activity className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-black text-slate-800">Galeri Medali</h2>
                <p className="text-xs text-slate-500 font-bold">Terus konsisten untuk koleksi semua!</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                {achievements.length > 0 ? achievements.map(ach => (
                  <div key={ach.id} className="skeuo-badge p-5 rounded-3xl flex flex-col items-center text-center gap-2">
                    <span className="text-4xl mb-1">{ach.icon}</span>
                    <h4 className="text-xs font-black text-slate-800 leading-tight">{ach.title}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{ach.desc}</p>
                  </div>
                )) : (
                  <div className="col-span-2 py-20 text-center text-slate-400 italic">
                    Belum ada medali. Mulai mencatat hari ini!
                  </div>
                )}
             </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-10">
            <div className="skeuo-raised rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-3xl skeuo-plastic-purple flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Profil & Usia</h2>
                  <p className="text-xs text-slate-500 font-bold">Aplikasi akan menyesuaikan untuk Anda</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Nama Lengkap', key: 'name', type: 'text' },
                  { label: 'Berat Badan (kg)', key: 'weight', type: 'number' },
                  { label: 'Tinggi Badan (cm)', key: 'height', type: 'number' },
                  { label: 'Usia', key: 'age', type: 'number' },
                  { label: 'Level Aktivitas (1.2 - 1.9)', key: 'activityLevel', type: 'number' },
                ].map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 ml-2">{field.label}</label>
                    <input 
                      type={field.type}
                      value={(profile as any)[field.key] || ''}
                      onChange={(e) => setProfile({ ...profile, [field.key]: field.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value })}
                      className="skeuo-pressed rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                ))}

                <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] uppercase font-black text-slate-400 ml-2">Jenis Kelamin</label>
                   <select 
                    value={profile.gender}
                    onChange={(e) => setProfile({...profile, gender: e.target.value as any})}
                    className="skeuo-pressed rounded-xl px-4 py-3 font-bold text-slate-800 outline-none"
                   >
                     <option value="male">Laki-laki</option>
                     <option value="female">Perempuan</option>
                   </select>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button 
                  onClick={syncGoalsWithTDEE}
                  className="w-full py-4 rounded-xl skeuo-plastic-green font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Sparkles className="w-5 h-5" /> Hitung Target Otomatis (TDEE)
                </button>
                
                <button 
                  onClick={() => setActiveTab('daily')}
                  className="w-full py-4 rounded-xl skeuo-plastic-cyan font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Save className="w-5 h-5" /> Simpan Manual
                </button>
              </div>
              
              <div className="mt-6 p-4 rounded-2xl skeuo-screen-amber text-[10px] leading-relaxed italic">
                *Target otomatis menggunakan rumus Harris-Benedict yang disesuaikan dengan usia dan tingkat aktivitas Anda untuk hasil paling akurat.
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* Footer / Credit */}
      <div className="text-center pb-8 pt-4">
        <a 
          href="https://github.com/titanadhitya16" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-slate-400 hover:text-purple-600 transition-colors uppercase tracking-widest"
        >
          Design & Develop by Tan
        </a>
      </div>

      {/* Floating Action Button */}
      {activeTab === 'daily' && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full skeuo-metal p-2 shadow-2xl flex items-center justify-center relative">
              <button
                onClick={handleCaptureClick}
                disabled={isAnalyzing}
                className="w-full h-full rounded-full skeuo-plastic-rose flex items-center justify-center border-4 border-slate-700/20 active:scale-95 transition-all"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsManualModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm skeuo-raised bg-white rounded-3xl p-8"
            >
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="w-6 h-6 text-purple-600" /> Tambah Manual
              </h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Apa yang kamu makan?</label>
                    <textarea 
                      value={manualMeal.name}
                      onChange={e => setManualMeal({...manualMeal, name: e.target.value})}
                      placeholder="Contoh: 1 porsi Nasi Padang ayam bakar"
                      className="w-full h-32 skeuo-pressed rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none resize-none"
                    />
                    <p className="text-[9px] font-bold text-slate-400 mt-2 px-2 italic">
                      Tulis nama makanan & porsi. AI akan menghitung kalorinya secara otomatis.
                    </p>
                 </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button 
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-4 rounded-xl skeuo-btn font-bold text-slate-400"
                  disabled={isEstimatingManual}
                 >Batal</button>
                 <button 
                  onClick={handleManualAdd}
                  disabled={isEstimatingManual || !manualMeal.name}
                  className="flex-1 py-4 rounded-xl skeuo-plastic-purple font-black text-white flex items-center justify-center gap-2"
                 >
                   {isEstimatingManual ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <>Simpan</>
                   )}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

    </div>
  );
}
