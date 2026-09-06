import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, Trash2, ChevronDown, RefreshCw, MessageSquare } from 'lucide-react';

export function AIChatModal({ transactionsCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello! I am your **Gemini AI Financial Assistant**. I have real-time access to your ledger of **${transactionsCount.toLocaleString()} transactions**, accounts, assets, and categories.\n\nAsk me anything about your finances!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.response || 'Sorry, I could not process your query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Connection Error**: Failed to get AI response. Please check your server log or backend connectivity.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    handleSend(promptText);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: `Chat history cleared. Ask me another question about your financial data!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickPrompts = [
    "What was my total spending in 2025?",
    "How much did I spend at Costco?",
    "Show breakdown by account",
    "What are my top expense categories?"
  ];

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, #6558D3 0%, #8B5CF6 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 8px 24px rgba(101, 88, 211, 0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          outline: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Ledgerly Gemini AI Assistant"
      >
        {isOpen ? <X size={26} /> : <Sparkles size={26} />}
      </button>

      {/* Floating Chat Modal Popup */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '400px',
            maxWidth: 'calc(100vw - 32px)',
            height: '580px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'fadeInUp 0.25s ease-out'
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6558D3 0%, #8B5CF6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(101, 88, 211, 0.4)'
                }}
              >
                <Sparkles size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Gemini AI Assistant
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Real-time access to {transactionsCount.toLocaleString()} transactions
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleClearChat}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                title="Minimize Chat"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Banner */}
          {messages.length <= 2 && (
            <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Suggested Financial Queries
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(qp)}
                    style={{
                      fontSize: '12px',
                      padding: '5px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '14px',
                      color: '#CBD5E1',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F3FF';
                      e.currentTarget.style.borderColor = '#6558D3';
                      e.currentTarget.style.color = '#6558D3';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message List */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#F8FAFC'
            }}
          >
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    gap: '8px'
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#6558D3',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '12px',
                        marginTop: '2px'
                      }}
                    >
                      <Bot size={16} />
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '12px 14px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      backgroundColor: isUser ? '#6558D3' : '#FFFFFF',
                      color: isUser ? '#FFFFFF' : '#0F172A',
                      boxShadow: isUser ? '0 2px 8px rgba(101, 88, 211, 0.25)' : '0 2px 6px rgba(0,0,0,0.05)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      border: isUser ? 'none' : '1px solid #E2E8F0'
                    }}
                  >
                    {m.text}
                    <div
                      style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        textAlign: 'right',
                        opacity: 0.7,
                        color: isUser ? '#E0E7FF' : '#94A3B8'
                      }}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '13px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#6558D3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={14} className="spin" />
                </div>
                <span>Gemini is querying your ledger data...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '12px 16px',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Ask Gemini about your transactions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: input.trim() && !loading ? '#6558D3' : '#CBD5E1',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
