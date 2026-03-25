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
  Sparkles,
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
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-50 text-slate-800 overflow-hidden m-0 p-0 font-sans tracking-tight animate-in fade-in duration-300">
      
      {/* Sidebar: Chat History */}
      <aside className={`
        ${isSidebarOpen ? 'w-64 border-r border-zinc-200' : 'w-0 overflow-hidden border-0'} 
        flex flex-col bg-white transition-all duration-200 ease-in-out z-50
      `}>
        <div className="p-4 flex flex-col h-full gap-4">
          <Button 
            onClick={createNewSession}
            variant="outline"
            className="w-full justify-between hover:bg-zinc-100 hover:text-slate-900 border-zinc-200 shadow-sm rounded-xl py-6"
          >
            <span className="font-semibold">New Chat</span>
            <Plus className="h-4 w-4" />
          </Button>

          <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
            <p className="text-xs font-semibold text-zinc-500 mb-3 px-2">Recents</p>
            <div className="space-y-1">
              {chatSessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl text-sm cursor-pointer group transition-colors
                    ${currentSessionId === session.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-zinc-100 text-zinc-600'}
                  `}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{session.last_message || "Initialize..."}</span>
                  <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {healthScore && (
            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 shadow-sm mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500">System Health</span>
                <span className={`text-sm font-bold ${healthScore.score > 80 ? 'text-green-600' : 'text-blue-600'}`}>
                  {healthScore.score}%
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${healthScore.score}%` }} 
                  className={`h-full rounded-full transition-all duration-1000 ${healthScore.score > 80 ? 'bg-green-500' : 'bg-blue-500'}`}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-white items-center relative shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
        
        {/* Top Navigation */}
        <nav className="w-full flex items-center justify-between p-4 border-b border-zinc-100 bg-white/50 backdrop-blur-md z-10 absolute top-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="rounded-full hover:bg-zinc-100 text-zinc-500">
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Sparkles className="h-4 w-4 text-indigo-600" />
              </div>
              <h1 className="text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                TunaBrain
              </h1>
            </div>
          </div>
        </nav>

        {/* Chat Thread */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 w-full max-w-3xl overflow-y-auto px-4 pt-20">
          <div className="py-8 space-y-8">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-4 sm:gap-6 group animate-in slide-in-from-bottom-2 duration-300">
                
                {/* Avatar */}
                <div className={`mt-0.5 shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-2xl flex items-center justify-center shadow-sm 
                  ${msg.role === 'user' ? 'bg-zinc-100 text-zinc-600' : 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white'}`}
                >
                  {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>

                {/* Message Content */}
                <div className="flex-1 space-y-2 max-w-[calc(100%-3rem)]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-slate-700">{msg.role === 'user' ? 'You' : 'TunaBrain'}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <div className={`text-[15px] leading-relaxed prose prose-zinc max-w-none 
                    ${msg.role === 'user' ? 'bg-zinc-100/50 px-4 py-3 rounded-2xl rounded-tl-sm inline-block text-slate-800' : 'text-slate-700'}`}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Executable Actions */}
                  {msg.action && msg.role === 'assistant' && (
                    <div className="mt-4 border border-indigo-100 p-5 bg-indigo-50/50 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-bold text-indigo-900">Suggested Action: {msg.action.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm mb-5 text-indigo-800/80">{msg.action.description}</p>
                      
                      {msg.actionStatus === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => handleAction(msg.id, msg.action, true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6">
                            Approve & Execute
                          </Button>
                          <Button variant="outline" onClick={() => handleAction(msg.id, msg.action, false)} className="rounded-xl border-zinc-300 text-zinc-600 hover:bg-zinc-100">
                            Dismiss
                          </Button>
                        </div>
                      )}
                      
                      {msg.actionStatus === 'completed' && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                          <div className="h-2 w-2 rounded-full bg-green-500" /> Action Completed
                        </div>
                      )}
                      {msg.actionStatus === 'rejected' && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-500 rounded-lg text-xs font-semibold">
                          Dismissed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-4 sm:gap-6 animate-pulse">
                <div className="mt-0.5 h-8 w-8 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-tr from-indigo-500/50 to-purple-500/50 flex items-center justify-center text-white/80">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex gap-1.5 items-center h-8 px-4 bg-zinc-50 rounded-2xl rounded-tl-sm w-fit">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Bottom Padding */}
            <div className="h-4"></div>
          </div>
        </ScrollArea>

        {/* Input Form */}
        <div className="w-full max-w-3xl p-4 md:px-8 pb-6 md:pb-8 bg-gradient-to-t from-white via-white to-transparent z-10 pt-10">
          <div className="relative">
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }} 
              className="relative flex items-end border border-zinc-200 bg-white rounded-3xl p-1 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all overflow-hidden"
            >
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message TunaBrain..."
                className="flex-1 border-none focus-visible:ring-0 rounded-l-3xl min-h-[52px] h-auto py-3 px-5 text-base shadow-none bg-transparent"
                disabled={isTyping}
                autoComplete="off"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isTyping}
                className="h-10 w-10 mb-1.5 mr-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-all shrink-0"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </Button>
            </form>
          </div>
          
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {["Analyze Inventory", "Sales Trends", "Forecast Demand"].map(suggestion => (
              <button 
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="text-[11px] font-medium text-zinc-500 bg-zinc-50 hover:bg-indigo-50 hover:text-indigo-600 border border-zinc-200 rounded-full px-3 py-1 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

      </main>

      {/* Forms Integration */}
      <AIProductForm open={isProductFormOpen} onOpenChange={setIsProductFormOpen} initialData={productFormData} />
      <AIPricingRuleForm open={isPricingRuleFormOpen} onOpenChange={setIsPricingRuleFormOpen} initialData={pricingRuleFormData} />
      <AISupplierForm open={isSupplierFormOpen} onOpenChange={setIsSupplierFormOpen} initialData={supplierFormData} />
      <AIStockAdjustmentForm open={isStockAdjFormOpen} onOpenChange={setIsStockAdjFormOpen} initialData={stockAdjFormData} />

    </div>
  );
};

export default AIManager;