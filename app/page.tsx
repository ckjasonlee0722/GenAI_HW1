"use client";

import { useChat } from "ai/react";
import { useState, useEffect, useRef } from "react";
import {
  Send, Settings2, User, Sparkles, SquarePen, MessageSquare,
  Trash2, Moon, Sun, Copy, Check, Download, Columns2
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type Conversation = { id: string; title: string; created_at: string };

function MessageContent({ content, isDark }: { content: string; isDark: boolean }) {
  return (
    <ReactMarkdown components={{
      code({ className, children, ...props }: any) {
        const isBlock = className?.includes("language-");
        if (isBlock) return (
          <pre className={`my-3 p-4 rounded text-sm overflow-x-auto font-mono ${
            isDark ? "bg-neutral-900 text-neutral-200 border border-neutral-700"
                   : "bg-neutral-100 text-neutral-800 border border-neutral-200"
          }`}><code>{children}</code></pre>
        );
        return <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${
          isDark ? "bg-neutral-900 text-neutral-200" : "bg-neutral-100 text-neutral-700"
        }`} {...props}>{children}</code>;
      },
      strong({ children }) { return <strong className="font-bold">{children}</strong>; },
      ul({ children }) { return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>; },
      ol({ children }) { return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>; },
      li({ children }) { return <li className="text-[14px]">{children}</li>; },
      p({ children }) { return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>; },
      h1({ children }) { return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>; },
      h2({ children }) { return <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>; },
      h3({ children }) { return <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>; },
    }}>{content}</ReactMarkdown>
  );
}

function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }} className={`absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all ${
      isDark ? "bg-neutral-700 hover:bg-neutral-600 text-neutral-400"
             : "bg-neutral-200 hover:bg-neutral-300 text-neutral-500"
    }`} title="複製">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function CompareMessage({ role, content, isDark, aiBubble, userBubble, textMuted, cardBg, border }: {
  role: string; content: string; isDark: boolean;
  aiBubble: string; userBubble: string; textMuted: string; cardBg: string; border: string;
}) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 max-w-[90%] ${role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border ${border} ${cardBg}`}>
          {role === 'user' ? <User size={11} className={textMuted} /> : <Sparkles size={11} className={textMuted} />}
        </div>
        <div className={`relative group px-3 py-2 rounded text-[13px] leading-relaxed ${role === 'user' ? userBubble : aiBubble}`}>
          {role === 'user' ? <p>{content}</p> : <MessageContent content={content} isDark={isDark} />}
          <CopyButton text={content} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}

type MessageListProps = {
  messages: any[]; isLoading: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  isDark: boolean; D: Record<string, string>;
};

function MessageList({ messages, isLoading, endRef, isDark, D }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center">
          <p className={`text-[10px] tracking-[0.3em] uppercase ${D.textMuted}`}>WAITING</p>
        </div>
      ) : messages.map(m => (
        <CompareMessage key={m.id} role={m.role} content={m.content} isDark={isDark}
          aiBubble={D.aiBubble} userBubble={D.userBubble} textMuted={D.textMuted}
          cardBg={D.cardBg} border={D.border} />
      ))}
      {isLoading && (
        <div className="flex justify-start gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center border ${D.border} ${D.cardBg}`}>
            <Sparkles size={11} className={`${D.textMuted} animate-pulse`} />
          </div>
          <div className={`flex items-center gap-1 px-3 py-2 rounded ${D.aiBubble}`}>
            {[0, 150, 300].map(delay => (
              <span key={delay} className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#555]' : 'bg-[#ccc]'} animate-bounce`}
                style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

export default function Home() {
  const [model, setModel] = useState("llama-3.1-8b-instant");
  const [model2, setModel2] = useState("llama-3.3-70b-versatile");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef2 = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") setIsDark(true);
  }, []);

  const toggleDark = () => setIsDark(prev => {
    localStorage.setItem("darkMode", String(!prev));
    return !prev;
  });

  const chat1 = useChat({
    api: "/api/chat",
    body: { model, systemPrompt, temperature, maxTokens, topP, frequencyPenalty },
    onFinish: async (message) => {
      if (!currentConversationId) return;
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: currentConversationId, role: 'assistant', content: message.content }),
      });
    },
  });

  // chat2：Compare Mode 專用，用 append 直接加訊息
  const chat2 = useChat({
    api: "/api/chat",
    body: { model: model2, systemPrompt, temperature, maxTokens, topP, frequencyPenalty },
  });

  // ── 自動捲到底部（用 setTimeout 確保 DOM 更新後才捲）──
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom(messagesEndRef);
  }, [chat1.messages, chat1.isLoading]);

  useEffect(() => {
    scrollToBottom(messagesEndRef2);
  }, [chat2.messages, chat2.isLoading]);

  useEffect(() => { fetchConversations(); }, []);

  const fetchConversations = async () => {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
  };

  const autoGenerateTitle = async (convId: string, firstMessage: string) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.3,
          messages: [{ role: 'user', content: `根據以下訊息，用5個字以內取一個對話標題，只回傳標題文字，不要任何標點或說明：\n"${firstMessage}"` }],
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      let raw = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += new TextDecoder().decode(value);
      }
      const lines = raw.split('\n').filter(l => l.startsWith('0:"'));
      const title = lines.map(l => { try { return JSON.parse(l.slice(2)); } catch { return ''; } })
        .join('').trim().slice(0, 20) || firstMessage.slice(0, 15);
      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId, title }),
      });
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
    } catch {}
  };

  const handleNewChat = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新對話' }),
    });
    const newConv = await res.json();
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    chat1.setMessages([]);
    chat2.setMessages([]);
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    const res = await fetch(`/api/conversations/${conv.id}`);
    const data = await res.json();
    const msgs = Array.isArray(data) ? data : [];
    chat1.setMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    chat2.setMessages([]);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      chat1.setMessages([]);
      chat2.setMessages([]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chat1.input.trim()) return;
    const userInput = chat1.input;
    let convId = currentConversationId;
    const isFirstMessage = chat1.messages.length === 0;

    if (!convId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新對話' }),
      });
      const newConv = await res.json();
      convId = newConv.id;
      setCurrentConversationId(convId);
      setConversations(prev => [newConv, ...prev]);
    }

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId, role: 'user', content: userInput }),
    });

    if (isFirstMessage && convId) autoGenerateTitle(convId, userInput);

    // 送給 chat1
    chat1.handleSubmit(e);

    // ── Compare Mode：用 append 直接送給 chat2，不依賴 input state ──
    if (compareMode) {
      chat2.append({ role: 'user', content: userInput });
    }
  };

  const handleExport = () => {
    const title = conversations.find(c => c.id === currentConversationId)?.title || 'conversation';
    const content = chat1.messages.map(m =>
      `## ${m.role === 'user' ? 'You' : 'AI'}\n\n${m.content}\n`
    ).join('\n---\n\n');
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const D: Record<string, string> = {
    pageBg:       isDark ? "bg-[#0a0a0a]"       : "bg-[#ffffff]",
    sidebarBg:    isDark ? "bg-[#0f0f0f]"       : "bg-[#f5f5f5]",
    cardBg:       isDark ? "bg-[#141414]"        : "bg-[#ffffff]",
    headerBg:     isDark ? "bg-[#0a0a0a]/90"    : "bg-[#ffffff]/90",
    inputBg:      isDark ? "bg-[#141414]"        : "bg-[#f5f5f5]",
    footerGrad:   isDark ? "from-[#0a0a0a]"     : "from-[#ffffff]",
    border:       isDark ? "border-[#1f1f1f]"   : "border-[#e5e5e5]",
    textPrimary:  isDark ? "text-[#f0f0f0]"     : "text-[#0a0a0a]",
    textMuted:    isDark ? "text-[#555555]"     : "text-[#999999]",
    textInput:    isDark ? "text-[#e0e0e0]"     : "text-[#0a0a0a]",
    hoverBg:      isDark ? "hover:bg-[#1a1a1a]" : "hover:bg-[#eeeeee]",
    activeItem:   isDark ? "bg-[#1a1a1a] text-[#f0f0f0]" : "bg-[#eeeeee] text-[#0a0a0a]",
    inactiveItem: isDark ? "text-[#555555] hover:bg-[#141414]" : "text-[#999999] hover:bg-[#f5f5f5]",
    userBubble:   isDark ? "bg-[#f0f0f0] text-[#0a0a0a]" : "bg-[#0a0a0a] text-[#f0f0f0]",
    aiBubble:     isDark ? "bg-[#141414] text-[#e0e0e0] border border-[#1f1f1f]" : "bg-[#f5f5f5] text-[#0a0a0a] border border-[#e5e5e5]",
    sendBtn:      isDark ? "bg-[#f0f0f0] text-[#0a0a0a] hover:bg-white" : "bg-[#0a0a0a] text-[#f0f0f0] hover:bg-[#222]",
    placeholder:  isDark ? "placeholder:text-[#444444]" : "placeholder:text-[#bbbbbb]",
  };

  const MODEL_OPTIONS = [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { value: "llama-3.1-8b-instant",    label: "Llama 3.1 8B" },
    { value: "qwen-qwq-32b",            label: "Qwen QwQ 32B" },
    { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
  ];

  return (
    <div className={`flex h-screen ${D.pageBg} font-sans ${D.textPrimary} transition-colors duration-300`}
      style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", letterSpacing: "0.01em" }}>

      {/* 左側：對話列表 */}
      <div className={`${isSidebarOpen ? 'w-56' : 'w-0'} overflow-hidden transition-all duration-300 border-r ${D.border} ${D.sidebarBg} flex flex-col`}>
        <div className={`px-4 py-4 border-b ${D.border} flex items-center justify-between`}>
          <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${D.textMuted}`}>Conversations</span>
          <button onClick={handleNewChat} className={`p-1.5 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}>
            <SquarePen size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className={`text-[10px] ${D.textMuted} text-center mt-10 tracking-wider`}>NO CONVERSATIONS</p>
          ) : conversations.map(conv => (
            <div key={conv.id} onClick={() => handleSelectConversation(conv)}
              className={`group flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                currentConversationId === conv.id ? D.activeItem : D.inactiveItem
              }`}>
              <span className="text-[12px] truncate">{conv.title}</span>
              <button onClick={e => handleDeleteConversation(e, conv.id)}
                className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 主區域 */}
      <div className={`flex-1 flex flex-col h-full ${D.pageBg} min-w-0`}>

        {/* Header */}
        <header className={`border-b ${D.border} flex items-center justify-between px-5 ${D.headerBg} backdrop-blur-sm`} style={{ height: '52px' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}>
              <MessageSquare size={15} />
            </button>
            <span className={`text-[12px] font-medium tracking-[0.08em] uppercase ${D.textMuted}`}>
              {currentConversationId
                ? (conversations.find(c => c.id === currentConversationId)?.title?.toUpperCase() || 'WORKSPACE')
                : 'WORKSPACE'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] tracking-wider transition-colors ${
                compareMode
                  ? (isDark ? 'bg-[#f0f0f0] text-[#0a0a0a]' : 'bg-[#0a0a0a] text-[#f0f0f0]')
                  : `${D.hoverBg} ${D.textMuted}`
              }`}>
              <Columns2 size={14} />
              <span className="hidden sm:inline">COMPARE</span>
            </button>
            {chat1.messages.length > 0 && (
              <button onClick={handleExport}
                className={`p-1.5 ${D.hoverBg} rounded transition-colors ${D.textMuted}`} title="匯出 .md">
                <Download size={15} />
              </button>
            )}
            <button onClick={toggleDark} className={`p-1.5 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}>
              <Settings2 size={15} />
            </button>
          </div>
        </header>

        {/* 對話區 */}
        {compareMode ? (
          <div className="flex-1 flex min-h-0">
            <div className={`flex-1 flex flex-col border-r ${D.border} min-w-0`}>
              <div className={`px-4 py-2 border-b ${D.border} flex items-center gap-2`}>
                <span className={`text-[10px] tracking-[0.15em] uppercase ${D.textMuted}`}>Model A</span>
                <select value={model} onChange={e => setModel(e.target.value)}
                  className={`text-[11px] border rounded px-2 py-1 ${D.border} ${D.inputBg} ${D.textInput} focus:outline-none`}>
                  {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <MessageList messages={chat1.messages} isLoading={chat1.isLoading}
                endRef={messagesEndRef} isDark={isDark} D={D} />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className={`px-4 py-2 border-b ${D.border} flex items-center gap-2`}>
                <span className={`text-[10px] tracking-[0.15em] uppercase ${D.textMuted}`}>Model B</span>
                <select value={model2} onChange={e => setModel2(e.target.value)}
                  className={`text-[11px] border rounded px-2 py-1 ${D.border} ${D.inputBg} ${D.textInput} focus:outline-none`}>
                  {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <MessageList messages={chat2.messages} isLoading={chat2.isLoading}
                endRef={messagesEndRef2} isDark={isDark} D={D} />
            </div>
          </div>
        ) : (
          <main ref={mainRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-5">
            {chat1.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-5">
                <div className={`text-[11px] tracking-[0.35em] uppercase ${D.textMuted}`}>DONDA</div>
                <div className={`w-px h-14 ${isDark ? 'bg-[#1f1f1f]' : 'bg-[#e5e5e5]'}`} />
                <p className={`text-[11px] tracking-[0.2em] uppercase ${D.textMuted}`}>Begin</p>
              </div>
            ) : chat1.messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[78%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${D.border} ${D.cardBg}`}>
                    {m.role === 'user' ? <User size={13} className={D.textMuted} /> : <Sparkles size={13} className={D.textMuted} />}
                  </div>
                  <div className={`relative group px-4 py-3 rounded text-[14px] leading-relaxed ${
                    m.role === 'user' ? D.userBubble : D.aiBubble
                  }`}>
                    {m.role === 'user' ? <p>{m.content}</p> : <MessageContent content={m.content} isDark={isDark} />}
                    <CopyButton text={m.content} isDark={isDark} />
                  </div>
                </div>
              </div>
            ))}
            {chat1.isLoading && (
              <div className="flex justify-start gap-3">
                <div className={`w-7 h-7 rounded flex items-center justify-center border ${D.border} ${D.cardBg}`}>
                  <Sparkles size={13} className={`${D.textMuted} animate-pulse`} />
                </div>
                <div className={`flex items-center gap-1.5 px-4 py-3 rounded ${D.aiBubble}`}>
                  {[0, 150, 300].map(d => (
                    <span key={d} className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#555]' : 'bg-[#ccc]'} animate-bounce`}
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </main>
        )}

        {/* 輸入框 */}
        <footer className={`px-5 pb-5 pt-2 bg-gradient-to-t ${D.footerGrad} to-transparent`}>
          <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto relative flex items-center">
            <input
              className={`w-full py-3 pl-5 pr-12 rounded border ${D.border} ${D.inputBg} ${D.textInput} ${D.placeholder} text-[14px] tracking-wide focus:outline-none transition-all`}
              value={chat1.input}
              placeholder={compareMode ? "Send to both models..." : currentConversationId ? "Message..." : "Start a new conversation..."}
              onChange={chat1.handleInputChange}
              disabled={chat1.isLoading || chat2.isLoading}
            />
            <button type="submit" disabled={chat1.isLoading || chat2.isLoading || !chat1.input.trim()}
              className={`absolute right-2 p-2 rounded transition-colors disabled:opacity-30 ${D.sendBtn}`}>
              <Send size={14} />
            </button>
          </form>
          {compareMode && (
            <p className={`text-center text-[10px] tracking-[0.15em] uppercase mt-2 ${D.textMuted}`}>
              {MODEL_OPTIONS.find(o => o.value === model)?.label} vs {MODEL_OPTIONS.find(o => o.value === model2)?.label}
            </p>
          )}
        </footer>
      </div>

      {/* 右側：設定 */}
      <div className={`overflow-hidden transition-all duration-300 border-l ${D.border} ${D.sidebarBg} flex flex-col`}
        style={{ width: isSettingsOpen ? '268px' : '0' }}>
        <div className="p-5 space-y-5 overflow-y-auto">
          <h2 className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${D.textMuted}`}>Settings</h2>
          <div className="space-y-1.5">
            <label className={`text-[10px] tracking-wider uppercase ${D.textMuted}`}>Model</label>
            <select value={model} onChange={e => setModel(e.target.value)}
              className={`w-full p-2 text-[12px] border rounded ${D.border} ${D.inputBg} ${D.textInput} focus:outline-none`}>
              {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={`text-[10px] tracking-wider uppercase ${D.textMuted}`}>System Prompt</label>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Define the AI's behavior..."
              className={`w-full p-2 text-[12px] border rounded h-24 resize-none focus:outline-none ${D.border} ${D.inputBg} ${D.textInput} ${D.placeholder}`} />
          </div>
          {[
            { label: 'Temperature',   value: temperature,      setter: setTemperature,      min: 0,   max: 2,    step: 0.1  },
            { label: 'Max Tokens',    value: maxTokens,        setter: setMaxTokens,        min: 100, max: 4096, step: 100  },
            { label: 'Top P',         value: topP,             setter: setTopP,             min: 0,   max: 1,    step: 0.05 },
            { label: 'Freq. Penalty', value: frequencyPenalty, setter: setFrequencyPenalty, min: 0,   max: 2,    step: 0.1  },
          ].map(({ label, value, setter, min, max, step }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between">
                <label className={`text-[10px] tracking-wider uppercase ${D.textMuted}`}>{label}</label>
                <span className={`text-[10px] font-mono ${D.textMuted}`}>{value}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => setter(parseFloat(e.target.value) as any)}
                className="w-full accent-neutral-500" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}