import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Send, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { AIMessage } from '@/types';

interface ChatState {
  conversationId: string | null;
  messages: AIMessage[];
}

export function AIChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<ChatState>({ conversationId: null, messages: [] });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Only show for USER role
  if (!isAuthenticated || user?.role !== 'USER') return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && chat.messages.length === 0) loadConversation();
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const loadConversation = async () => {
    try {
      const res = await api.get('/ai/conversation');
      if (res.data.success && res.data.data) {
        setChat({
          conversationId: res.data.data.id,
          messages: res.data.data.messages || [],
        });
      }
    } catch { /* silent */ }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setChat(prev => ({ ...prev, messages: [...prev.messages, userMsg] }));
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        conversationId: chat.conversationId,
      });

      if (res.data.success && res.data.data) {
        const aiMsg: AIMessage = {
          id: Date.now().toString() + '-ai',
          role: 'ASSISTANT',
          content: res.data.data.message,
          createdAt: new Date().toISOString(),
        };
        setChat(prev => ({
          conversationId: res.data.data.conversationId,
          messages: [...prev.messages, aiMsg],
        }));
      }
    } catch {
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    if (!chat.conversationId) return;
    try {
      await api.delete(`/ai/conversation/${chat.conversationId}`);
      setChat({ conversationId: null, messages: [] });
    } catch { /* silent */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-4 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-200 ${isMinimized ? 'h-14' : 'h-[500px]'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border rounded-t-2xl bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">AI Coach</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearConversation} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-700 transition" title="Clear conversation">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsMinimized(m => !m)} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-700 transition">
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-700 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {chat.messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">Ask me anything about your workouts, nutrition, or fitness goals!</p>
                    <div className="mt-4 space-y-2">
                      {["What workout do I have today?", "What should I eat after training?", "How much protein do I need?"].map(q => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); }}
                          className="block w-full text-left text-xs px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chat.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'USER'
                          ? 'bg-accent text-white rounded-br-sm'
                          : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask your AI coach..."
                    rows={1}
                    className="flex-1 px-3 py-2.5 bg-zinc-800 border border-border rounded-xl text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ maxHeight: '80px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="p-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl transition flex-shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-600 mt-1.5 text-center">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setIsOpen(o => !o); setIsMinimized(false); }}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}
