import fs from 'fs';
import { app } from 'electron';
import path from 'path';
import { isValidLanguage, isValidAudioContextLanguage } from './languages';

export interface Settings {
  theme: 'light' | 'dark' | 'transparent';
}

const settingsFolder = path.join(app.getPath('userData'), 'settings');

// Creo la cartella se non esiste
if (!fs.existsSync(settingsFolder)) {
    fs.mkdirSync(settingsFolder);
}

const settingsPath = path.join(settingsFolder, 'settings.json');

export function loadSettings(): Settings {
  if (!fs.existsSync(settingsPath)) {
    const defaultSettings: Settings = { theme: 'light' };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
  }
  const raw = fs.readFileSync(settingsPath, 'utf-8');
  return JSON.parse(raw) as Settings;
}

export function saveSettings(newSettings: Settings): void {
  fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
}

export interface Shortcut {
  name: string;
  keys: [string, string];
}

const shortcutsPath = path.join(settingsFolder, "shortcuts.json");


export function loadShortcuts(): Shortcut[] {
  if (!fs.existsSync(shortcutsPath)) {
    const defaultShortcuts: Shortcut[] = [
      { name: "Open Chat", keys: ["Ctrl", "B"] },
      { name: "Hide/Show", keys: ["Alt", "H"] },
    ];
    fs.writeFileSync(shortcutsPath, JSON.stringify(defaultShortcuts, null, 2));
    return defaultShortcuts;
  }

  const raw = fs.readFileSync(shortcutsPath, "utf-8");
  console.log(shortcutsPath)
  return JSON.parse(raw) as Shortcut[];
}


export function saveShortcuts(shortcuts: Shortcut[]): void {
  fs.writeFileSync(shortcutsPath, JSON.stringify(shortcuts, null, 2));
}


export function updateShortcut(name: string, newKeys: [string, string]): void {
  const shortcuts = loadShortcuts();
  const index = shortcuts.findIndex((s) => s.name === name);
  if (index !== -1) {
    shortcuts[index].keys = newKeys;
    saveShortcuts(shortcuts);
  } else {
    shortcuts.push({ name, keys: newKeys });
    saveShortcuts(shortcuts);
  }
}

const languagesPath = path.join(settingsFolder, "languages.json");

// Interfaccia
export interface LanguageSetting {
  language: string;
  audioContextLanguage: string;
}

// Carica
export function loadLanguages(): LanguageSetting {
  if (!fs.existsSync(languagesPath)) {
    const defaultLanguage: LanguageSetting = {
      language: "English",
      audioContextLanguage: "en",
    };
    fs.writeFileSync(languagesPath, JSON.stringify(defaultLanguage, null, 2));
    return defaultLanguage;
  }

  const raw = fs.readFileSync(languagesPath, "utf-8");
  return JSON.parse(raw) as LanguageSetting;
}

// Salva
export function saveLanguage(newLanguage: LanguageSetting): void {
  fs.writeFileSync(languagesPath, JSON.stringify(newLanguage, null, 2));
}

// Aggiorna con validazione
export function updateLanguage(
  language?: string,
  audioContextLanguage?: string
): void {
  const current = loadLanguages();

  if (language !== undefined) {
    if (!isValidLanguage(language)) {
      throw new Error(`Language "${language}" is not allowed.`);
    }
    current.language = language;
  }

  if (audioContextLanguage !== undefined) {
    if (!isValidAudioContextLanguage(audioContextLanguage)) {
      throw new Error(
        `Audio context language "${audioContextLanguage}" is not allowed.`
      );
    }
    current.audioContextLanguage = audioContextLanguage;
  }

  saveLanguage(current);
}