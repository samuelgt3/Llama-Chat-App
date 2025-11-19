import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Settings } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [chatSessions, setChatSessions] = useState([]);           
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [showConfig, setShowConfig] = useState(true);
  const messagesEndRef = useRef(null);

  const WORKER_URL = "https://ai-chat-worker.sgetnet283.workers.dev";
  useEffect(() => {
    initializeSession();
    loadChatSessions(); 
  }, []);   
  const loadChatSessions = async () => {
    try {
      const stored = await window.storage.list('chat-session-');
      if (stored && stored.keys) {
        const sessions = [];
        for (const key of stored.keys) {
          try {
            const sessionData = await window.storage.get(key);
            if (sessionData) {
              const data = JSON.parse(sessionData.value);
              sessions.push(data);
            }
          } catch (e) {
            console.error('Error loading session:', e);
          }
        }
        // Sort by timestamp, newest first
        sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setChatSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSession = async () => {
    try {
      const stored = await window.storage.get('current-chat-session');   
      if (stored) {
        const data = JSON.parse(stored.value);
        setSessionId(data.sessionId);
        setCurrentSessionId(data.sessionId);                             
        
        const msgStored = await window.storage.get(`messages-${data.sessionId}`);
        if (msgStored) {
          setMessages(JSON.parse(msgStored.value));
        }
      } else {
        await createNewChat();                                           
      }
    } catch (error) {
      await createNewChat();                                              
      console.error('Storage error:', error);
    }
  };
  const createNewChat = async () => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSession = {
      sessionId: newSessionId,
      title: 'New Chat',
      timestamp: new Date().toISOString(),
      preview: ''
    };
    
    setSessionId(newSessionId);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    
    try {
      await window.storage.set('current-chat-session', JSON.stringify(newSession));
      await window.storage.set(`chat-session-${newSessionId}`, JSON.stringify(newSession));
      await loadChatSessions();
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };
  const switchToSession = async (sessionId) => {
    try {
      const sessionData = await window.storage.get(`chat-session-${sessionId}`);
      if (sessionData) {
        const data = JSON.parse(sessionData.value);
        setSessionId(sessionId);
        setCurrentSessionId(sessionId);
        
        await window.storage.set('current-chat-session', JSON.stringify(data));
        
        const msgStored = await window.storage.get(`messages-${sessionId}`);
        if (msgStored) {
          setMessages(JSON.parse(msgStored.value));
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to switch session:', error);
    }
  };

  const deleteSession = async (sessionIdToDelete, e) => {
    e.stopPropagation();
    
    try {
      await window.storage.delete(`chat-session-${sessionIdToDelete}`);
      await window.storage.delete(`messages-${sessionIdToDelete}`);
      
      if (sessionIdToDelete === currentSessionId) {
        await createNewChat();
      }
      
      await loadChatSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };
  const saveMessages = async (msgs) => {
    try {
      await window.storage.set(`messages-${sessionId}`, JSON.stringify(msgs));
      
      // ← ADDED: Update session with preview and title
      if (msgs.length > 0) {
        const firstUserMsg = msgs.find(m => m.role === 'user');
        const preview = firstUserMsg ? firstUserMsg.content.substring(0, 50) : 'New Chat';
        const title = firstUserMsg ? firstUserMsg.content.substring(0, 30) : 'New Chat';
        
        const sessionData = {
          sessionId: sessionId,
          title: title,
          timestamp: new Date().toISOString(),
          preview: preview
        };
        
        await window.storage.set(`chat-session-${sessionId}`, JSON.stringify(sessionData));
        await loadChatSessions();
      }
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      await saveMessages(updatedMessages);
      
      const response = await fetch(`${WORKER_URL}/api/chat?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveMessages(finalMessages);
    } catch (error) {
      console.error('Error calling Llama 3.3:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please make sure the worker is deployed correctly.`,
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      await fetch(`${WORKER_URL}/api/clear?sessionId=${sessionId}`, {
        method: 'POST'
      });
      
      localStorage.removeItem(`messages-${sessionId}`);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  if (showConfig) {
    return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'grid',
      gridTemplateColumns: '256px 1fr',
      background: 'linear-gradient(to bottom right, #1e1b4b, #581c87, #0f172a)'
    }}>
      {/* Sidebar */}
      <aside style={{ 
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRight: '2px solid rgba(147, 51, 234, 0.3)',
        overflowY: 'auto'
      }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h1 style={{ color: '#ffffff', fontWeight: '600', fontSize: '1.125rem', margin: 0 }}>
            Chat History
          </h1>
          <button
            onClick={createNewChat}
            style={{
              backgroundColor: '#9333ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#7e22ce'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
          >
            + New
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {chatSessions.length === 0 ? (
            <div style={{ 
              backgroundColor: 'rgba(30, 41, 59, 0.7)', 
              color: '#94a3b8', 
              borderRadius: '0.5rem', 
              padding: '0.75rem', 
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              No chats yet
            </div>
          ) : (
            chatSessions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => switchToSession(session.sessionId)}
                style={{ 
                  backgroundColor: session.sessionId === currentSessionId ? 'rgba(147, 51, 234, 0.3)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  border: session.sessionId === currentSessionId ? '1px solid rgba(147, 51, 234, 0.5)' : '1px solid transparent',
                  transition: 'all 0.2s',
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start'
                }}
                onMouseEnter={(e) => {
                  if (session.sessionId !== currentSessionId) {
                    e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.7)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (session.sessionId !== currentSessionId) {
                    e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                  }
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ 
                    fontWeight: session.sessionId === currentSessionId ? '600' : '400',
                    marginBottom: '0.25rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {session.title || 'New Chat'}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {new Date(session.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteSession(session.sessionId, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    fontSize: '1rem',
                    marginLeft: '0.5rem',
                    flexShrink: 0
                  }}
                  title="Delete chat"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      </aside>
      {/* Main Chat Area */}
      <main style={{ 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Messages */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '3rem 2rem'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <div style={{ textAlign: 'center', maxWidth: '42rem' }}>
                <div style={{ 
                  backdropFilter: 'blur(4px)',
                  borderRadius: '1.5rem',
                  padding: '3rem 4rem',
                  display: 'inline-block',
                  backgroundColor: 'rgba(30, 41, 59, 0.3)'
                }}>
                  <h2 style={{ 
                    fontSize: '2.25rem',
                    fontWeight: '300',
                    color: '#ffffff',
                    margin: 0
                  }}>Welcome! Type something to start</h2>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              maxWidth: '56rem',
              margin: '0 auto'
            }}>
              {messages.map((message, index) => (
                <div key={index} style={{ 
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    maxWidth: '75%',
                    borderRadius: '1.5rem',
                    padding: '1rem 1.5rem',
                    backgroundColor: message.role === 'user' ? 'rgba(147, 51, 234, 0.9)' : 'rgba(30, 41, 59, 0.5)',
                    color: message.role === 'user' ? '#ffffff' : '#e2e8f0'
                  }}>
                    <p style={{ 
                      whiteSpace: 'pre-wrap',
                      fontSize: '1rem',
                      lineHeight: '1.625',
                      margin: 0
                    }}>{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ 
                    borderRadius: '1.5rem',
                    padding: '1rem 1.5rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)'
                  }}>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <div style={{ 
                        width: '0.625rem',
                        height: '0.625rem',
                        borderRadius: '50%',
                        backgroundColor: '#94a3b8',
                        animation: 'bounce 1s infinite 0ms'
                      }}></div>
                      <div style={{ 
                        width: '0.625rem',
                        height: '0.625rem',
                        borderRadius: '50%',
                        backgroundColor: '#94a3b8',
                        animation: 'bounce 1s infinite 150ms'
                      }}></div>
                      <div style={{ 
                        width: '0.625rem',
                        height: '0.625rem',
                        borderRadius: '50%',
                        backgroundColor: '#94a3b8',
                        animation: 'bounce 1s infinite 300ms'
                      }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '1.5rem 2rem',
          borderTop: '1px solid rgba(30, 41, 59, 0.3)'
        }}>
          <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
                placeholder="Type something..."
                disabled={isLoading}
                style={{
                  width: '100%',
                  backdropFilter: 'blur(4px)',
                  fontSize: '1rem',
                  borderRadius: '9999px',
                  padding: '1.25rem 4rem 1.25rem 1.75rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  color: '#ffffff',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(147, 51, 234, 0.5)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                style={{
                  position: 'absolute',
                  right: '0.625rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: !input.trim() || isLoading ? '#334155' : '#9333ea',
                  color: '#ffffff',
                  cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                  borderRadius: '50%',
                  padding: '0.75rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !isLoading) {
                    e.target.style.backgroundColor = '#7e22ce';
                  }
                }}
                onMouseLeave={(e) => {
                  if (input.trim() && !isLoading) {
                    e.target.style.backgroundColor = '#9333ea';
                  }
                }}
              >
                <Send style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.5rem); }
        }
      `}</style>
    </div>
  );
}
}