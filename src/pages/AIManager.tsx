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
  Activity,
  KeyRound,
  CheckCircle2
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
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#f8f9fa] text-[#202124] overflow-hidden m-0 p-0 font-sans tracking-tight animate-in fade-in duration-300">
      
      {/* Sidebar: Chat History */}
      <aside className={`
        ${isSidebarOpen ? 'w-72 border-r bg-[#f0f4f8]/50 border-[#e1e5ea]' : 'w-0 overflow-hidden border-0'} 
        flex flex-col transition-all duration-300 ease-in-out z-50 backdrop-blur-xl
      `}>
        <div className="p-4 flex flex-col h-full gap-5">
          <Button 
            onClick={createNewSession}
            className="w-full justify-start gap-3 bg-white hover:bg-white/60 text-[#1a73e8] border border-[#e1e5ea] shadow-sm rounded-2xl py-6 hover:shadow-md transition-all font-medium text-[15px]"
          >
            <Plus className="h-5 w-5" />
            New Thread
          </Button>

          <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
            <p className="text-[11px] font-bold text-[#5f6368] mb-3 px-3 uppercase tracking-wider">Recent Activity</p>
            <div className="space-y-1">
              {chatSessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-2xl text-[14px] cursor-pointer group transition-all
                    ${currentSessionId === session.id ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold' : 'hover:bg-[#e8eaed] text-[#3c4043] font-medium'}
                  `}
                >
                  <MessageSquare className={`h-4 w-4 shrink-0 ${currentSessionId === session.id ? 'text-[#1967d2]' : 'text-[#80868b]'}`} />
                  <span className="truncate flex-1 tracking-tight">{session.last_message || "TunaBrain Thread..."}</span>
                  <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#fce8e6] hover:text-[#d93025] rounded-lg transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {healthScore && (
            <div className="p-5 rounded-3xl bg-white border border-[#e1e5ea] shadow-sm mt-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-[#5f6368] uppercase tracking-wider">System Health</span>
                <span className={`text-[15px] font-black ${healthScore.score > 80 ? 'text-[#1e8e3e]' : 'text-[#f29900]'}`}>
                  {healthScore.score}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-[#f1f3f4] rounded-full overflow-hidden">
                <div 
                  style={{ width: `${healthScore.score}%` }} 
                  className={`h-full rounded-full transition-all duration-1000 ${healthScore.score > 80 ? 'bg-gradient-to-r from-[#1e8e3e] to-[#34a853]' : 'bg-gradient-to-r from-[#f29900] to-[#fbbc05]'}`}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-white items-center relative">
        
        {/* Top Navigation */}
        <nav className="w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-2xl z-20 absolute top-0 border-b border-[#f1f3f4]">
          <div className="flex items-center gap-4 py-1">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="rounded-full hover:bg-[#f1f3f4] text-[#5f6368] h-11 w-11">
              {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-[#1a73e8] to-[#8ab4f8] rounded-xl shadow-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-[18px] font-bold tracking-tight text-[#202124]">
                TunaBrain <span className="text-[#1a73e8] font-black">Gemini</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[#e8f0fe] py-1.5 px-3 rounded-full border border-[#d2e3fc]">
             <div className="h-2 w-2 rounded-full bg-[#1e8e3e]" />
             <span className="text-[11px] font-bold text-[#1967d2] uppercase tracking-wider hidden sm:block">Gemini 2.5 Flash</span>
          </div>
        </nav>

        {/* Chat Interface */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 w-full max-w-4xl overflow-y-auto px-4 sm:px-8 pt-24 pb-4">
            <div className="py-6 space-y-10 min-h-full">
              {messages.length === 1 && messages[0].id === 'init' && (
                 <div className="flex flex-col items-center justify-center mt-20 mb-32 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-tr from-[#1a73e8] via-[#8ab4f8] to-[#ceead6] p-1 mb-6 shadow-2xl shadow-blue-500/10">
                       <div className="h-full w-full bg-white rounded-[1.8rem] flex items-center justify-center">
                          <Sparkles className="h-10 w-10 text-[#1a73e8]" />
                       </div>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-[#202124] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#202124] to-[#5f6368]">
                       How can I help you today?
                    </h2>
                 </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 sm:gap-6 group animate-in slide-in-from-bottom-3 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  
                  {/* Avatar */}
                  <div className={`mt-0.5 shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shadow-sm 
                    ${msg.role === 'user' ? 'bg-[#f1f3f4] text-[#5f6368]' : 'bg-gradient-to-tr from-[#1a73e8] to-[#8ab4f8] text-white'}`}
                  >
                    {msg.role === 'user' ? <User className="h-5 w-5" /> : <Sparkles className="h-6 w-6" />}
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 space-y-3 ${msg.role === 'user' ? 'flex flex-col items-end max-w-[85%]' : 'max-w-[calc(100%-4rem)]'}`}>
                    <div className={`text-[16px] leading-[1.7] prose prose-zinc max-w-none 
                      ${msg.role === 'user' ? 'bg-[#f1f3f4] px-6 py-4 rounded-[2rem] rounded-tr-sm inline-block text-[#202124]' : 'text-[#3c4043]'}`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Executable Actions */}
                    {msg.action && msg.role === 'assistant' && (
                      <div className="mt-5 border border-[#ceead6] p-6 bg-[#f6fbf7] rounded-3xl shadow-sm max-w-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-[#e6f4ea] rounded-full">
                             <Activity className="h-5 w-5 text-[#1e8e3e]" />
                          </div>
                          <span className="text-[15px] font-bold text-[#0d652d]">System Proposal</span>
                        </div>
                        <p className="text-[16px] mb-6 text-[#137333] font-medium">{msg.action.description}</p>
                        
                        {msg.actionStatus === 'pending' && (
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={() => handleAction(msg.id, msg.action, true)} className="bg-[#1e8e3e] hover:bg-[#137333] text-white rounded-2xl px-8 h-12 shadow-md shadow-green-500/20 text-[15px] font-bold">
                              Execute Action
                            </Button>
                            <Button variant="outline" onClick={() => handleAction(msg.id, msg.action, false)} className="rounded-2xl border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] h-12 px-6 text-[15px] font-semibold">
                              Dismiss
                            </Button>
                          </div>
                        )}
                        
                        {msg.actionStatus === 'completed' && (
                          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#e6f4ea] text-[#137333] rounded-xl text-[14px] font-bold">
                            <CheckCircle2 className="h-5 w-5" /> Operation Verified
                          </div>
                        )}
                        {msg.actionStatus === 'rejected' && (
                          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#f1f3f4] text-[#5f6368] rounded-xl text-[14px] font-semibold">
                            Proposal Ignored
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-4 sm:gap-6 animate-pulse mt-4">
                  <div className="mt-0.5 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-tr from-[#1a73e8]/30 to-[#8ab4f8]/30 flex items-center justify-center text-white/80">
                    <Sparkles className="h-5 w-5 text-[#1a73e8]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex gap-2 items-center h-10 px-5 bg-white border border-[#f1f3f4] rounded-[2rem] rounded-tl-sm w-fit shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-[#8ab4f8] animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-[#8ab4f8] animate-bounce [animation-delay:0.2s]" />
                      <div className="h-2 w-2 rounded-full bg-[#8ab4f8] animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="h-10"></div>
            </div>
          </ScrollArea>
        {/* Input Form Floating - Gemini Style */}
        <div className="w-full max-w-4xl p-4 sm:px-8 absolute bottom-0 z-30 bg-gradient-to-t from-white via-white/95 to-transparent pt-12 pb-6">
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }} 
              className="relative flex items-center bg-[#f1f3f4] rounded-[2rem] p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#1a73e8]/30 focus-within:bg-white focus-within:shadow-md transition-all duration-300 border border-transparent focus-within:border-[#e8f0fe] overflow-hidden"
            >
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask TunaBrain anything..."
                className="flex-1 border-none focus-visible:ring-0 rounded-l-[2rem] min-h-[56px] py-4 px-6 text-[16px] shadow-none bg-transparent placeholder:text-[#80868b] font-medium"
                disabled={isTyping}
                autoComplete="off"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isTyping}
                className="h-12 w-12 mr-1 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:opacity-40 disabled:bg-[#dadce0] transition-colors shrink-0 shadow-sm"
              >
                <Send className="h-5 w-5 ml-0.5" />
              </Button>
            </form>
            <p className="mt-3.5 text-[11px] text-[#80868b] text-center font-medium tracking-wide">
              Gemini may produce inaccurate information about people, places, or facts.
            </p>
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