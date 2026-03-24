"use client";

import { useChat } from "ai/react";
import { useState, useEffect } from "react";
import { Send, Settings2, User, Sparkles, SquarePen, MessageSquare, Trash2, Moon, Sun } from "lucide-react";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

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

  // 載入深夜模式設定
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") setIsDark(true);
  }, []);

  // 儲存深夜模式設定
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

  // 顏色 tokens
  const bg = isDark ? 'bg-neutral-900' : 'bg-neutral-50';
  const bgCard = isDark ? 'bg-neutral-800' : 'bg-white';
  const bgHeader = isDark ? 'bg-neutral-900/80' : 'bg-white/50';
  const border = isDark ? 'border-neutral-700' : 'border-neutral-200';
  const textPrimary = isDark ? 'text-neutral-100' : 'text-neutral-800';
  const textMuted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const hoverBg = isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-100';
  const inputBg = isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500' : 'bg-white border-neutral-200 text-neutral-800';
  const sidebarItemActive = isDark ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-100 text-neutral-800';
  const sidebarItemHover = isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-50 text-neutral-600';
  const userBubble = isDark ? 'bg-neutral-600 text-white' : 'bg-neutral-800 text-white';
  const aiBubble = isDark ? 'bg-neutral-700 border-neutral-600 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-700';

  return (
    <div className={`flex h-screen ${bg} font-sans ${textPrimary} transition-colors duration-300`}>

      {/* 左側：聊天室列表 */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden transition-all duration-300 ease-in-out border-r ${border} ${bgCard} flex flex-col`}>
        <div className={`p-4 border-b ${border} flex items-center justify-between`}>
          <span className={`text-sm font-semibold ${textMuted}`}>對話紀錄</span>
          <button onClick={handleNewChat} className={`p-1.5 ${hoverBg} rounded-md transition-colors ${textMuted}`} title="新對話">
            <SquarePen size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className={`text-xs ${textMuted} text-center mt-8`}>還沒有對話紀錄</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id ? sidebarItemActive : sidebarItemHover
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare size={14} className={`shrink-0 ${textMuted}`} />
                  <span className="text-sm truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 中間：對話區 */}
      <div className={`flex-1 flex flex-col h-full ${bg}`}>
        <header className={`h-16 border-b ${border} flex items-center justify-between px-6 ${bgHeader} backdrop-blur-sm`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 ${hoverBg} rounded-md transition-colors ${textMuted}`}>
              <MessageSquare size={20} />
            </button>
            <h1 className={`text-lg font-medium tracking-wide ${textPrimary}`}>
              {currentConversationId
                ? (conversations.find(c => c.id === currentConversationId)?.title || 'Workspace')
                : 'Workspace'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 深夜模式切換 */}
            <button
              onClick={toggleDark}
              className={`p-2 ${hoverBg} rounded-md transition-colors ${textMuted}`}
              title={isDark ? '切換日間模式' : '切換深夜模式'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 ${hoverBg} rounded-md transition-colors ${textMuted}`}>
              <Settings2 size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <Sparkles size={40} className={isDark ? 'text-neutral-600' : 'text-neutral-300'} strokeWidth={1.5} />
              <p className={`text-sm ${textMuted}`}>開始一段新的對話吧</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgCard} border ${border} shadow-sm`}>
                    {m.role === 'user'
                      ? <User size={16} className={textMuted} />
                      : <Sparkles size={16} className={isDark ? 'text-neutral-300' : 'text-neutral-700'} />}
                  </div>
                  <div className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm border ${
                    m.role === 'user' ? `${userBubble} rounded-tr-sm border-transparent` : `${aiBubble} rounded-tl-sm`
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgCard} border ${border} shadow-sm`}>
                <Sparkles size={16} className={`${textMuted} animate-pulse`} />
              </div>
            </div>
          )}
        </main>

        <footer className={`p-6 bg-gradient-to-t ${isDark ? 'from-neutral-900' : 'from-neutral-50'} to-transparent`}>
          <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto relative flex items-center">
            <input
              className={`w-full py-4 pl-6 pr-14 rounded-full border shadow-sm focus:outline-none focus:border-neutral-400 focus:shadow-md transition-all text-[15px] ${inputBg}`}
              value={input}
              placeholder={currentConversationId ? "輸入訊息..." : "輸入訊息，自動建立新對話..."}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-2 p-2.5 rounded-full transition-colors disabled:opacity-50 ${isDark ? 'bg-neutral-600 hover:bg-neutral-500 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
      </div>

      {/* 右側：設定面板 */}
      <div className={`${isSettingsOpen ? 'w-80' : 'w-0'} overflow-hidden transition-all duration-300 ease-in-out border-l ${border} ${bgCard} flex flex-col`}>
        <div className="p-6 space-y-6 overflow-y-auto">
          <h2 className={`text-sm font-semibold ${textMuted} tracking-wider`}>設定選項</h2>

          <div className="space-y-2">
            <label className={`text-xs font-medium ${textMuted}`}>模型 (Model)</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className={`w-full p-2 text-sm border rounded-md focus:outline-none ${inputBg}`}>
              <option value="llama-3.3-70b-versatile">Llama 3.3 (70B) - 聰明</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 (8B) - 快速</option>
              <option value="qwen-qwq-32b">Qwen QwQ 32B - 推理</option>
              <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B - 多模態</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-medium ${textMuted}`}>系統提示詞 (System Prompt)</label>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="例如：你是一個嚴格的程式導師..."
              className={`w-full p-2 text-sm border rounded-md h-28 resize-none focus:outline-none ${inputBg}`} />
          </div>

          {[
            { label: '溫度 (Temperature)', value: temperature, setter: setTemperature, min: 0, max: 2, step: 0.1, desc: '越高越有創造力，越低越精準' },
            { label: '最大長度 (Max Tokens)', value: maxTokens, setter: setMaxTokens, min: 100, max: 4096, step: 100, desc: '限制回答的最大 token 數' },
            { label: 'Top P', value: topP, setter: setTopP, min: 0, max: 1, step: 0.05, desc: '控制字彙多樣性' },
            { label: '重複懲罰 (Frequency Penalty)', value: frequencyPenalty, setter: setFrequencyPenalty, min: 0, max: 2, step: 0.1, desc: '越高越能避免 AI 重複說同樣的詞' },
          ].map(({ label, value, setter, min, max, step, desc }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between">
                <label className={`text-xs font-medium ${textMuted}`}>{label}</label>
                <span className={`text-xs ${textMuted}`}>{value}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => setter(parseFloat(e.target.value) as any)}
                className={`w-full ${isDark ? 'accent-neutral-400' : 'accent-neutral-500'}`} />
              <p className={`text-[10px] ${textMuted}`}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}