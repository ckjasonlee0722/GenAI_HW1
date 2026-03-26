# Your Own ChatGPT

A full-stack AI chat application built with Next.js, featuring real-time streaming, persistent conversation history, multi-model comparison, and vision capabilities. Deployed on Vercel with Supabase as the backend database.

**Live Demo:** [gen-ai-hw-1.vercel.app](https://gen-ai-hw-1.vercel.app)

---

## Features

### Core
- **LLM Model Selection** — Switch between Llama 3.1 8B, Llama 3.3 70B, Qwen QwQ 32B, and Llama 4 Scout 17B at runtime
- **System Prompt** — Fully customizable system-level instruction to shape model behavior
- **API Parameter Control** — Real-time adjustment of Temperature, Max Tokens, Top P, and Frequency Penalty
- **Streaming Output** — Token-by-token streaming via Vercel AI SDK `streamText` and `useChat` hook
- **Short-Term Memory** — Full conversation history passed to the API on every request, enabling multi-turn dialogue

### Extended
- **Persistent Chat History** — Conversations stored in Supabase PostgreSQL; accessible across sessions
- **Auto Title Generation** — First user message triggers a background LLM call to generate a concise conversation title
- **Dual Model Comparison** — Split-screen mode to send the same prompt to two different models simultaneously
- **Vision (Image Upload)** — Upload any image format (JPG, PNG, WebP, GIF, BMP); client-side Canvas API converts to JPEG before encoding as base64 for multimodal API requests
- **Markdown Rendering** — Full Markdown support with syntax-highlighted code blocks via `react-syntax-highlighter`
- **Token Usage Display** — Per-message token estimation and cumulative conversation token count
- **Export to Markdown** — Download full conversation as a `.md` file
- **Dark Mode** — Persistent dark/light theme with `localStorage`; UI inspired by Kanye West's *Donda* album aesthetic

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| AI / Streaming | Vercel AI SDK (`streamText`, `useChat`), Groq API |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| Image Processing | Browser Canvas API (client-side JPEG conversion) |
| Markdown | `react-markdown`, `react-syntax-highlighter` |

---

## Architecture

```
Browser (Next.js Client)
│
├── useChat hook — manages message state, streaming, and multi-turn history
│
└── POST /api/chat (Next.js Route Handler)
        │
        ├── Vercel AI SDK streamText
        │       └── Groq LPU Inference API
        │               ├── Standard chat (text-only)
        │               └── Multimodal (base64 image + text)
        │
        └── toDataStreamResponse → ReadableStream → client

Supabase PostgreSQL
├── conversations (id, title, created_at)
└── messages (id, conversation_id, role, content, created_at)
```

---

## Local Development

### Prerequisites
- Node.js 18+
- Groq API key — [console.groq.com](https://console.groq.com)
- Supabase project — [supabase.com](https://supabase.com)

### Setup

```bash
git clone https://github.com/ckjasonlee0722/GenAI_HW1.git
cd GenAI_HW1/hw01-chatgpt
npm install
```

Create `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Initialize Supabase tables (run in Supabase SQL Editor):

```sql
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '新對話',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON conversations FOR ALL USING (true);
CREATE POLICY "allow all" ON messages FOR ALL USING (true);
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key (server-side only, never exposed to client) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key |

---

## Course Context

Built as HW01 for *Introduction to Generative AI* at NYCU (Spring 2026). The assignment required implementing a functional ChatGPT-style interface with model selection, system prompt, API parameter control, streaming, and short-term memory. All extended features were implemented beyond the base requirements.

---

## Author

**Hsiang (Jason) Lee**
B.S. Computer Science, NYCU 
[GitHub](https://github.com/ckjasonlee0722) · [Email](mailto:jasonlee2002.com.tw@gmail.com)
