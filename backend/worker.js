// worker.js - Deploy this to Cloudflare Workers
// This handles AI requests and manages durable object coordination

export class ConversationDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const { message } = await request.json();
      
      // Get conversation history from durable object storage
      const history = await this.state.storage.get('history') || [];
      
      // Add user message to history
      const userMessage = { role: 'user', content: message };
      history.push(userMessage);
      
      // Call Llama 3.3 via Workers AI
      const aiResponse = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are a helpful, knowledgeable assistant. Provide clear, accurate, and concise answers.' },
          ...history
        ],
        max_tokens: 512,
        temperature: 0.7
      });
      
      // Add assistant response to history
      const assistantMessage = { 
        role: 'assistant', 
        content: aiResponse.response 
      };
      history.push(assistantMessage);
      
      // Store updated history (keep last 20 messages)
      const trimmedHistory = history.slice(-20);
      await this.state.storage.put('history', trimmedHistory);
      
      return Response.json({
        message: aiResponse.response,
        history: trimmedHistory
      });
    }
    
    if (url.pathname === '/api/clear' && request.method === 'POST') {
      await this.state.storage.delete('history');
      return Response.json({ success: true });
    }
    
    if (url.pathname === '/api/history' && request.method === 'GET') {
      const history = await this.state.storage.get('history') || [];
      return Response.json({ history });
    }
    
    return new Response('Not found', { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      // Get or create durable object for this session
      const sessionId = url.searchParams.get('sessionId') || 'default';
      const id = env.CONVERSATION_DO.idFromName(sessionId);
      const stub = env.CONVERSATION_DO.get(id);
      
      // Forward request to durable object
      const response = await stub.fetch(request);
      
      // Add CORS headers to response
      const newResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });
      
      return newResponse;
    }
    
    // Serve static HTML for the root path
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(getHTMLContent(), {
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};

// Embedded HTML content for the React app
function getHTMLContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Chat - Llama 3.3</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // React component would go here - simplified for embedding
    // In production, you'd build this separately and serve static assets
    const { useState, useEffect } = React;
    
    function App() {
      const [message, setMessage] = useState('');
      const [messages, setMessages] = useState([]);
      const [loading, setLoading] = useState(false);
      
      const sendMessage = async () => {
        if (!message.trim()) return;
        
        const userMsg = { role: 'user', content: message };
        setMessages(prev => [...prev, userMsg]);
        setMessage('');
        setLoading(true);
        
        try {
          const response = await fetch('/api/chat?sessionId=demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg.content })
          });
          
          const data = await response.json();
          setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      };
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-white text-3xl font-bold mb-4">AI Chat</h1>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className={\`mb-2 \${msg.role === 'user' ? 'text-right' : 'text-left'}\`}>
                  <span className={\`inline-block px-4 py-2 rounded-lg \${msg.role === 'user' ? 'bg-purple-600' : 'bg-slate-700'} text-white\`}>
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-slate-800/50 text-white rounded-full px-4 py-2"
                placeholder="Type a message..."
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-full"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    ReactDOM.render(<App />, document.getElementById('root'));
  </script>
</body>
</html>`;
}