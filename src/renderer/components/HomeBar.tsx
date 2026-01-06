import React, { useState, useEffect, useRef } from 'react';
import '../hbwindow/hbApp.css';
import {
  MessageCircle,
  Settings,
  EyeOff,
  LogIn,
} from 'lucide-react';
import { Settings as SettingsInterface } from '../../main/settings';
import { RecorderOptions } from '../../main/wmEvents/homebarEvents';

export type UIButton = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
};

interface Props {
  shortButtons?: UIButton[];
  theme?: 'light' | 'dark' | 'transparent';
}

const settings = window.settings;

const HomeBar: React.FC<Props> = ({
  shortButtons = [
    {
      label: 'Chat',
      icon: <MessageCircle strokeWidth={1.7}/>,
      onClick() {
        window.hbelectron.ipcRenderer.send('openclose-chatbar');
      },
    },
    ,
    { label: 'Hide', icon: <EyeOff strokeWidth={1.7}/> },
    {
      label: '',
      icon: <Settings strokeWidth={1.7}/>,
      onClick() {
        window.hbelectron.ipcRenderer.send('openclose-settingbar');
      },
      style: { marginRight: -4 },
    },
  ] as UIButton[],
  theme = settings.theme,
}) => {
  const [activeArr, setActiveArr] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false, // For login button
  ]);
  const [swapAnimArr, setSwapAnimArr] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false, // For login button
  ]);

  // New state for recording
  // We start with default state showing one record button
  const [recordingState, setRecordingState] = React.useState<'default' | 'idle' | 'recording' | 'stopped'>('default');
  const [recordingOptions, setRecordingOptions] = React.useState<RecorderOptions | null>(null);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const windowType = 'homebarWin';

  const  BarWidthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const updateWidth = () => {
        if (BarWidthRef.current) {
          const newWidth = BarWidthRef.current.scrollWidth;
  
          window.hbelectron.ipcRenderer.send('update-window-dims', {
            windowType,
            width: newWidth+2
          });
        }
      };
  
      updateWidth();
  
      const observer = new ResizeObserver(updateWidth);
      if (BarWidthRef.current) observer.observe(BarWidthRef.current);
  
      return () => observer.disconnect();
    }, []);

  useEffect(() => {
    const handleWindowClosed = (...args: unknown[]) => {
      const windowName = args[0];
      if (windowName === 'chatbar') {
        setActiveArr((prev) => {
          const next = [...prev];
          next[0] = false;
          return next;
        });

        setSwapAnimArr((prev) => {
          const next = [...prev];
          next[0] = true;
          return next;
        });

        setTimeout(() => {
          setSwapAnimArr((prev) => {
            const next = [...prev];
            next[0] = false;
            return next;
          });
        }, 380);
      } else if (windowName === 'realtimeassistantbar') {
        setActiveArr((prev) => {
          const next = [...prev];
          next[1] = false;
          return next;
        });

        setSwapAnimArr((prev) => {
          const next = [...prev];
          next[1] = true;
          return next;
        });

        setTimeout(() => {
          setSwapAnimArr((prev) => {
            const next = [...prev];
            next[1] = false;
            return next;
          });
        }, 380);
        
        setRecordingState('default')
        const defaultOptions: RecorderOptions = {type: "", saving: false}
        setRecordingOptions(defaultOptions)
      } else if (windowName === 'settingbar') {
        setActiveArr((prev) => {
          const next = [...prev];
          next[3] = false;
          return next;
        });

        setSwapAnimArr((prev) => {
          const next = [...prev];
          next[3] = true;
          return next;
        });

        setTimeout(() => {
          setSwapAnimArr((prev) => {
            const next = [...prev];
            next[3] = false;
            return next;
          });
        }, 380);
      }};
    window.hbelectron.ipcRenderer.on('window-closed', handleWindowClosed);
  }, []);

  // Handlers for recording buttons
  const handleRecordClick = (type: "Rag" | "Standard") => {
    const option: RecorderOptions = { type, saving: false };
    setRecordingOptions(option);
    setRecordingState('recording');
    window.hbelectron.ipcRenderer.send('openclose-realtimeassistantbar', option);
  };

  const handleDefaultRecordClick = () => {
    setRecordingState('idle');
  };

  const handleStopClick = () => {
    setRecordingState('stopped');
  };

  const handleSaveDiscardClick = (save: boolean) => {
    if (recordingOptions) {
      const optionToSend = { ...recordingOptions, saving: save };
      window.hbelectron.ipcRenderer.send('openclose-realtimeassistantbar', optionToSend);
    }
    setRecordingOptions(null);
    setRecordingState('default');
  };

  useEffect(() => {
  const handleWindowOpened = (...args: unknown[]) => {
    const windowName = args[0];

    let index: number | null = null;
    if (windowName === 'chatbar') index = 0;
    else if (windowName === 'realtimeassistantbar') index = 1;
    else if (windowName === 'settingbar') index = 3;

    if (index !== null) {
      // Attiva la finestra
      setActiveArr((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });

      // Animazione di apertura
      setSwapAnimArr((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });

      // Resetta l'animazione dopo 380ms
      setTimeout(() => {
        setSwapAnimArr((prev) => {
          const next = [...prev];
          next[index!] = false;
          return next;
        });
      }, 380);
    }
  };

  window.hbelectron.ipcRenderer.on('window-opened', handleWindowOpened);
}, []);

  useEffect(() => {
    const unsubscribe = window.hbelectron.ipcRenderer.on(
      'settings-updated',
      (...args: unknown[]) => {
        const newSettings = args[0] as SettingsInterface;
        setCurrentTheme(newSettings.theme);
        console.log(newSettings);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <nav ref={BarWidthRef} className={`ui-bar theme-${currentTheme}`} aria-label="UI bar">
          {/* Other buttons except record button (index 0) */}
          {shortButtons.slice(0, 1).map((btn, i) => {
            const btnProps = btn;
            const isActive = activeArr[i];
            const isSwapAnim = swapAnimArr[i];

            let btnClass = "short-btn";
            if (isActive) btnClass += " active-btn";

            let iconClass = "btn-icon";
            if (isSwapAnim) iconClass += " btn-morph-anim";

            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.currentTarget.blur();
                  setActiveArr((prev) => {
                    const next = [...prev];
                    next[i] = !next[i];
                    return next;
                  });
                  setSwapAnimArr((prev) => {
                    const next = [...prev];
                    next[i] = true;
                    return next;
                  });
                  setTimeout(() => {
                    setSwapAnimArr((prev) => {
                      const next = [...prev];
                      next[i] = false;
                      return next;
                    });
                  }, 380);
                  btn.onClick?.();
                }}
                onMouseDown={(e) => e.preventDefault()}
                disabled={btn.disabled}
                aria-label={btnProps.ariaLabel || btnProps.label}
                className={btnClass}
                tabIndex={-1}
                style={btn.style}
              >
                {btnProps.icon && <span className={iconClass}>{btnProps.icon}</span>}
                <span className={isSwapAnim ? "btn-morph-anim" : undefined}>
                  {btnProps.label}
                </span>
              </button>
            );
          })}

          {/* Record buttons area */}
          {recordingState === 'default' && (
            <div className="record-btn-group">
              <button
                key="record-default"
                type="button"
                className="short-btn record-btn"
                style={{paddingBottom:6}}
                onClick={handleDefaultRecordClick}
                aria-label="Record"
                tabIndex={-1}
              >
                Record
              </button>
            </div>
          )}

          {recordingState === 'idle' && (
            <div className="record-btn-group">
              <div className="button-group">
                <button
                  key="record-rag"
                  type="button"
                  className="short-btn record-btn"
                  style={{paddingBottom:6}}
                  onClick={() => handleRecordClick('Rag')}
                  aria-label="Record Rag"
                  tabIndex={-1}
                >
                  Rag
                </button>
                <div className="button-divider"></div>
                <button
                  key="record-standard"
                  type="button"
                  className="short-btn record-btn"
                  style={{paddingBottom:6}}
                  onClick={() => handleRecordClick('Standard')}
                  aria-label="Record Standard"
                  tabIndex={-1}
                >
                  Standard
                </button>
              </div>
            </div>
          )}

          {recordingState === 'recording' && (
            <div className="record-btn-group">
              <button
                key="stop-record"
                type="button"
                className="short-btn active-rec-btn record-btn"
                style={{paddingBottom:6}}
                onClick={handleStopClick}
                aria-label="Stop Recording"
                tabIndex={-1}
              >
                Stop
              </button>
            </div>
          )}

          {recordingState === 'stopped' && (
            <div className="record-btn-group">
              <div className="save-discard-group">
                <button
                  key="save-record"
                  type="button"
                  className="short-btn record-btn"
                  style={{paddingBottom:6}}
                  onClick={() => handleSaveDiscardClick(true)}
                  aria-label="Save Recording"
                  tabIndex={-1}
                >
                  Save
                </button>
                <div className="button-divider"></div>
                <button
                  key="discard-record"
                  type="button"
                  className="short-btn record-btn"
                  style={{paddingBottom:6}}
                  onClick={() => handleSaveDiscardClick(false)}
                  aria-label="Discard Recording"
                  tabIndex={-1}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          
          {/* Other buttons after record button (index 2 and 3) */}
          {shortButtons.slice(2, 4).map((btn, i) => {
            const idx = i + 2;
            const btnProps = btn;
            const isActive = activeArr[idx];
            const isSwapAnim = swapAnimArr[idx];

            let btnClass = "short-btn";
            if (isActive) btnClass += " active-btn";

            let iconClass = "btn-icon";
            if (isSwapAnim) iconClass += " btn-morph-anim";
            if (idx === 3 && isSwapAnim) iconClass += " settings-rotate-once";

            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.currentTarget.blur();
                  setActiveArr((prev) => {
                    const next = [...prev];
                    next[idx] = !next[idx];
                    return next;
                  });
                  setSwapAnimArr((prev) => {
                    const next = [...prev];
                    next[idx] = true;
                    return next;
                  });
                  setTimeout(() => {
                    setSwapAnimArr((prev) => {
                      const next = [...prev];
                      next[idx] = false;
                      return next;
                    });
                  }, 380);
                  btn.onClick?.();
                }}
                onMouseDown={(e) => e.preventDefault()}
                disabled={btn.disabled}
                aria-label={btnProps.ariaLabel || btnProps.label}
                className={btnClass}
                tabIndex={-1}
                style={btn.style}
              >
                {btnProps.icon && <span className={iconClass}>{btnProps.icon}</span>}
                <span className={isSwapAnim ? "btn-morph-anim" : undefined}>
                  {btnProps.label}
                </span>
              </button>
              
            );
          })}
    </nav>
  );

}

export default HomeBar;
