import { useEffect, useRef, useState } from "react";
import { useIsMobileLayout } from "@/hooks/use-layout-mode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  Bot,
  User,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BrainCircuit,
  Zap,
  Settings,
  MessageSquare,
  PlusCircle,
  X,
  ThumbsUp,
  ThumbsDown
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
  const navigate = useNavigate();
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
    isLoadingHistory,
    healthScore,
    actionPlan,
    handleAction,
    submitFeedback
  } = useAI();

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormData, setProductFormData] = useState<any>(undefined);

  const [isPricingRuleFormOpen, setIsPricingRuleFormOpen] = useState(false);
  const [pricingRuleFormData, setPricingRuleFormData] = useState<any>(undefined);

  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState<any>(undefined);

  const [isStockAdjFormOpen, setIsStockAdjFormOpen] = useState(false);
  const [stockAdjFormData, setStockAdjFormData] = useState<any>(undefined);

  const [feedbackState, setFeedbackState] = useState<Record<string, 1 | -1>>({});

  // Intercept handleAction to check for modal triggers
  const onHandleAction = async (messageId: string, action: any, approved: boolean) => {
    if (approved) {
      if (action.type === 'OPEN_PRODUCT_FORM') {
        setProductFormData(action.payload);
        setIsProductFormOpen(true);
        handleAction(messageId, action, true);
        return;
      }

      if (action.type === 'OPEN_PRICING_RULE_FORM') {
        setPricingRuleFormData(action.payload);
        setIsPricingRuleFormOpen(true);
        handleAction(messageId, action, true);
        return;
      }

      if (action.type === 'OPEN_SUPPLIER_FORM') {
        setSupplierFormData(action.payload);
        setIsSupplierFormOpen(true);
        handleAction(messageId, action, true);
        return;
      }

      if (action.type === 'OPEN_STOCK_ADJUSTMENT_FORM') {
        setStockAdjFormData(action.payload);
        setIsStockAdjFormOpen(true);
        handleAction(messageId, action, true);
        return;
      }
    }

    handleAction(messageId, action, approved);
  };

  useEffect(() => {
    // Auto-scroll to bottom of chat
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background/50 backdrop-blur-sm overflow-hidden p-2 md:p-6 lg:p-8 animate-in fade-in duration-700">

      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-card/30 p-4 rounded-2xl border border-white/10 shadow-xl glass transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/20 text-primary shadow-inner">
            <BrainCircuit className="h-6 w-6 lg:h-8 lg:w-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl lg:text-3xl font-black bg-gradient-to-r from-primary via-purple-500 to-blue-600 bg-clip-text text-transparent">
              TunaBrain Intelligence
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground font-medium">Enterprise Neural Business Optimization</p>
          </div>
        </div>

        {healthScore && (
          <div className="flex items-center gap-6 px-6 py-2 rounded-2xl bg-background/40 border border-white/5 shadow-inner group transition-all hover:bg-background/60">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Business Health</p>
              <p className={`font-black text-sm lg:text-xl ${healthScore.status === 'Excellent' ? 'text-green-500' : 'text-blue-500'}`}>
                {healthScore.status.toUpperCase()}
              </p>
            </div>
            <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/20" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - healthScore.score / 100)}
                  className={`${healthScore.score > 80 ? 'text-green-500' : 'text-blue-500'} transition-all duration-1000`} />
              </svg>
              <span className="absolute font-black text-sm tracking-tighter">{healthScore.score}</span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex gap-6 min-h-0 relative">

        {/* Left Sidebar: Mobile Toggle & Desktop Fixed */}
        <aside className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed inset-y-0 left-0 z-50 w-80 bg-card/80 backdrop-blur-xl border-r border-white/10 p-4 transform transition-transform duration-300 ease-in-out
          lg:static lg:w-80 lg:bg-card/20 lg:p-0 lg:border-r-0 lg:rounded-3xl lg:flex lg:flex-col gap-6
        `}>

          {/* Action Plan Section */}
          <section className="flex flex-col gap-2 h-1/2 lg:h-auto lg:max-h-[50%] bg-purple-500/5 p-4 rounded-3xl border border-purple-500/10 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-purple-500 fill-purple-500/20" />
              <h2 className="text-sm font-black uppercase tracking-widest text-purple-400">Tactical Action Plan</h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-4">
                {actionPlan.map((action, idx) => (
                  <div key={idx} className="group flex items-start gap-3 p-3 rounded-2xl bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10 transition-all cursor-pointer">
                    <div className="mt-1 h-3 w-3 rounded-full border-2 border-purple-500 group-hover:bg-purple-500 transition-colors shrink-0" />
                    <p className="text-xs leading-relaxed font-medium text-muted-foreground group-hover:text-foreground">{action}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </section>

          {/* Session History Section */}
          <section className="flex-1 flex flex-col gap-2 min-h-0 bg-primary/5 p-4 rounded-3xl border border-primary/10 shadow-lg mt-4 lg:mt-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary fill-primary/20" />
                <h2 className="text-sm font-black uppercase tracking-widest text-primary">Neural Threads</h2>
              </div>
              <Button onClick={createNewSession} size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-primary/20 text-primary">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-3">
                {chatSessions.map((session) => (
                  <div key={session.id} onClick={() => { setCurrentSessionId(session.id); if (isMobileLayout) setIsSidebarOpen(false); }}
                    className={`
                      group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border
                      ${currentSessionId === session.id
                        ? 'bg-primary/20 border-primary/30 text-primary shadow-lg scale-[1.02]'
                        : 'bg-transparent border-transparent hover:bg-white/5 text-muted-foreground'
                      }
                    `}
                  >
                    <div className="h-8 w-8 rounded-xl bg-background/50 flex items-center justify-center shrink-0 border border-white/5 shadow-sm">
                      <Sparkles className={`h-4 w-4 ${currentSessionId === session.id ? 'text-primary animate-spin-slow' : 'opacity-40'}`} />
                    </div>
                    <span className="truncate flex-1 text-[11px] font-bold tracking-tight">{session.last_message || "Initialize Link..."}</span>
                    <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-lg transition-all">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </section>

          {/* Mobile Overlay Closer */}
          {isSidebarOpen && isMobileLayout && (
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 p-2 bg-muted rounded-full">
              <X className="h-6 w-6" />
            </button>
          )}
        </aside>

        {/* Main Chat Interface */}
        <section className="flex-1 flex flex-col min-w-0 bg-card/20 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden glass">

          {/* Chat Header */}
          <div className="p-4 md:p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsSidebarOpen(true)} className="lg:hidden" variant="ghost" size="icon">
                <Settings className="h-6 w-6" />
              </Button>
              <div className="relative">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg transform rotate-3">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-sm md:text-lg tracking-tight">System Core Hub</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-green-500/10 text-green-500 border-green-500/20 py-0">Online</Badge>
                  <span className="text-[10px] text-muted-foreground font-bold">Latency: 42ms</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-muted-foreground"><AlertTriangle className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-muted-foreground"><TrendingUp className="h-5 w-5" /></Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {isLoadingHistory && (
              <div className="absolute inset-0 bg-background/20 backdrop-blur-md z-20 flex items-center justify-center animate-in fade-in">
                <div className="p-8 rounded-[3rem] bg-card border border-white/10 shadow-2xl flex flex-col items-center gap-4">
                  <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-black text-primary animate-pulse">SYNCHRONIZING DATA...</p>
                </div>
              </div>
            )}

            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 md:p-8">
              <div className="space-y-8 max-w-4xl mx-auto pb-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-4 animate-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`
                      h-8 w-8 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xl border border-white/10 transform transition-transform hover:scale-110
                      ${msg.role === 'user' ? 'bg-muted/40 order-1' : 'bg-gradient-to-br from-primary/20 to-purple-500/20 order-[-1]'}
                    `}>
                      {msg.role === 'user' ? <User className="h-4 w-4 md:h-6 md:w-6" /> : <Bot className="h-4 w-4 md:h-6 md:w-6 text-primary" />}
                    </div>
                    <div className={`
                      group relative flex flex-col gap-2 max-w-[85%] md:max-w-[75%] px-4 py-3 md:px-6 md:py-4 rounded-[2rem] text-sm md:text-base shadow-lg transition-all
                      ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-blue-600 text-white rounded-tr-none'
                        : 'bg-card/40 backdrop-blur-md border border-white/10 rounded-tl-none hover:bg-card/60'
                      }
                    `}>
                      <div className={`prose-chat overflow-hidden ${msg.role === 'user' ? 'user-message' : ''}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* AI Enhanced Actions (Modals/Triggers) */}
                      {msg.action && msg.role === 'assistant' && (
                        <div className="mt-4 bg-background/50 backdrop-blur-md rounded-3xl p-4 border border-white/10 shadow-inner group/action animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-500">
                              <Zap className="h-5 w-5 fill-current" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-purple-500/70 tracking-tighter">System Proposal</p>
                              <p className="font-black text-sm md:text-base leading-tight">{msg.action.description}</p>
                            </div>
                          </div>

                          {msg.actionStatus === 'pending' && (
                            <div className="flex gap-3">
                              <Button onClick={() => onHandleAction(msg.id, msg.action, true)} className="flex-1 h-10 rounded-2xl bg-green-500 hover:bg-green-600 font-black shadow-lg shadow-green-500/20">
                                <CheckCircle className="h-4 w-4 mr-2" /> EXECUTE
                              </Button>
                              <Button onClick={() => onHandleAction(msg.id, msg.action, false)} variant="outline" className="flex-1 h-10 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/10 font-black">
                                <X className="h-4 w-4 mr-2" /> DISCARD
                              </Button>
                            </div>
                          )}

                          {msg.actionStatus === 'completed' && <div className="flex items-center justify-center gap-2 py-2 text-green-500 font-black text-sm bg-green-500/10 rounded-2xl border border-green-500/20">
                            <CheckCircle className="h-4 w-4" /> OPERATION SUCCESSFUL
                          </div>}

                          {msg.actionStatus === 'rejected' && <div className="flex items-center justify-center py-2 text-muted-foreground italic text-xs font-bold">Proposal discarded by operator</div>}
                        </div>
                      )}

                      {/* Feedback & Timestamp */}
                      <div className="flex items-center justify-between mt-2 opacity-15 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-black uppercase tracking-tighter">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.role === 'assistant' && msg.id !== 'init' && (
                          <div className="flex gap-1">
                            <button onClick={() => { if (!feedbackState[msg.id]) { setFeedbackState(v => ({ ...v, [msg.id]: 1 })); submitFeedback(msg.id, 1); } }} className={`p-1 hover:text-green-500 transition-colors ${feedbackState[msg.id] === 1 ? 'text-green-500' : ''}`}><ThumbsUp className="h-3 w-3" /></button>
                            <button onClick={() => { if (!feedbackState[msg.id]) { setFeedbackState(v => ({ ...v, [msg.id]: -1 })); submitFeedback(msg.id, -1); } }} className={`p-1 hover:text-red-500 transition-colors ${feedbackState[msg.id] === -1 ? 'text-red-500' : ''}`}><ThumbsDown className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-start gap-4 animate-in fade-in animate-pulse">
                    <div className="h-8 w-8 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                      <Bot className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-[2rem] rounded-tl-none px-6 py-4 flex gap-1 items-center shadow-lg">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Hub */}
            <div className="p-4 md:p-8 border-t border-white/5 bg-background/30 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3 items-end">
                  <div className="flex-1 relative group">
                    <Input
                      placeholder="Instruct System..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="h-14 md:h-16 rounded-[2rem] bg-card/50 border-white/10 focus-visible:ring-primary focus-visible:ring-offset-0 px-8 py-4 text-sm md:text-lg font-medium shadow-inner transition-all group-focus-within:bg-card group-hover:border-primary/30"
                      disabled={isTyping}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {input && <Button type="submit" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary hover:bg-primary/80 text-white shadow-xl transform transition-transform hover:scale-105 active:scale-95" disabled={isTyping}>
                        <Send className="h-5 w-5 md:h-6 md:w-6" />
                      </Button>}
                    </div>
                  </div>
                </form>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-2">
                  {["Analysis of this week's sales", "Draft a marketing email", "What should I restock?", "Predict next peak period"].map((suggestion) => (
                    <Badge key={suggestion} variant="outline" onClick={() => setInput(suggestion)}
                      className="cursor-pointer bg-white/5 hover:bg-primary hover:text-white border-white/10 rounded-xl px-4 py-2 transition-all whitespace-nowrap text-[10px] md:text-xs font-bold shadow-sm"
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Dynamic Forms (Invisible until triggered) */}
      <AIProductForm open={isProductFormOpen} onOpenChange={setIsProductFormOpen} initialData={productFormData} />
      <AIPricingRuleForm open={isPricingRuleFormOpen} onOpenChange={setIsPricingRuleFormOpen} initialData={pricingRuleFormData} />
      <AISupplierForm open={isSupplierFormOpen} onOpenChange={setIsSupplierFormOpen} initialData={supplierFormData} />
      <AIStockAdjustmentForm open={isStockAdjFormOpen} onOpenChange={setIsStockAdjFormOpen} initialData={stockAdjFormData} />
    </div>
  );
};

export default AIManager;