import type { PersistState } from '@/types';

const STORAGE_KEY = 'lab-reservation-app-state';

export const loadState = (): Partial<PersistState> | null => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return null;
    }
    const parsed = JSON.parse(serializedState);
    return parsed;
  } catch (err) {
    console.warn('Failed to load state from localStorage:', err);
    return null;
  }
};

export const saveState = (state: Partial<PersistState>): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
};

export const clearState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear state from localStorage:', err);
  }
};

export const hasPersistedData = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) !== null;
};
