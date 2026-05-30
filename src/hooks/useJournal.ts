import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

export interface UserProfile {
  name: string;
  weight: number; 
  height: number; 
  age: number;
  gender: 'male' | 'female';
  activityLevel: number; 
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
}

export interface WeightEntry {
  date: string;
  value: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  time: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  image?: string;
}

export interface DailyRecord {
  date: string;
  waterGlasses: number;
  meals: Meal[];
  weight?: number;
}

const STORAGE_KEY = 'nourish_tracker_data_v2';

export function useJournal() {
  const [records, setRecords] = useState<Record<string, DailyRecord>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse journal data", e);
      }
    }
    return {};
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('nourish_profile');
    if (saved) return JSON.parse(saved);
    return {
      name: 'Pengguna',
      weight: 70,
      height: 170,
      age: 25,
      gender: 'male',
      activityLevel: 1.2,
      goalCalories: 2000,
      goalProtein: 150,
      goalCarbs: 250,
      goalFat: 65
    };
  });

  const calculateTDEE = (p: UserProfile) => {
    // Harris-Benedict Formula
    const weight = p.weight || 0;
    const height = p.height || 0;
    const age = p.age || 0;
    const activityLevel = p.activityLevel || 1.2;

    let bmr = 0;
    if (p.gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    return Math.max(1200, Math.round(bmr * activityLevel));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('nourish_profile', JSON.stringify(profile));
  }, [profile]);

  const getDayRecord = (date: Date): DailyRecord => {
    const key = format(date, 'yyyy-MM-dd');
    return records[key] || { date: key, waterGlasses: 0, meals: [] };
  };

  const addMeal = (date: Date, meal: Omit<Meal, 'id' | 'time'>) => {
    const key = format(date, 'yyyy-MM-dd');
    setRecords(prev => {
      const todayRecord = prev[key] || { date: key, waterGlasses: 0, meals: [] };
      const newMeal: Meal = {
        ...meal,
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
      };
      return {
        ...prev,
        [key]: {
          ...todayRecord,
          meals: [...todayRecord.meals, newMeal]
        }
      };
    });
  };

  const updateWeight = (date: Date, weight: number) => {
    const key = format(date, 'yyyy-MM-dd');
    setRecords(prev => {
      const todayRecord = prev[key] || { date: key, waterGlasses: 0, meals: [] };
      return { ...prev, [key]: { ...todayRecord, weight } };
    });
  };

  const deleteMeal = (date: Date, mealId: string) => {
    const key = format(date, 'yyyy-MM-dd');
    setRecords(prev => {
      const todayRecord = prev[key];
      if (!todayRecord) return prev;
      return {
        ...prev,
        [key]: {
          ...todayRecord,
          meals: todayRecord.meals.filter(m => m.id !== mealId)
        }
      };
    });
  };

  const setWater = (date: Date, glasses: number) => {
    const key = format(date, 'yyyy-MM-dd');
    setRecords(prev => {
      const todayRecord = prev[key] || { date: key, waterGlasses: 0, meals: [] };
      return {
        ...prev,
        [key]: {
          ...todayRecord,
          waterGlasses: Math.max(0, glasses),
        }
      };
    });
  };
  
  const getWeeklyStats = (currentDate: Date) => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    
    return days.map(day => {
      const record = getDayRecord(day);
      const totalCalories = record.meals.reduce((sum, meal) => sum + meal.calories, 0);
      const totalProtein = record.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
      const totalCarbs = record.meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
      const totalFat = record.meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
      
      return {
        date: day,
        dayName: format(day, 'EEE', { locale: id }),
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        water: record.waterGlasses,
        weight: record.weight,
        isToday: isSameDay(day, new Date())
      };
    });
  };

  const getStreak = () => {
    let streak = 0;
    let checkDate = new Date();
    
    while (true) {
      const key = format(checkDate, 'yyyy-MM-dd');
      const record = records[key];
      if (record && (record.meals.length > 0 || record.waterGlasses > 0)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
      if (streak > 365) break; 
    }
    return streak;
  };

  const getAchievements = () => {
    const allRecords = Object.values(records) as DailyRecord[];
    const achievements = [];
    
    if (getStreak() >= 3) achievements.push({ id: 'streak_3', title: 'Pejuang Rutinitas', desc: '3 Hari Berturut-turut!', icon: '🔥' });
    if (allRecords.some((r: DailyRecord) => r.meals.length >= 3)) achievements.push({ id: 'triple_meal', title: 'Piring Lengkap', desc: 'Makan 3x Sehari', icon: '🍽️' });
    if (allRecords.some((r: DailyRecord) => r.waterGlasses >= 8)) achievements.push({ id: 'hydrated', title: 'Master Hidrasi', desc: '8 Gelas Air Tercapai', icon: '💧' });
    if (allRecords.length >= 7) achievements.push({ id: 'week_one', title: 'Satu Minggu Hebat', desc: '7 Hari Pencatatan', icon: '🏅' });
    
    return achievements;
  };

  return {
    records,
    profile,
    setProfile,
    calculateTDEE,
    getDayRecord,
    addMeal,
    deleteMeal,
    setWater,
    getStreak,
    getAchievements,
    updateWeight,
    getWeeklyStats
  };
}
