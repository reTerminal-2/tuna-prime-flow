import { useEffect, useRef, useState } from "react";
import { useIsMobileLayout } from "@/hooks/use-layout-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Menu, 
  X,
  Square,
  Activity
} from "lucide-react";
import { useAI } from "@/contexts/AIContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { AIProductForm } from "@/components/ai/AIProductForm";
import { AIPricingRuleForm } from "@/components/ai/AIPricingRuleForm";
import { AISupplierForm } from "@/components/ai/AISupplierForm";
import { AIStockAdjustmentForm } from "@/components/ai/AIStockAdjustmentForm";

const AIManager = () => {
  const isMobileLayout = useIsMobileLayout();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileLayout);

  const {
    messages,
    input,
    setInput,
    isTyping,
    sendMessage,
    chatSessions,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    deleteSession,
    healthScore,
    actionPlan,
    handleAction
  } = useAI();

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormData, setProductFormData] = useState<any>(undefined);
  const [isPricingRuleFormOpen, setIsPricingRuleFormOpen] = useState(false);
  const [pricingRuleFormData, setPricingRuleFormData] = useState<any>(undefined);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState<any>(undefined);
  const [isStockAdjFormOpen, setIsStockAdjFormOpen] = useState(false);
  const [stockAdjFormData, setStockAdjFormData] = useState<any>(undefined);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white text-black overflow-hidden m-0 p-0 font-mono tracking-tight animate-in fade-in duration-300">
      
      {/* Sidebar: Chat History - NO ROUNDED CORNERS */}
      <aside className={`
        ${isSidebarOpen ? 'w-64 border-r' : 'w-0 overflow-hidden border-0'} 
        flex flex-col bg-zinc-50 transition-all duration-200 ease-in-out border-zinc-200 z-50
      `}>
        <div className="p-4 flex flex-col h-full gap-4">
          <button 
            onClick={createNewSession}
            className="w-full flex items-center justify-between p-3 border border-black hover:bg-black hover:text-white transition-colors group rounded-none"
          >
            <span className="text-xs font-bold uppercase tracking-widest">New Session</span>
            <Plus className="h-4 w-4" />
          </button>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <p className="text-[10px] font-black uppercase text-zinc-400 mb-3 tracking-tighter">History</p>
            <div className="space-y-1">
              {chatSessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`
                    flex items-center gap-3 p-2 text-xs cursor-pointer group border-b border-transparent
                    ${currentSessionId === session.id ? 'bg-zinc-200 font-bold border-black' : 'hover:bg-zinc-100'}
                  `}
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1 uppercase tracking-tight">{session.last_message || "Initialize..."}</span>
                  <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {healthScore && (
            <div className="p-4 border border-black bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest">System Health</span>
                <span className="text-xs font-bold">{healthScore.score}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-100 border border-zinc-200 overflow-hidden">
                <div style={{ width: `${healthScore.score}%` }} className="h-full bg-black transition-all duration-1000" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container - Sharp Edges */}
      <main className="flex-1 flex flex-col min-w-0 bg-white items-center relative">
        
        {/* Top Navigation */}
        <nav className="w-full flex items-center justify-between p-4 border-b border-zinc-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-zinc-100">
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 fill-black" />
              <h1 className="text-sm font-black uppercase tracking-widest">TunaBrain v4.0.0</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500" />
            <span className="text-[10px] font-bold uppercase">Connection: Solid</span>
          </div>
        </nav>

        {/* Chat Thread */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 w-full max-w-3xl overflow-y-auto px-4">
          <div className="py-8 space-y-12">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-6 group animate-in slide-in-from-bottom-2 duration-300">
                <div className={`mt-1 shrink-0 h-8 w-8 flex items-center justify-center border ${msg.role === 'user' ? 'bg-zinc-100 border-zinc-200' : 'bg-black border-black text-white'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest">{msg.role === 'user' ? 'Operator' : 'AI Core'}</span>
                    <span className="text-[10px] text-zinc-400">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <div className="text-sm leading-relaxed prose prose-zinc max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Actions Area */}
                  {msg.action && msg.role === 'assistant' && (
                    <div className="mt-6 border p-4 bg-zinc-50 border-zinc-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-4 w-4 text-black" />
                        <span className="text-xs font-black uppercase tracking-widest">Execute Protocol: {msg.action.type}</span>
                      </div>
                      <p className="text-xs mb-4 text-zinc-600 font-medium italic">"{msg.action.description}"</p>
                      {msg.actionStatus === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(msg.id, msg.action, true)} className="px-6 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">Confirm Execution</button>
                          <button onClick={() => handleAction(msg.id, msg.action, false)} className="px-6 py-2 border border-zinc-300 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors">Abort</button>
                        </div>
                      )}
                      {msg.actionStatus === 'completed' && <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2"><Square className="h-2 w-2 fill-green-600" /> Success: Task Synced</span>}
                      {msg.actionStatus === 'rejected' && <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2"><Square className="h-2 w-2 fill-red-600" /> Aborted by User</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-6 animate-pulse">
                <div className="mt-1 h-8 w-8 bg-black flex items-center justify-center text-white"><Bot className="h-4 w-4" /></div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Core</span>
                  <div className="flex gap-1 h-4 items-center">
                    <div className="h-1 w-1 bg-black animate-bounce" />
                    <div className="h-1 w-1 bg-black animate-bounce [animation-delay:0.2s]" />
                    <div className="h-1 w-1 bg-black animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Bar - Standard ChatGPT positioning but SHARP */}
        <div className="w-full max-w-3xl p-4 md:p-8 bg-white z-10">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }} 
            className="relative flex items-center border border-black p-1 group focus-within:ring-2 focus-within:ring-black transition-all"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send instruction..."
              className="flex-1 border-none focus-visible:ring-0 rounded-none h-12 text-sm md:text-base px-4 font-medium"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              className="p-3 bg-black text-white hover:bg-zinc-800 disabled:opacity-30 transition-all flex items-center justify-center"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Analyze Inventory", "Sales Trends", "Supplier Summary", "Forecast"].map(suggestion => (
              <button 
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-zinc-200 hover:border-black hover:bg-zinc-50 transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[9px] text-zinc-400 text-center uppercase tracking-[0.2em] font-black">
            End-To-End Neural Link Active • Encryption Layer 4 Verified
          </p>
        </div>

      </main>

      {/* Legacy Forms Integration */}
      <AIProductForm open={isProductFormOpen} onOpenChange={setIsProductFormOpen} initialData={productFormData} />
      <AIPricingRuleForm open={isPricingRuleFormOpen} onOpenChange={setIsPricingRuleFormOpen} initialData={pricingRuleFormData} />
      <AISupplierForm open={isSupplierFormOpen} onOpenChange={setIsSupplierFormOpen} initialData={supplierFormData} />
      <AIStockAdjustmentForm open={isStockAdjFormOpen} onOpenChange={setIsStockAdjFormOpen} initialData={stockAdjFormData} />

    </div>
  );
};

export default AIManager;