import React, { useEffect, useState, useRef } from 'react';
import { Settings as SettingsInterface } from '../../main/settings';
import { motion, AnimatePresence } from 'framer-motion';
import {
  extractQuestions,
  generateQuestions,
  detectTopics,
} from '../api/realTimeAssisant';
import { ArrowLeft } from 'lucide-react';

export type AnswerBarRequest = {
  type: 'generateSummary' | 'answer-question' | 'GivetopicInfo';
  transcript: string[];
};

// --- Child component (button grid) --- //

interface ButtonGridProps {
  setMode: (mode: string) => void;
  transcripts: string[];
}

const ButtonGrid: React.FC<ButtonGridProps> = ({ setMode, transcripts }) => {
  return (
    <div className="button-grid">
      <Button
        label="Rispondi alla domanda"
        onClick={() => setMode('extractQuestions')}
      />
      <Button
        label="Di che si sta parlando"
        onClick={() => {
          window.raelectron.ipcRenderer.send('open-answerbar');
          const newRequest: AnswerBarRequest = {
            type: 'generateSummary',
            transcript: transcripts,
          };
          setTimeout(() => {
            window.raelectron.ipcRenderer.send(
              'transfer-prompt-answerbar',
              newRequest,
            );
          }, 200);
        }}
      />
      <Button
        label="Genera domande"
        onClick={() => {
          setMode('generateQuestions');
        }}
      />
      <Button label="Aiuto specifico" onClick={() => setMode('detectTopics')} />
    </div>
  );
};

// ---- //

// --- Child component (Extract Questions) --- //

interface ExtractQuestionsProps {
  transcripts: string[];
  theme: string;
}

