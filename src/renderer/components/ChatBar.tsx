import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { Download, Paperclip, ArrowUp, Plus, X, FileText, AlertCircle } from 'lucide-react';
import {
  llmstreamResponseGivingCtx,
  llmstreamResponseGivingCtxandRag,
  ChatMessage,
} from '../api/chatResponse';
import { FileInfo } from '../../main/parser/validator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

function normalizeMarkdown(text: string): string {
  let result = text;

  // ---- Dash delle liste ----
  result = result.replace(/-\s*\n?/g, '- '); // dash + eventuale newline → "- "
  result = result.replace(/-(S)/g, '- $1'); // aggiunge spazio dopo dash se manca

  // ---- Liste numerate ----
  // aggiunge spazio dopo punto se manca
  result = result.replace(/(\d+)\.\s*/g, '$1. ');
  // aggiunge newline prima del numero se non c'è
  result = result.replace(/(^|[^\n])(\d+\.\s)/g, '$1\n$2');

  return result;
}

type Settings = {
  theme: string;
};

type InvalidFile = {
  name: string;
  reason: string;
};

const ChatBar: React.FC = () => {
  const settings = (window as any).settings as Settings;
  const [currentTheme, setCurrentTheme] = useState(settings?.theme || 'light');
  const [messages, setMessages] = useState<
    { from: 'user' | 'ConexisAI'; text: string }[]
  >([]);
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [invalidFiles, setInvalidFiles] = useState<InvalidFile[]>([]);
  const [hasInvalidFiles, setHasInvalidFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [totalbytes, setTotalbytes] = useState(0);
  const [showFileList, setShowFileList] = useState(false);
  const windowType = 'chatbarWin';
  

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHeightRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (chatHeightRef.current) {
        const newHeight = chatHeightRef.current.scrollHeight;

        window.cbelectron.ipcRenderer.sendMessage('update-window-dims', {
          windowType,
          height: newHeight + 2,
        });
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    if (chatHeightRef.current) observer.observe(chatHeightRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const unsubscribe = (window as any).cbelectron.ipcRenderer.on(
      'settings-updated',
      (...args: unknown[]) => {
        const newSettings = args[0] as Settings;
        setCurrentTheme(newSettings.theme);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect to check textarea height and update multi-line state
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to get accurate scrollHeight
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 72);
      textareaRef.current.style.height = `${newHeight}px`;

      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.fontSize = '14px'; // Match textarea font size
      tempSpan.style.fontFamily = window.getComputedStyle(
        textareaRef.current,
      ).fontFamily;
      tempSpan.style.whiteSpace = 'pre';
      tempSpan.innerText = input;
      document.body.appendChild(tempSpan);

      // Get container width and calculate threshold
      const containerWidth = textareaRef.current.clientWidth;
      const textWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);

      // Check if content is multi-line based on:
      // 1. Text height exceeds single line
      // 2. Text contains newline character
      // 3. Text width approaches container width (leaving space for buttons)
      const lineHeight = 24; // Approximate line height in pixels
      const buttonSpace = 100; // Space reserved for buttons (matches padding-right in CSS)
      const isMulti =
        newHeight > lineHeight + 5 ||
        input.includes('\n') ||
        textWidth > containerWidth - buttonSpace - 20; // 20px buffer

      setIsMultiLine(isMulti);
    }
  }, [input]);

  // Handle file validation with main process
  const validateFile = async (file: File): Promise<boolean> => {
    const arrayBuffer = await file.arrayBuffer();
    console.log('fatto');
    try {
      let info: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        arraybuffer: arrayBuffer,
      };
      // Send file info to main process for validation
      const isValid = await window.cbelectron.ipcRenderer.invoke(
        'validate-dropped-file',
        info,
      );
      return isValid as boolean;
    } catch (error) {
      console.error('Error validating file:', error);
      return false;
    }
  };

  // Handle file drop
  const handleFileDrop = async (files: FileList) => {
    const newFiles: File[] = [];
    const newInvalidFiles: InvalidFile[] = [];
    let bytescount = 0;
    let hasInvalid = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isValid = await validateFile(file);

      if (totalbytes < 52428800) {
        if (isValid) {
          newFiles.push(file);
          bytescount += file.size;
        } else {
          // Track invalid files
          newInvalidFiles.push({
            name: file.name,
            reason: "File validation failed"
          });
          hasInvalid = true;
        }
      } else {
        // File rejected due to size limit
        newInvalidFiles.push({
          name: file.name,
          reason: "Total upload size exceeded"
        });
        hasInvalid = true;
      }
    }

    setDroppedFiles((prev) => [...prev, ...newFiles]);
    setInvalidFiles((prev) => [...prev, ...newInvalidFiles]);
    setHasInvalidFiles(hasInvalid || newInvalidFiles.length > 0);
    setTotalbytes(totalbytes + bytescount);
    
    // Automatically show file list if there are invalid files
    if (hasInvalid) {
      setExpanded(true)
      setShowFileList(true);
      
      // Auto-dismiss invalid files alert after 5 seconds
      setTimeout(() => {
        setHasInvalidFiles(false);
      }, 5000);
    }
  };

  // Handle drag events with improved handling for nested elements
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're entering from outside or from a child element
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Ensure dragging state is maintained
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set dragging to false if we're leaving the container (not entering a child)
    // Check if the related target is outside our container
    if (
      inputContainerRef.current &&
      !inputContainerRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileDrop(e.dataTransfer.files);
    }
  };

  // Add effect to ensure drag events are properly captured
  useEffect(() => {
    const captureGlobalDrag = (e: globalThis.DragEvent) => {
      if (
        isDragging &&
        inputContainerRef.current &&
        !inputContainerRef.current.contains(e.target as Node)
      ) {
        setIsDragging(false);
      }
    };

    document.addEventListener('dragend', captureGlobalDrag);
    return () => {
      document.removeEventListener('dragend', captureGlobalDrag);
    };
  }, [isDragging]);

  // Clear all dropped files
  const clearDroppedFiles = () => {
    window.cbelectron.ipcRenderer.sendMessage('clear-vDB');
    setDroppedFiles([]);
    setInvalidFiles([]);
    setHasInvalidFiles(false);
    setTotalbytes(0);
  };

  const handleSend = async () => {
    if (!input.trim() && droppedFiles.length === 0) return;

    if (!expanded) {
      setExpanded(true);
    }

    // Prepare message with file attachments if any
    let queryResult: string = '';
    let messageText = input;
    if (droppedFiles.length > 0) {
      queryResult = await window.cbelectron.ipcRenderer.invoke(
        'DBQuery',
        input,
      );
      clearDroppedFiles();
    }

    const userMessage: ChatMessage = { from: 'user', text: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setDroppedFiles([]);
    setIsTyping(true);

    const ctx = messages.slice(-20);
    setMessages((prev) => [...prev, { from: 'ConexisAI', text: '' }]);

    let buffer = '';
    let streamerr = false;
    try {
      if (droppedFiles.length < 0) {
        console.log("eccolo")
        await llmstreamResponseGivingCtx(ctx, input, (chunk) => {
          // sostituisce chunk vuoti o solo spazi con newline
          if (!chunk.trim()) chunk = '\n';

          // append chunk direttamente all'ultimo messaggio
          setMessages((prev) => {
            const last = [...prev];
            last[last.length - 1].text += chunk;
            buffer += chunk;

            return last;
          });
        });
      } else {
        console.log('ciao')
        await llmstreamResponseGivingCtxandRag(
          ctx,
          queryResult,
          input,
          (chunk) => {
            // sostituisce chunk vuoti o solo spazi con newline
            if (!chunk.trim()) chunk = '\n';

            // append chunk direttamente all'ultimo messaggio
            setMessages((prev) => {
              const last = [...prev];
              last[last.length - 1].text += chunk;
              buffer += chunk;

              return last;
            });
          },
        );
      }
    } catch (err) {
      streamerr = true;
      console.error('Errore streaming:', err);
      setMessages((prev) => {
        const last = [...prev];
        last[last.length - 1].text = 'Errore nello streaming';
        return last;
      });
    } finally {
      if (!streamerr) {
        setMessages((prev) => {
          const last = [...prev];
          //last[last.length - 1].text = normalizeMarkdown(buffer);
          return last;
        });
      }
      setIsTyping(false);
      console.log(buffer);
    }
  };

  return (
    <div
      ref={chatHeightRef}
      className={`floating-bar theme-${currentTheme} ${
        expanded ? 'expanded' : 'collapsed'
      }`}
    >
      {/* TOP BAR COLLAPSED */}
      {!expanded && <div className="collapsed-top-bar">ConexisAI</div>}

      {/* HEADER / FRAME */}
      {expanded && (
        <div className="chat-header">
          <div className="window-buttons">
            <button
              onClick={() =>
                (window as any).cbelectron.ipcRenderer.sendMessage(
                  'minimize-chatbar',
                )
              }
              className="win-btn minimize"
            >
              −
            </button>
            <button
              onClick={() =>
                (window as any).cbelectron.ipcRenderer.sendMessage(
                  'close-chatbar',
                )
              }
              className="win-btn close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="chat-wrapper">
          <div className="chat-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`msg ${m.from}`}>
                {m.from === 'ConexisAI' ? (
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                ) : (
                  m.text
                )}
              </div>
            ))}
            {isTyping && (
              <div className="msg bot typing animate-typing">
                Conexis sta scrivendo...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* INPUT */}
      <div className="chat-input">
        <div
          ref={inputContainerRef}
          className={`input-container theme-${currentTheme} ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="textarea-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              placeholder="Write a message..."
              onChange={(e) => {
                setInput(e.target.value);
                // Height adjustment is now handled in the useEffect
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                } else if (e.key === 'Enter' && e.shiftKey) {
                  // Force multi-line mode when user manually adds a line break
                  setIsMultiLine(true);
                }
              }}
              rows={1}
              className="auto-resize-textarea"
            />
          </div>

          <div
            className={`action-buttons ${isMultiLine ? 'multi-line' : 'single-line'}`}
          >
            <div className="left-buttons">
              {expanded && (
                <button
                  onClick={() =>
                    window.cbelectron.ipcRenderer.sendMessage(
                      'save-chat',
                      messages,
                    )
                  }
                  className="action-button"
                >
                  <Download size={18} />
                </button>
              )}
              <div className="attachment-button-container">
                <button
                  className={`action-button ${hasInvalidFiles ? 'pulse-red' : ''}`}
                  onClick={() => {
                    // If chat is collapsed, expand it first
                    if (!expanded) {
                      setExpanded(true);
                    }
                    // Toggle file list visibility
                    setShowFileList(!showFileList);
                    
                    // Clear invalid files alert when user clicks to view files
                    if (!showFileList) {
                      setHasInvalidFiles(false);
                    }
                  }}
                >
                  <Paperclip size={18} />
                </button>
                {droppedFiles.length > 0 && (
                  <span className="file-counter">{droppedFiles.length}</span>
                )}
                {hasInvalidFiles && (
                  <span className="invalid-file-indicator">
                    <AlertCircle size={14} />
                  </span>
                )}
                
                {/* File List Dropdown */}
                {showFileList && (
                  <div className="file-list-dropdown">
                    <div className="file-list-header">
                      <span>Attached Files</span>
                      <button 
                        className="file-list-close" 
                        onClick={() => {
                          setShowFileList(false);
                          // Clear invalid files state when user closes the file list
                          setHasInvalidFiles(false);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    {droppedFiles.length > 0 || invalidFiles.length > 0 ? (
                      <>
                        {droppedFiles.length > 0 && (
                          <div className="file-section">
                            <div className="file-section-header">Valid Files</div>
                            <ul className="file-items">
                              {droppedFiles.map((file, index) => (
                                <li key={index} className="file-item">
                                  <FileText size={14} />
                                  <span className="file-name">{file.name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {invalidFiles.length > 0 && (
                          <div className="file-section">
                            <div className="file-section-header invalid">Rejected Files</div>
                            <ul className="file-items">
                              {invalidFiles.map((file, index) => (
                                <li key={index} className="file-item invalid-file">
                                  <AlertCircle size={14} />
                                  <div className="invalid-file-info">
                                    <span className="file-name">{file.name}</span>
                                    <span className="invalid-reason">{file.reason}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="no-files">No files attached</div>
                    )}
                    
                    <div className="file-list-actions">
                      <button 
                        className="file-action-button add-file"
                        onClick={() => {
                          // Open file picker dialog
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.multiple = true;
                          input.onchange = async (e) => {
                            const files = (e.target as HTMLInputElement).files;
                            if (files && files.length > 0) {
                              await handleFileDrop(files);
                            }
                          };
                          input.click();
                        }}
                      >
                        <Plus size={14} />
                        <span>Add File</span>
                      </button>
                      
                      {(droppedFiles.length > 0 || invalidFiles.length > 0) && (
                        <button 
                          className="file-action-button clear-files"
                          onClick={clearDroppedFiles}
                        >
                          <X size={14} />
                          <span>Clear All</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button className="send-button" onClick={handleSend}>
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBar;
