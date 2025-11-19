# AI Chat Application with Llama 3.3

A full-stack AI-powered chat application using **Llama 3.3** via Cloudflare Workers AI, featuring persistent chat history, session management, and a modern React interface.

![AI Chat Interface](https://img.shields.io/badge/AI-Llama%203.3-purple) ![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20AI-orange) ![React](https://img.shields.io/badge/React-18-blue)

---
## Live Demo

You can demo out my website at 
## 🌟 Features

- **🤖 Llama 3.3 Integration** - Powered by Cloudflare Workers AI
- **💾 Persistent Chat History** - All conversations saved locally
- **🔄 Session Management** - Switch between multiple chat sessions
- **📝 Auto-titled Chats** - Sessions automatically named from first message
- **🗑️ Delete Chats** - Remove individual chat sessions
- **⚡ Durable Objects** - Server-side state management for conversation context
- **🎨 Modern UI** - Clean, responsive interface with sidebar navigation
- **🔐 Secure** - CORS-enabled API with session isolation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          Frontend (React)                    │
│  - Chat Interface                            │
│  - Session Management                        │
│  - localStorage for persistence             │
└─────────────────┬───────────────────────────┘
                  │ HTTPS
                  │ /api/chat
                  ▼
┌─────────────────────────────────────────────┐
│     Cloudflare Worker (Backend)             │
│  - API Routes (/api/*)                      │
│  - CORS Handling                            │
│  - Session Routing                          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│       Durable Objects                       │
│  - Conversation State                       │
│  - Message History (last 20)               │
│  - Workflow Coordination                    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│       Cloudflare Workers AI                 │
│  - Llama 3.3 70B Model                     │
│  - Natural Language Processing             │
└─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ai-chat-project/
├── backend/                     # Backend
│   ├── worker.js                # Worker + Durable Objects
│   └── wrangler.jsonc           # Worker configuration
│
└── frontend/                    # Frontend
    ├── src
    │     └──App.jsx             # React application
    └── wrangler.jsonc           # Pages configuration
```

---

## 🚀 Getting Started

### **Prerequisites**

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### **Installation**

1. **Install Wrangler CLI**

```bash
npm install -g wrangler
```

2. **Login to Cloudflare**

```bash
wrangler login
```

---

## 🛠️ Backend Setup

### **1. Create Worker Files**

In `backend/` directory:

**`worker.js`** - Copy the worker code from the artifact

**`wrangler.jsonc`** - Backend configuration:

```json
{
  "name": "ai-chat-worker",
  "main": "worker.js",
  "compatibility_date": "2024-01-01",
  
  "ai": {
    "binding": "AI"
  },
  
  "durable_objects": {
    "bindings": [
      {
        "name": "CONVERSATION_DO",
        "class_name": "ConversationDO",
        "script_name": "ai-chat-worker"
      }
    ]
  },
  
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["ConversationDO"]
    }
  ]
}
```

### **2. Deploy Backend**

```bash
cd ai-chat-worker
wrangler deploy
```

**Output:**
```
Published ai-chat-worker (1.23 sec)
  https://ai-chat-worker.your-subdomain.workers.dev
```

**Save this URL!** You'll need it for the frontend.

---

## 🎨 Frontend Setup

### **1. Create Frontend Files**

In `frontend/src/` directory:

**`App.jsx`** - Copy the HTML code from the standalone artifact

**Important:** Update the worker URL in `App.jsx`:

```javascript
// Line ~19 in index.html
const WORKER_URL = 'https://ai-chat-worker.your-subdomain.workers.dev';
```

**`wrangler.jsonc`** - Pages configuration:

```json
{
  "name": "ai-chat-frontend",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./"
}
```

### **2. Deploy Frontend**

**Option A: Direct Upload (Easiest)**

```bash
cd ai-chat-frontend
wrangler pages deploy . --project-name=ai-chat
```

**Option B: Git Integration**

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/ai-chat-frontend.git
git push -u origin main
```

2. Connect to Cloudflare Pages:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repository
   - Build settings: Framework preset = **None**, Build output = **/**
   - Deploy!

**Output:**
```
✨ Deployment complete!
https://ai-chat.pages.dev
```

---

## 🧪 Local Development

### **Backend (Worker)**

```bash
cd ai-chat-worker
wrangler dev
# Worker running at http://localhost:8787
```

### **Frontend**

Update `app.jsx` for local development:

```javascript
const WORKER_URL = 'http://localhost:8787';  // Local worker
```

Serve the frontend:

```bash
cd ai-chat-frontend
npx http-server -p 3000
# Frontend running at http://localhost:3000
```

Visit `http://localhost:3000` to test!

---

## 🎯 Usage

### **Starting a Chat**

1. Visit your deployed Pages URL: `https://ai-chat.pages.dev`
2. Type a message and press Enter or click Send
3. Chat with Llama 3.3!

### **Managing Chat History**

- **Create New Chat**: Click the "+ New" button in the sidebar
- **Switch Chats**: Click any chat in the sidebar to load it
- **Delete Chat**: Click the "×" button on any chat
- **Clear Current Chat**: Click "Clear Chat" at the bottom of sidebar

### **Chat Sessions**

- Each chat is automatically titled based on your first message
- Chats are sorted by date (newest first)
- All chats persist in your browser's localStorage
- Switch between chats without losing context

---

## 🔧 Configuration

### **Customizing the Model**

In `worker.js`, you can change the AI model:

```javascript
const aiResponse = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
  messages: [...],
  max_tokens: 512,      // Adjust response length
  temperature: 0.7      // Adjust creativity (0-1)
});
```

### **Custom Domain**

**Backend (Worker):**

In `wrangler.jsonc`:
```json
"routes": [
  {
    "pattern": "api.yourdomain.com/*",
    "zone_name": "yourdomain.com"
  }
]
```

**Frontend (Pages):**

In Cloudflare Dashboard → Pages → Custom domains → Add your domain

---

## 📊 Storage Details

### **Frontend (localStorage)**

Stores chat sessions and messages locally in the browser:

- `current-chat-session` - Active session metadata
- `chat-session-{id}` - Session metadata (title, timestamp)
- `messages-{id}` - Conversation messages array

### **Backend (Durable Objects)**

Stores conversation history (last 20 messages) for context:

- Isolated per session ID
- Persistent across requests
- Automatic cleanup of old messages

---

## 💰 Pricing

### **Cloudflare Free Tier**

- **Workers**: 100,000 requests/day
- **Durable Objects**: 1 GB storage, 1M read/write ops
- **Workers AI**: 10,000 neurons/day (Llama 3.3 calls)
- **Pages**: Unlimited bandwidth

**Estimated Cost for Personal Use**: $0/month (within free tier)

---

## 🔐 Security

- ✅ CORS headers prevent unauthorized access
- ✅ Session isolation via unique IDs
- ✅ No authentication required (consider adding for production)
- ✅ Client-side data stored in browser only
- ✅ API rate limiting via Cloudflare

**⚠️ Note**: This is a demo application. For production use, consider adding:
- User authentication
- Rate limiting per user
- Content moderation
- Error tracking

---

## 📚 API Documentation

### **POST /api/chat**

Send a message to Llama 3.3

**Request:**
```bash
curl -X POST https://your-worker.workers.dev/api/chat?sessionId=session-123 \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

**Response:**
```json
{
  "message": "Hello! I'm doing well, thank you for asking...",
  "history": [
    {"role": "user", "content": "Hello, how are you?"},
    {"role": "assistant", "content": "Hello! I'm doing well..."}
  ]
}
```

### **POST /api/clear**

Clear conversation history for a session

**Request:**
```bash
curl -X POST https://your-worker.workers.dev/api/clear?sessionId=session-123
```

**Response:**
```json
{"success": true}
```

### **GET /api/history**

Get conversation history for a session

**Request:**
```bash
curl https://your-worker.workers.dev/api/history?sessionId=session-123
```

**Response:**
```json
{
  "history": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

---

## 📧 Support

Having issues? Check:

1. [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
2. [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
3. [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
4. [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)

---
