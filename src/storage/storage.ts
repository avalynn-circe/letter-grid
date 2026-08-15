import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameRecord } from "../game/game";

const HISTORY_KEY = "spelling-grid-history";
const CURRENT_KEY = "spelling-grid-current";
const THEME_KEY = "spelling-grid-theme";
const SFX_KEY = "spelling-grid-sfx";

export interface CurrentPuzzle {
  board: string[];
  found: [string, number][];
}

export async function loadHistory(): Promise<GameRecord[]> {
  try {
    const value = await AsyncStorage.getItem(HISTORY_KEY);
    return value ? (JSON.parse(value) as GameRecord[]) : [];
  } catch (e) {
    return [];
  }
}

export async function saveHistory(history: GameRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Could not save history", e);
  }
}

export async function loadCurrentPuzzle(): Promise<CurrentPuzzle | null> {
  try {
    const value = await AsyncStorage.getItem(CURRENT_KEY);
    return value ? (JSON.parse(value) as CurrentPuzzle) : null;
  } catch (e) {
    return null;
  }
}

export async function saveCurrentPuzzle(puzzle: CurrentPuzzle): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(puzzle));
  } catch (e) {
    console.error("Could not save current puzzle", e);
  }
}

export async function loadThemePreference(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(THEME_KEY);
  } catch (e) {
    return null;
  }
}

export async function saveThemePreference(theme: string): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error("Could not save theme preference", e);
  }
}

/** Sound effects on? Defaults on, and remembered. */
export async function loadSfx(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(SFX_KEY)) !== "0"; } catch { return true; }
}

export async function saveSfx(on: boolean): Promise<void> {
  try { await AsyncStorage.setItem(SFX_KEY, on ? "1" : "0"); } catch { /* non-fatal */ }
}
