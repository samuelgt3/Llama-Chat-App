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
    
    // For root path, return a simple message
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response('AI Chat Worker API is running. Deploy the frontend to Pages to interact with it', {
        headers: {
          'Content-Type': 'text/plain',
          ...corsHeaders
        }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};