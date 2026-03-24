"use client";

import { useChat } from "ai/react";
import { useState, useEffect, useRef } from "react";
import { Send, Settings2, User, Sparkles, SquarePen, MessageSquare, Trash2, Moon, Sun, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

// Markdown 渲染組件
function MessageContent({ content, isDark }: { content: string; isDark: boolean }) {
  return (
    <ReactMarkdown
      components={{
        // Code block
        code({ node, className, children, ...props }: any) {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className={`my-3 p-4 rounded text-sm overflow-x-auto font-mono ${
                isDark ? "bg-neutral-900 text-neutral-200 border border-neutral-700" : "bg-neutral-100 text-neutral-800 border border-neutral-200"
              }`}>
                <code>{children}</code>
              </pre>
            );
          }
          return (
            <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${
              isDark ? "bg-neutral-900 text-neutral-200" : "bg-neutral-100 text-neutral-700"
            }`} {...props}>
              {children}
            </code>
          );
        },
        // Bold
        strong({ children }) {
          return <strong className="font-bold">{children}</strong>;
        },
        // List
        ul({ children }) {
          return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-[15px]">{children}</li>;
        },
        // Paragraph
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        // Heading
        h1({ children }) { return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>; },
        h2({ children }) { return <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>; },
        h3({ children }) { return <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// 訊息複製按鈕
function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all ${
        isDark ? "bg-neutral-700 hover:bg-neutral-600 text-neutral-400" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-500"
      }`}
      title="複製訊息"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function Home() {
  const [model, setModel] = useState("llama-3.1-8b-instant");
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

  // 自動捲到底部
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      localStorage.setItem("darkMode", String(!prev));
      return !prev;
    });
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
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

  // 新訊息時自動捲到底
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  useEffect(() => { fetchConversations(); }, []);

  const fetchConversations = async () => {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
  };

  const handleNewChat = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新對話' }),
    });
    const newConv = await res.json();
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    setMessages([]);
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    const res = await fetch(`/api/conversations/${conv.id}`);
    const data = await res.json();
    const msgs = Array.isArray(data) ? data : [];
    setMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) { setCurrentConversationId(null); setMessages([]); }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    let convId = currentConversationId;
    if (!convId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.slice(0, 20) }),
      });
      const newConv = await res.json();
      convId = newConv.id;
      setCurrentConversationId(convId);
      setConversations((prev) => [newConv, ...prev]);
    }
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId, role: 'user', content: input }),
    });
    handleSubmit(e);
  };

  // ── Donda 風格色彩 tokens ──
  const D = {
    // 背景
    pageBg:     isDark ? "bg-[#0a0a0a]"     : "bg-[#ffffff]",
    sidebarBg:  isDark ? "bg-[#0f0f0f]"     : "bg-[#f5f5f5]",
    cardBg:     isDark ? "bg-[#141414]"      : "bg-[#ffffff]",
    headerBg:   isDark ? "bg-[#0a0a0a]/90"  : "bg-[#ffffff]/90",
    inputBg:    isDark ? "bg-[#141414]"      : "bg-[#f5f5f5]",
    footerGrad: isDark ? "from-[#0a0a0a]"   : "from-[#ffffff]",

    // 邊框 — 極細
    border:     isDark ? "border-[#1f1f1f]"  : "border-[#e5e5e5]",

    // 文字
    textPrimary: isDark ? "text-[#f0f0f0]"  : "text-[#0a0a0a]",
    textMuted:   isDark ? "text-[#555555]"  : "text-[#999999]",
    textInput:   isDark ? "text-[#e0e0e0]"  : "text-[#0a0a0a]",

    // 互動
    hoverBg:    isDark ? "hover:bg-[#1a1a1a]" : "hover:bg-[#eeeeee]",
    activeItem: isDark ? "bg-[#1a1a1a] text-[#f0f0f0]" : "bg-[#eeeeee] text-[#0a0a0a]",
    inactiveItem: isDark ? "text-[#555555] hover:bg-[#141414]" : "text-[#999999] hover:bg-[#f5f5f5]",

    // 訊息泡泡
    userBubble: isDark ? "bg-[#f0f0f0] text-[#0a0a0a]" : "bg-[#0a0a0a] text-[#f0f0f0]",
    aiBubble:   isDark ? "bg-[#141414] text-[#e0e0e0] border border-[#1f1f1f]" : "bg-[#f5f5f5] text-[#0a0a0a] border border-[#e5e5e5]",

    // 送出按鈕
    sendBtn:    isDark ? "bg-[#f0f0f0] text-[#0a0a0a] hover:bg-white" : "bg-[#0a0a0a] text-[#f0f0f0] hover:bg-[#222222]",

    // Placeholder
    placeholder: isDark ? "placeholder:text-[#444444]" : "placeholder:text-[#bbbbbb]",
  };

  return (
    <div className={`flex h-screen ${D.pageBg} font-sans ${D.textPrimary} transition-colors duration-300`}
      style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", letterSpacing: "0.01em" }}>

      {/* 左側：聊天室列表 */}
      <div className={`${isSidebarOpen ? 'w-60' : 'w-0'} overflow-hidden transition-all duration-300 border-r ${D.border} ${D.sidebarBg} flex flex-col`}>
        <div className={`px-5 py-4 border-b ${D.border} flex items-center justify-between`}>
          <span className={`text-[11px] font-semibold tracking-[0.15em] uppercase ${D.textMuted}`}>Conversations</span>
          <button onClick={handleNewChat} className={`p-1.5 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}>
            <SquarePen size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className={`text-[11px] ${D.textMuted} text-center mt-10 tracking-wider`}>NO CONVERSATIONS</p>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} onClick={() => handleSelectConversation(conv)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded cursor-pointer transition-colors ${
                  currentConversationId === conv.id ? D.activeItem : D.inactiveItem
                }`}>
                <span className="text-[13px] truncate tracking-wide">{conv.title}</span>
                <button onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 中間：對話區 */}
      <div className={`flex-1 flex flex-col h-full ${D.pageBg}`}>

        {/* Header — 極簡，無陰影 */}
        <header className={`h-14 border-b ${D.border} flex items-center justify-between px-6 ${D.headerBg} backdrop-blur-sm`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}>
              <MessageSquare size={16} />
            </button>
            <span className={`text-[13px] font-medium tracking-[0.08em] uppercase ${D.textMuted}`}>
              {currentConversationId
                ? (conversations.find(c => c.id === currentConversationId)?.title?.toUpperCase() || 'WORKSPACE')
                : 'WORKSPACE'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleDark}
              className={`p-2 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}
              title={isDark ? 'Light Mode' : 'Dark Mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 ${D.hoverBg} rounded transition-colors ${D.textMuted}`}>
              <Settings2 size={16} />
            </button>
          </div>
        </header>

        {/* 訊息區 */}
        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <div className={`text-[11px] tracking-[0.3em] uppercase ${D.textMuted}`}>DONDA</div>
              <div className={`w-px h-16 ${isDark ? 'bg-[#1f1f1f]' : 'bg-[#e5e5e5]'}`} />
              <p className={`text-[11px] tracking-[0.2em] uppercase ${D.textMuted}`}>Begin</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[78%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${D.border} ${D.cardBg}`}>
                    {m.role === 'user'
                      ? <User size={13} className={D.textMuted} />
                      : <Sparkles size={13} className={D.textMuted} />}
                  </div>
                  {/* 訊息泡泡 + 複製按鈕 */}
                  <div className={`relative group px-4 py-3 rounded text-[14px] leading-relaxed ${
                    m.role === 'user' ? D.userBubble : D.aiBubble
                  }`}>
                    {m.role === 'user' ? (
                      <p>{m.content}</p>
                    ) : (
                      <MessageContent content={m.content} isDark={isDark} />
                    )}
                    <CopyButton text={m.content} isDark={isDark} />
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`flex gap-3`}>
                <div className={`w-7 h-7 rounded flex items-center justify-center border ${D.border} ${D.cardBg}`}>
                  <Sparkles size={13} className={`${D.textMuted} animate-pulse`} />
                </div>
                <div className={`flex items-center gap-1.5 px-4 py-3 rounded ${D.aiBubble}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#555]' : 'bg-[#ccc]'} animate-bounce`} style={{ animationDelay: '0ms' }} />
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#555]' : 'bg-[#ccc]'} animate-bounce`} style={{ animationDelay: '150ms' }} />
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#555]' : 'bg-[#ccc]'} animate-bounce`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {/* 自動捲到底部的錨點 */}
          <div ref={messagesEndRef} />
        </main>

        {/* 輸入框 */}
        <footer className={`px-6 pb-6 pt-2 bg-gradient-to-t ${D.footerGrad} to-transparent`}>
          <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto relative flex items-center">
            <input
              className={`w-full py-3.5 pl-5 pr-12 rounded border ${D.border} ${D.inputBg} ${D.textInput} ${D.placeholder} text-[14px] tracking-wide focus:outline-none transition-all`}
              value={input}
              placeholder={currentConversationId ? "Message..." : "Start a new conversation..."}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}
              className={`absolute right-2 p-2 rounded transition-colors disabled:opacity-30 ${D.sendBtn}`}>
              <Send size={15} />
            </button>
          </form>
        </footer>
      </div>

      {/* 右側：設定面板 */}
      <div className={`${isSettingsOpen ? 'w-72' : 'w-0'} overflow-hidden transition-all duration-300 border-l ${D.border} ${D.sidebarBg} flex flex-col`}>
        <div className="p-6 space-y-6 overflow-y-auto">
          <h2 className={`text-[11px] font-semibold tracking-[0.15em] uppercase ${D.textMuted}`}>Settings</h2>

          <div className="space-y-2">
            <label className={`text-[11px] tracking-wider uppercase ${D.textMuted}`}>Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className={`w-full p-2.5 text-[13px] border rounded ${D.border} ${D.inputBg} ${D.textInput} focus:outline-none`}>
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
              <option value="qwen-qwq-32b">Qwen QwQ 32B</option>
              <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className={`text-[11px] tracking-wider uppercase ${D.textMuted}`}>System Prompt</label>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define the AI's behavior..."
              className={`w-full p-2.5 text-[13px] border rounded h-24 resize-none focus:outline-none ${D.border} ${D.inputBg} ${D.textInput} ${D.placeholder}`} />
          </div>

          {[
            { label: 'Temperature', value: temperature, setter: setTemperature, min: 0, max: 2, step: 0.1 },
            { label: 'Max Tokens', value: maxTokens, setter: setMaxTokens, min: 100, max: 4096, step: 100 },
            { label: 'Top P', value: topP, setter: setTopP, min: 0, max: 1, step: 0.05 },
            { label: 'Frequency Penalty', value: frequencyPenalty, setter: setFrequencyPenalty, min: 0, max: 2, step: 0.1 },
          ].map(({ label, value, setter, min, max, step }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className={`text-[11px] tracking-wider uppercase ${D.textMuted}`}>{label}</label>
                <span className={`text-[11px] font-mono ${D.textMuted}`}>{value}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => setter(parseFloat(e.target.value) as any)}
                className={`w-full accent-neutral-500`} />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}