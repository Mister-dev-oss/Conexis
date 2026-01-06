import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import '../sbwindow/sbApp.css';
import { Settings, Shortcut, LanguageSetting,  } from '../../main/settings';
import { allowedAudioContextLanguages, allowedLanguages } from '../../main/languages';

function areShortcutsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;

  const setA = new Set(a.map((k) => k.toUpperCase()));
  const setB = new Set(b.map((k) => k.toUpperCase()));

  for (const key of setA) {
    if (!setB.has(key)) return false;
  }

  return true;
}

const allowedKeys = [
  // lettere
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  // numeri
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  // modificatori
  'Control', // Windows/Linux
  'Meta', // macOS Cmd
  'Alt',
  'Shift',
  // tasti speciali
  'Enter',
  'Return',
  'Escape',
  'Esc',
  'Space',
  'Backspace',
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
];

const initialShortcuts: Shortcut[] = [
  { name: 'Open Chat', keys: ['Ctrl', 'C'] },
  { name: 'Hide/Show', keys: ['Alt', 'H'] },
];

const initialLanguages: LanguageSetting = {
  language: 'English',
  audioContextLanguage: 'en',
};

const settings = window.settings;

interface SettingsBarProps {
  theme?: 'light' | 'dark' | 'transparent';
}

const SettingsBar: React.FC<SettingsBarProps> = ({
  theme = settings.theme,
}) => {
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [audioLanguageDropdownOpen, setAudioLanguageDropdownOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(initialShortcuts);
  const [languages, setLanguages] = useState(initialLanguages);
  const [listening, setListening] = useState<{
    index: number;
    keyIndex: number;
  } | null>(null);
  const windowType = 'settingbarWin';

  const themes = ['light', 'dark', 'transparent'];
  const settingsHeightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (settingsHeightRef.current) {
        const newHeight = settingsHeightRef.current.scrollHeight;

        window.sbelectron.ipcRenderer.send('update-window-dims', {
          windowType,
          height: newHeight + 2,
        });
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    if (settingsHeightRef.current) observer.observe(settingsHeightRef.current);

    return () => observer.disconnect();
  }, []);

  // Load listner upddate settings
  useEffect(() => {
    const unsubscribe = window.sbelectron.ipcRenderer.on(
      'settings-updated',
      (...args: unknown[]) => {
        const newSettings = args[0] as Settings;
        setCurrentTheme(newSettings.theme);
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // Load shortcut
  useEffect(() => {
    async function fetchShortcuts() {
      try {
        const data: { shortcuts: Shortcut[] } =
          await window.sbelectron.ipcRenderer.invoke('get-initial-shortcuts');
        if (data.shortcuts) {
          setShortcuts(data.shortcuts);
        }
      } catch (err) {
        console.error('Errore nel caricamento delle scorciatoie:', err);
      }
    }

    fetchShortcuts();
  }, []);

  //load languages
  useEffect(() => {
    async function fetchLanguages() {
      try {
        const data: { languages: LanguageSetting } =
          await window.sbelectron.ipcRenderer.invoke('get-initial-languages');
        if (data.languages) {
          setLanguages(data.languages);
        }
      } catch (err) {
        console.error('Errore nel caricamento delle lingue:', err);
      }
    }

    fetchLanguages();
  }, []);

  // Gestione pressione tasti quando si è in modalità "listen"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!listening) return;
      e.preventDefault();

      // Normalizzazione cross-platform
      let pressedKey = e.key;
      if (pressedKey === 'Esc') pressedKey = 'Escape';
      if (pressedKey === 'Return') pressedKey = 'Enter';
      if (pressedKey === 'Control') pressedKey = 'Ctrl';
      if (pressedKey === 'Meta') pressedKey = 'Meta';
      pressedKey = pressedKey.toUpperCase();

      // Controllo tasti consentiti
      if (!allowedKeys.map((k) => k.toUpperCase()).includes(pressedKey)) {
        setListening(null);
        return;
      }

      // Copia dei tasti della scorciatoia corrente
      const newKeys = [...shortcuts[listening.index].keys] as [string, string];
      newKeys[listening.keyIndex] = pressedKey;

      // Controllo duplicati nella stessa scorciatoia
      const hasDuplicateInSameShortcut =
        newKeys.filter((k) => k === pressedKey).length > 1;
      if (hasDuplicateInSameShortcut) {
        setListening(null);
        return;
      }

      // Controllo duplicati tra scorciatoie diverse
      const hasDuplicateAcrossShortcuts = shortcuts.some(
        (sc, i) => i !== listening.index && areShortcutsEqual(newKeys, sc.keys),
      );
      if (hasDuplicateAcrossShortcuts) {
        setListening(null);
        return;
      }

      // Solo se tutti i controlli passano, aggiorno lo stato e invio al main
      const newShortcuts = [...shortcuts];
      newShortcuts[listening.index].keys = newKeys;
      setShortcuts(newShortcuts);
      window.sbelectron.ipcRenderer.send(
        'new-shortcut',
        newShortcuts[listening.index],
      );

      setListening(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listening, shortcuts]);

  return (
    <div
      ref={settingsHeightRef}
      className={`settings-container theme-${currentTheme}`}
    >
      {/* HEADER / FRAME */}
      <div className="win-header">
        <div className="window-buttons">
          <button
            onClick={() =>
              window.sbelectron.ipcRenderer.send('minimize-settingbar')
            }
            className="win-btn minimize"
          >
            −
          </button>
          <button
            onClick={() =>
              window.sbelectron.ipcRenderer.send('close-settingbar')
            }
            className="win-btn close"
          >
            ×
          </button>
        </div>
      </div>

      {/* SETTINGS SECTION */}
      <div className="ui-bar-vertical">
        {/* Theme selector */}
        <div className="setting-row">
          <span className="setting-label">Theme</span>
          <div className="dropdown">
            <button
              className="btn-morph-anim dropdown-trigger"
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            >
              {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}
              <ChevronDown
                size={14}
                className={`chevron ${themeDropdownOpen ? 'rotated' : ''}`}
              />
            </button>
            <div
              className={`dropdown-menu modern ${themeDropdownOpen ? 'open' : ''}`}
            >
              {themes.map((t) => (
                <div
                  key={t}
                  className={`dropdown-item ${currentTheme === t ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentTheme(t as 'light' | 'dark' | 'transparent');
                    window.sbelectron.ipcRenderer.send(
                      'settings-needsupdate',
                      t,
                    );
                    setThemeDropdownOpen(false);
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Language selector */}
        <div className="setting-row">
          <span className="setting-label">Language</span>
          <div className="dropdown">
            <button
              className="btn-morph-anim dropdown-trigger"
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
            >
              {languages.language}
              <ChevronDown
                size={14}
                className={`chevron ${languageDropdownOpen ? 'rotated' : ''}`}
              />
            </button>
            <div
              className={`dropdown-menu modern ${languageDropdownOpen ? 'open' : ''}`}
            >
              {allowedLanguages.map((lang) => (
                <div
                  key={lang}
                  className={`dropdown-item ${languages.language === lang ? 'active' : ''}`}
                  onClick={() => {
                    const newLanguages = { ...languages, language: lang };
                    setLanguages(newLanguages);
                    window.sbelectron.ipcRenderer.send(
                      'language-update',
                      newLanguages
                    );
                    setLanguageDropdownOpen(false);
                  }}
                >
                  {lang}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Audio Context Language selector */}
        <div className="setting-row">
          <span className="setting-label">Voice Recognition</span>
          <div className="dropdown">
            <button
              className="btn-morph-anim dropdown-trigger"
              onClick={() => setAudioLanguageDropdownOpen(!audioLanguageDropdownOpen)}
            >
              {languages.audioContextLanguage}
              <ChevronDown
                size={14}
                className={`chevron ${audioLanguageDropdownOpen ? 'rotated' : ''}`}
              />
            </button>
            <div
              className={`dropdown-menu modern ${audioLanguageDropdownOpen ? 'open' : ''}`}
            >
              {allowedAudioContextLanguages.map((lang) => (
                <div
                  key={lang}
                  className={`dropdown-item ${languages.audioContextLanguage === lang ? 'active' : ''}`}
                  onClick={() => {
                    const newLanguages = { ...languages, audioContextLanguage: lang };
                    setLanguages(newLanguages);
                    window.sbelectron.ipcRenderer.send(
                      'language-update',
                      newLanguages
                    );
                    setAudioLanguageDropdownOpen(false);
                  }}
                >
                  {lang}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider"></div>


        {/* Shortcuts elenco */}
        <div
          className="setting-row"
          style={{ flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <span className="setting-label">Shortcuts</span>
          <div style={{ width: '100%', marginTop: '4px' }}>
            {shortcuts.map((sc, idx) => (
              <div key={sc.name} style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '2px',
                  }}
                >
                  <span>{sc.name}</span>
                  <span style={{ display: 'flex', gap: '4px' }}>
                    {sc.keys.map((k, ki) => (
                      <button
                        key={ki}
                        onClick={() =>
                          setListening({ index: idx, keyIndex: ki })
                        }
                        className={`shortcut-key-btn ${listening?.index === idx && listening.keyIndex === ki ? 'listening' : ''}`}
                      >
                        {k}
                      </button>
                    ))}
                  </span>
                </div>
                <div className="divider" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsBar;
