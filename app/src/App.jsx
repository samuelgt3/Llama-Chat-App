import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Settings } from 'lucide-react';

export default function AIChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
      
      // Call API on the same origin - no need for worker URL
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
      // Clear on server
      await fetch(`/api/clear?sessionId=${sessionId}`, {
        method: 'POST'
      });
      
      // Clear local storage
      await window.storage.delete(`messages-${sessionId}`);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  if (showConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
          
          <div className="text-slate-300 text-sm">
            <p className="mb-4">Your app is configured to use the same-origin API routes.</p>
            <p>Session ID: <span className="text-purple-400 font-mono">{sessionId.substring(0, 30)}...</span></p>
          </div>

          <button
            onClick={() => setShowConfig(false)}
            className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-6 py-3 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-800/50 p-4 flex flex-col">
        <div className="flex-1">
          <h1 className="text-white font-semibold text-lg mb-4">Chat History</h1>
          <div className="space-y-2">
            <div className="bg-slate-800/50 rounded-lg p-3 text-slate-300 text-sm">
              Current Session
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => setShowConfig(true)}
            className="w-full flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg p-3 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>
          <button
            onClick={clearConversation}
            className="w-full flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg p-3 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-12">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl">
                <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl px-16 py-12 mb-8 inline-block">
                  <h2 className="text-white text-4xl font-light">Welcome! Type something to start</h2>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-3xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600/90 text-white'
                        : 'bg-slate-800/50 text-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/50 rounded-3xl px-6 py-4">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-8 py-6 border-t border-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
                placeholder="Type something..."
                className="w-full bg-slate-800/50 backdrop-blur-sm text-white text-base placeholder-slate-400 rounded-full px-7 py-5 pr-16 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-slate-700/50 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-full p-3 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}