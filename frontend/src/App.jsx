import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Settings } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSession = async () => {
    try {
      const stored = await window.storage.get('chat-session');
      if (stored) {
        const data = JSON.parse(stored.value);
        setSessionId(data.sessionId);
        
        const msgStored = await window.storage.get(`messages-${data.sessionId}`);
        if (msgStored) {
          setMessages(JSON.parse(msgStored.value));
        }
      } else {
        const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        await window.storage.set('chat-session', JSON.stringify({
          sessionId: newSessionId
        }));
      }
    } catch (error) {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      console.error('Storage error:', error);
    }
  };

  const saveMessages = async (msgs) => {
    try {
      await window.storage.set(`messages-${sessionId}`, JSON.stringify(msgs));
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
      
      const response = await fetch(`/api/chat?sessionId=${sessionId}`, {
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
      await fetch(`/api/clear?sessionId=${sessionId}`, {
        method: 'POST'
      });
      
      await window.storage.delete(`messages-${sessionId}`);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  if (showConfig) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'linear-gradient(to bottom right, #1e1b4b, #581c87, #0f172a)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '28rem',
          backdropFilter: 'blur(40px)',
          borderRadius: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '2rem',
          backgroundColor: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(51, 65, 85, 0.5)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            color: '#ffffff'
          }}>Settings</h2>
          
          <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
            <p style={{ marginBottom: '1rem' }}>Your app is configured to use the same-origin API routes.</p>
            <p>Session ID: <span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{sessionId.substring(0, 30)}...</span></p>
          </div>

          <button
            onClick={() => setShowConfig(false)}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              borderRadius: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '1rem',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#7e22ce'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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
      {/* Sidebar - Using Grid Layout */}
      <aside style={{ 
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRight: '2px solid rgba(147, 51, 234, 0.3)',
        overflowY: 'auto'
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '1.125rem',
            margin: '0 0 1rem 0'
          }}>Chat History</h1>
          <div style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.7)',
            color: '#cbd5e1',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            fontSize: '0.875rem'
          }}>
            Current Session
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <button
            onClick={() => setShowConfig(true)}
            style={{ 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#cbd5e1',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#cbd5e1';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Settings style={{ width: '1rem', height: '1rem' }} />
            <span>Settings</span>
          </button>
          <button
            onClick={clearConversation}
            style={{ 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#cbd5e1',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#cbd5e1';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Trash2 style={{ width: '1rem', height: '1rem' }} />
            <span>Clear Chat</span>
          </button>
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