const ExtractQuestions: React.FC<ExtractQuestionsProps> = ({ transcripts }) => {
  const [data, setData] = useState<{
    questions: string[];
    count: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await extractQuestions(transcripts);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('Errore sconosciuto'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="questions-list">
      {loading && <div>Caricamento risposte...</div>}
      {error && (
        <div>
          <p>Errore durante il caricamento: {error.name}</p>
          <button onClick={fetchData}>Riprova</button>
        </div>
      )}
      {data && data.count > 0 && (
        <>
          <h3>Domande rilevate ({data.count}):</h3>
          <ul>
            {data.questions.map((a, i) => (
              <li key={i}>
                <button
                  className=""
                  onClick={async () => {
                    window.raelectron.ipcRenderer.send('open-answerbar');
                    const response: string =
                      await window.raelectron.ipcRenderer.invoke('RagQuery', a);
                    const newTranscript = [
                      ...transcripts,
                      response,
                      `QUESTION: ${a}`,
                    ];
                    const newRequest: AnswerBarRequest = {
                      type: 'answer-question',
                      transcript: newTranscript,
                    };
                    setTimeout(() => {
                      window.raelectron.ipcRenderer.send(
                        'transfer-prompt-answerbar',
                        newRequest,
                      );
                    }, 200);
                  }}
                >
                  {a}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {data && data.count === 0 && <div>Nessuna domanda rilevata.</div>}
    </div>
  );
};

// ---- //

// --- Child component (Detect Topics) --- //

interface DetectTopicsProps {
  transcripts: string[];
  theme: string;
}

const DetectTopics: React.FC<DetectTopicsProps> = ({ transcripts }) => {
  const [data, setData] = useState<{ topics: string[]; count: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await detectTopics(transcripts);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('Errore sconosciuto'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="questions-list">
      {loading && <div>Caricamento argomenti...</div>}

      {error && (
        <div>
          <p>Errore durante il caricamento: {error.message}</p>
          <button onClick={fetchData}>Riprova</button>
        </div>
      )}

      {data && data.count > 0 && (
        <>
          <h3>Argomenti rilevati ({data.count}):</h3>
          <ul>
            {data.topics.map((t, i) => (
              <li key={i}>
                <button
                  onClick={async () => {
                    window.raelectron.ipcRenderer.send('open-answerbar');
                    const response: string =
                      await window.raelectron.ipcRenderer.invoke('RagQuery', t);

                    const newTranscript = [
                      ...transcripts,
                      response,
                      `TOPIC: ${t}`,
                    ];

                    const newRequest: AnswerBarRequest = {
                      type: 'GivetopicInfo',
                      transcript: newTranscript,
                    };

                    setTimeout(() => {
                      window.raelectron.ipcRenderer.send(
                        'transfer-prompt-answerbar',
                        newRequest,
                      );
                    }, 200);
                  }}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {data && data.count === 0 && <div>Nessun argomento rilevato.</div>}
    </div>
  );
};

// ---- //

// --- Child component (Generate Questions) --- //
interface GenerateQuestionsProps {
  transcripts: string[];
  theme: string;
}

const GenerateQuestions: React.FC<GenerateQuestionsProps> = ({
  transcripts,
}) => {
  const [data, setData] = useState<{
    questions: string[];
    count: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await generateQuestions(transcripts);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('Errore sconosciuto'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="questions-list">
      {loading && <div>Caricamento domande...</div>}

      {error && (
        <div>
          <p>Errore durante il caricamento: {error.message}</p>
          <button onClick={fetchData}>Riprova</button>
        </div>
      )}

      {data && data.count > 0 && (
        <>
          <h3>Domande generate ({data.count}):</h3>
          <ul>
            {data.questions.map((q, i) => (
              <li key={i}>
                <button
                  onClick={async () => {
                    window.raelectron.ipcRenderer.send('open-answerbar');
                    const response: string =
                      await window.raelectron.ipcRenderer.invoke('RagQuery', q);

                    const newTranscript = [
                      ...transcripts,
                      response,
                      `QUESTION: ${q}`,
                    ];

                    const newRequest: AnswerBarRequest = {
                      type: 'answer-question',
                      transcript: newTranscript,
                    };

                    setTimeout(() => {
                      window.raelectron.ipcRenderer.send(
                        'transfer-prompt-answerbar',
                        newRequest,
                      );
                    }, 200);
                  }}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {data && data.count === 0 && <div>Nessuna domanda generata.</div>}
    </div>
  );
};

// ---- //

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return (
    <button className="rect-btn" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};

const RealTimeAssistant: React.FC = () => {
  const initialTheme = (window as any)?.settings?.theme || 'light';

  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>(initialTheme);
  const [showChat, setShowChat] = useState<boolean>(false);

  const [seconds, setSeconds] = useState<number>(0);
  const [mode, setMode] = useState<string | null>(null);
  const windowType = 'realtimeassistantbar';

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const assistantHeightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (assistantHeightRef.current) {
        const newHeight = assistantHeightRef.current.scrollHeight;

        window.raelectron.ipcRenderer.send('update-window-dims', {
          windowType,
          height: newHeight + 2,
        });
        console.log(newHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    if (assistantHeightRef.current)
      observer.observe(assistantHeightRef.current);

    return () => observer.disconnect();
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Ascolto transcript
  useEffect(() => {
    const unsubscribe = window.raelectron.ipcRenderer.on(
      'transcript',
      (data) => {
        setTranscripts((prev) => {
          const updated = [...prev, data as string];
          if (updated.length > 25) updated.shift(); // memoria max 25
          return updated;
        });
      },
    );

    return () => unsubscribe();
  }, []);

  // Auto-scroll sempre in fondo
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts]);

  // Ascolto tema
  useEffect(() => {
    const unsubscribe = window.raelectron.ipcRenderer.on(
      'settings-updated',
      (...args: unknown[]) => {
        const newSettings = args[0] as SettingsInterface;
        if (newSettings?.theme) setCurrentTheme(newSettings.theme);
      },
    );
    return () => unsubscribe();
  }, []);

  // Mostra solo gli ultimi 3 transcript
  const visibleTranscripts = transcripts.slice(-3);

  return (
    <div ref={assistantHeightRef}>
      <div className={`assistant-bar theme-${currentTheme}`}>
        {/* Header con bottone toggle */}
        <div className="assistant-header">
          <span className="header-left">
            <button
              className="transcript-toggle"
              onClick={() => setShowChat((prev) => !prev)}
            >
              Transcription
            </button>
          </span>
          <span className="header-center">{formatTime(seconds)}</span>
          <span className="header-right">
            {mode !== null && (
              <button className="back-btn" onClick={() => setMode(null)}>
                <ArrowLeft size={15} />
              </button>
            )}
          </span>
        </div>

        {/* Sezione chat */}
        {showChat && (
          <div className="transcript-chat">
            <AnimatePresence initial={false}>
              {visibleTranscripts.map((msg, i) => (
                <motion.div
                  key={i}
                  className="transcript-msg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {msg}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="header-divider"></div>

        {/* Griglia bottoni */}
        {mode === null && (
          <ButtonGrid setMode={setMode} transcripts={transcripts} />
        )}
        {mode === 'extractQuestions' && (
          <ExtractQuestions transcripts={transcripts} theme={currentTheme} />
        )}
        {mode === 'detectTopics' && (
          <DetectTopics transcripts={transcripts} theme={currentTheme} />
        )}
        {mode === 'generateQuestions' && (
          <GenerateQuestions transcripts={transcripts} theme={currentTheme} />
        )}
      </div>
    </div>
  );
};

export default RealTimeAssistant;
