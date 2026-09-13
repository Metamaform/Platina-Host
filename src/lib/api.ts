import { NFTItem } from '../types';

export interface FragmentGiftPrice {
  slug: string;
  floorPriceTon: number | null;
  floorPriceUsd: number | null;
  currency: 'TON';
  sourceUrl: string;
  fetchedAt: string;
}

// Реальные флор-цены с публичных страниц fragment.com (без авторизации).
// Бэкенд кэширует ответ на 10 минут, так что дёргать можно свободно.
export async function fetchFragmentPrices(): Promise<FragmentGiftPrice[]> {
  const response = await fetch('/api/fragment/prices');
  if (!response.ok) throw new Error(`Fragment prices failed: ${response.status}`);
  return response.json();
}

export async function fetchTelegramGifts(limit: number = 50, offset: number = 0, collection: string = "EQCE80Aln8YfldnQLwWMvOfloLGgmPY0eGDJz9ufG3gRui3D"): Promise<NFTItem[]> {
  try {
    const response = await fetch(`/api/gifts?limit=${limit}&offset=${offset}&collection=${encodeURIComponent(collection)}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      let errMsg = response.statusText;
      try {
        const errData = await response.json();
        if (errData && errData.error) {
          errMsg = errData.error;
        }
      } catch (e) {
        // Ignore json parse error
      }
      throw new Error(`Failed to fetch: ${errMsg}`);
    }
    
    const data = await response.json();
    return data.nft_items || [];
  } catch (error) {
    console.error("Error fetching Telegram Gifts:", error);
    throw error;
  }
}

export interface TaskReqs {
  game: 'upgrade' | 'mines' | 'craft' | 'cases' | 'turnover';
  targetAmount: number;
  minBet?: number;
  minMultiplier?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'daily' | 'all';
  expiresAt?: string;
  link?: string;
  icon?: string;
  reqs?: TaskReqs;
  completed?: boolean;
}

export async function fetchTasks(): Promise<Task[]> {
  const token = sessionStorage.getItem('pg_session_token');
  const response = await fetch('/api/tasks', {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error('Failed to fetch tasks');
  const data = await response.json();
  return data.tasks || [];
}

export async function completeTask(taskId: string): Promise<{ success: boolean; balance?: number }> {
  const token = sessionStorage.getItem('pg_session_token');
  const response = await fetch('/api/tasks/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ taskId })
  });
  if (!response.ok) throw new Error('Failed to complete task');
  return response.json();
}

export interface CaseItemConfig {
  giftId: string;
  chance: number;
}
export interface CaseConfig {
  id: string;
  name: string;
  price: number;
  image: string;
  items: CaseItemConfig[];
}

export async function fetchCases(): Promise<CaseConfig[]> {
  const res = await fetch('/api/cases');
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}
