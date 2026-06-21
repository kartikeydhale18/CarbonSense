import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, Send, X, Loader, Leaf } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Hello! I am CarbonBot, your personal eco-assistant. Ask me anything about reducing your carbon footprint, recycling, or green energy!',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: 'System: VITE_GEMINI_API_KEY is missing. I cannot connect to Gemini right now, but try walking or biking to save carbon!',
            timestamp: new Date(),
          },
        ]);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
        You are CarbonBot, a helpful AI eco-assistant integrated into CarbonSense.
        Answer user questions specifically related to carbon footprints, environment, energy saving, recycling, and sustainable living.
        Keep answers short (under 3-4 sentences), encouraging, and highly practical.
      `;

      // Build chat history context from last few messages
      const historyContext = messages.slice(-5).map(m => `${m.sender === 'user' ? 'User' : 'CarbonBot'}: ${m.text}`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${historyContext}\nUser: ${inputText}`,
        config: {
          systemInstruction,
        }
      });

      const botText = response.text || 'I am sorry, I had trouble processing that request.';
      
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botText.trim(),
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Chatbot query error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Sorry, I encountered an issue connecting to my intelligence. Please try again in a bit!',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary-dark text-slate-900 p-4 rounded-full shadow-2xl transition duration-300 transform hover:scale-110 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/20"
          aria-label="Open Eco Chatbot"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="bg-slate-950 border border-slate-800 w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-lg animate-float">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Leaf className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-none">CarbonBot</h4>
                <span className="text-[10px] text-emerald-400 font-semibold">Active Assistant</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition cursor-pointer"
              aria-label="Close Chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={index}
                  className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isBot
                        ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                        : 'bg-primary text-slate-900 font-medium rounded-tr-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`block text-[8px] mt-1.5 text-right ${
                        isBot ? 'text-gray-500' : 'text-slate-800'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-none p-3 text-xs flex items-center space-x-2">
                  <Loader className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/50 flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask CarbonBot something..."
              className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Message text input"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="bg-primary hover:bg-primary-dark text-slate-900 p-2.5 rounded-xl transition cursor-pointer disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
export default Chatbot;
