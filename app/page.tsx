"use client";

import { useChat } from "ai/react";
import { useState, useEffect } from "react";
import { Send, Settings2, User, Sparkles, SquarePen, MessageSquare, Trash2 } from "lucide-react";

// 聊天室的型別定義
type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

export default function Home() {
  // API 參數設定
  const [model, setModel] = useState("llama-3.1-8b-instant");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 聊天室狀態
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // useChat hook
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/chat",
    body: { model, systemPrompt, temperature, maxTokens, topP, frequencyPenalty },

    // 送出訊息後，把 user 訊息存進資料庫
    onFinish: async (message) => {
      if (!currentConversationId) return;
      // 存 assistant 回覆
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: message.content,
        }),
      });
    },
  });

  // 頁面載入時，取得所有聊天室
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    setConversations(data);
  };

  // 新增聊天室
  const handleNewChat = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新對話' }),
    });
    const newConversation = await res.json();
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    setMessages([]);
  };

  // 切換聊天室：從資料庫載入歷史訊息
  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    const res = await fetch(`/api/conversations/${conv.id}`);
    const data = await res.json();
    const msgs = Array.isArray(data) ? data : [];
    setMessages(msgs.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })));
  };

  // 刪除聊天室
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // 避免觸發 handleSelectConversation
    await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([]);
    }
  };

  // 送訊息時，先存 user 訊息，再建立對話（如果還沒有）
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    let convId = currentConversationId;

    // 如果還沒有聊天室，自動建一個（標題用第一句話）
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

    // 存 user 訊息進資料庫
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: convId,
        role: 'user',
        content: input,
      }),
    });

    // 更新聊天室標題（如果還是「新對話」）
    const currentConv = conversations.find(c => c.id === convId);
    if (currentConv?.title === '新對話') {
      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId, title: input.slice(0, 20) }),
      }).catch(() => {}); // PATCH 還沒實作也沒關係
    }

    handleSubmit(e);
  };

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-800">

      {/* 左側：聊天室列表 */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden transition-all duration-300 ease-in-out border-r border-neutral-200 bg-white flex flex-col`}>
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-500">對話紀錄</span>
          <button
            onClick={handleNewChat}
            className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500"
            title="新對話"
          >
            <SquarePen size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center mt-8">還沒有對話紀錄</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-neutral-100 text-neutral-800'
                    : 'hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare size={14} className="shrink-0 text-neutral-400" />
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

      {/* 中間：主對話區 */}
      <div className="flex-1 flex flex-col h-full bg-neutral-50">

        {/* Header */}
        <header className="h-16 border-b border-neutral-200 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500"
            >
              <MessageSquare size={20} />
            </button>
            <h1 className="text-lg font-medium tracking-wide">
              {currentConversationId
                ? (conversations.find(c => c.id === currentConversationId)?.title || 'Workspace')
                : 'Workspace'}
            </h1>
          </div>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500"
          >
            <Settings2 size={20} />
          </button>
        </header>

        {/* 對話區 */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-4">
              <Sparkles size={40} className="text-neutral-300" strokeWidth={1.5} />
              <p className="text-sm">開始一段新的對話吧</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white border border-neutral-200 shadow-sm">
                    {m.role === 'user'
                      ? <User size={16} className="text-neutral-500" />
                      : <Sparkles size={16} className="text-neutral-700" />}
                  </div>
                  <div className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-neutral-800 text-white rounded-tr-sm'
                      : 'bg-white border border-neutral-200 text-neutral-700 rounded-tl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-neutral-200 shadow-sm">
                <Sparkles size={16} className="text-neutral-400 animate-pulse" />
              </div>
            </div>
          )}
        </main>

        {/* 輸入框 */}
        <footer className="p-6 bg-gradient-to-t from-neutral-50 to-transparent">
          <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto relative flex items-center">
            <input
              className="w-full py-4 pl-6 pr-14 rounded-full bg-white border border-neutral-200 shadow-sm focus:outline-none focus:border-neutral-400 focus:shadow-md transition-all text-[15px]"
              value={input}
              placeholder={currentConversationId ? "輸入訊息..." : "輸入訊息，自動建立新對話..."}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2.5 bg-neutral-800 text-white rounded-full hover:bg-neutral-700 disabled:opacity-50 disabled:hover:bg-neutral-800 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
      </div>

      {/* 右側：設定面板 */}
      <div className={`${isSettingsOpen ? 'w-80' : 'w-0'} overflow-hidden transition-all duration-300 ease-in-out border-l border-neutral-200 bg-white flex flex-col`}>
        <div className="p-6 space-y-6 overflow-y-auto">
          <h2 className="text-sm font-semibold text-neutral-500 tracking-wider">設定選項</h2>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">模型 (Model)</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-400"
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 (70B) - 聰明</option>
<option value="llama-3.1-8b-instant">Llama 3.1 (8B) - 快速</option>
<option value="qwen-qwq-32b">Qwen QwQ 32B - 推理</option>
<option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B - 多模態</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">系統提示詞 (System Prompt)</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="例如：你是一個嚴格的程式導師..."
              className="w-full p-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md h-28 resize-none focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-neutral-400">溫度 (Temperature)</label>
              <span className="text-xs text-neutral-500">{temperature}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-neutral-500" />
            <p className="text-[10px] text-neutral-400">越高越有創造力，越低越精準</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-neutral-400">最大長度 (Max Tokens)</label>
              <span className="text-xs text-neutral-500">{maxTokens}</span>
            </div>
            <input type="range" min="100" max="4096" step="100" value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-neutral-500" />
            <p className="text-[10px] text-neutral-400">限制回答的最大 token 數</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-neutral-400">Top P</label>
              <span className="text-xs text-neutral-500">{topP}</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-neutral-500" />
            <p className="text-[10px] text-neutral-400">控制字彙多樣性</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-neutral-400">重複懲罰 (Frequency Penalty)</label>
              <span className="text-xs text-neutral-500">{frequencyPenalty}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" value={frequencyPenalty}
              onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
              className="w-full accent-neutral-500" />
            <p className="text-[10px] text-neutral-400">越高越能避免 AI 重複說同樣的詞</p>
          </div>
        </div>
      </div>

    </div>
  );
}