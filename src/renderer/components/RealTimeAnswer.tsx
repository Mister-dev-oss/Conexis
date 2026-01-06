import React, { useEffect, useState, useRef } from 'react';
import { Settings as SettingsInterface } from '../../main/settings';
import { AnswerBarRequest } from './RealTimeAssistant';
import {
  summarize,
  GivetopicInfo,
  QuestionResponse,
} from '../api/realTimeAssisant';
import '../rnwindow/rnApp.css';

const RealTimeAnswer: React.FC = () => {
  const initialTheme = (window as any)?.settings?.theme || 'light';
  const [currentTheme, setCurrentTheme] = useState<string>(initialTheme);
  const [response, setResponse] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const windowType = 'realtimeanswerbar';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (chatMessagesRef.current) {
        const newHeight = chatMessagesRef.current.scrollHeight;

        window.rnelectron.ipcRenderer.send('update-window-dims', {
          windowType,
          height: newHeight + 2,
        });
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    if (chatMessagesRef.current) observer.observe(chatMessagesRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const unsubscribeSettings = window.rnelectron.ipcRenderer.on(
      'settings-updated',
      (...args: unknown[]) => {
        const newSettings = args[0] as SettingsInterface;
        if (newSettings?.theme) setCurrentTheme(newSettings.theme);
      },
    );

    const unsubscribePrompt = window.rnelectron.ipcRenderer.on(
      'answerBarRequest',
      async (...args: unknown[]) => {
        const request = args[0] as AnswerBarRequest;

        if (request.type === 'generateSummary') {
          setResponse('');
          setIsTyping(true);
          let buffer = '';
          if (request.transcript.length < 0) {
            setResponse('Errore nella generazione del sommario. ciao');
          }

          try {
            await summarize(request.transcript, (chunk: string) => {
              setIsTyping(false);
              if (!chunk.trim()) chunk = '\n';
              buffer += chunk;
              setResponse(buffer);
            });
          } catch (err) {
            console.error('Errore nello streaming:', err);
            setResponse('Errore nella generazione del sommario.');
          } finally {
            setIsTyping(false);
          }
        } else if (request.type === 'GivetopicInfo') {
          setResponse('');
          setIsTyping(true);
          let buffer = '';
          if (request.transcript.length < 0) {
            setResponse('Errore nella generazione del sommario. ciao');
          }

          try {
            await GivetopicInfo(request.transcript, (chunk: string) => {
              setIsTyping(false);
              if (!chunk.trim()) chunk = '\n';
              buffer += chunk;
              setResponse(buffer);
            });
          } catch (err) {
            console.error('Errore nello streaming:', err);
            setResponse('Errore nella generazione del sommario.');
          } finally {
            setIsTyping(false);
          }
        } else if (request.type === 'answer-question') {
          setResponse('');
          setIsTyping(true);
          let buffer = '';
          if (request.transcript.length < 0) {
            setResponse('Errore nella generazione del sommario. ciao');
          }

          try {
            await QuestionResponse(request.transcript, (chunk: string) => {
              setIsTyping(false);
              if (!chunk.trim()) chunk = '\n';
              buffer += chunk;
              setResponse(buffer);
            });
          } catch (err) {
            console.error('Errore nello streaming:', err);
            setResponse('Errore nella generazione del sommario.');
          } finally {
            setIsTyping(false);
          }
        } else {
          console.log('Tipo di request non gestito:', request.type);
        }
      },
    );

    return () => {
      unsubscribeSettings();
      unsubscribePrompt();
    };
  }, []);

  // scroll automatico alla fine
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response, isTyping]);

  return (
    <div ref={chatMessagesRef} className={`chat-wrapper theme-${currentTheme}`}>
      <div className="win-header">
        <div className="window-buttons">
          <button
            onClick={() =>
              window.rnelectron.ipcRenderer.send('minimize-realtimeanswerbar')
            }
            className="win-btn minimize"
          >
            −
          </button>
          <button
            onClick={() =>
              window.rnelectron.ipcRenderer.send('close-realtimeanswerbar')
            }
            className="win-btn close"
          >
            ×
          </button>
        </div>
      </div>
      <div className="chat-messages" >
        {isTyping && (
          <div className="msg bot animate-typing">Conexis sta scrivendo...</div>
        )}
        {response && <div className="msg bot">{response}</div>}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default RealTimeAnswer;
